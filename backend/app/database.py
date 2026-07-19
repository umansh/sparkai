import sqlite3
import json
import csv
import os
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from app.core.engine import KnowledgeTracingEngine, SKILL_HIERARCHY
from app.schemas import EstimateSnapshot, RecommendationDetail, SubmissionResult

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "students.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db(seed_from_csv: bool = True):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Table for raw responses
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS responses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            submission_id TEXT UNIQUE,
            student_id TEXT NOT NULL,
            skill_id TEXT NOT NULL,
            correct INTEGER NOT NULL,
            timestamp TEXT,
            response_time_ms INTEGER NOT NULL,
            is_duplicate BOOLEAN DEFAULT 0
        )
    """)
    
    # Table for latest estimate snapshot per student per skill
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS estimates (
            student_id TEXT NOT NULL,
            skill_id TEXT NOT NULL,
            p_mastery REAL NOT NULL,
            cognitive_status TEXT NOT NULL,
            total_attempts INTEGER NOT NULL,
            consecutive_correct INTEGER NOT NULL,
            consecutive_quick_guesses INTEGER NOT NULL,
            recommended_action TEXT NOT NULL,
            recommended_next_skill TEXT,
            last_updated TEXT,
            PRIMARY KEY (student_id, skill_id)
        )
    """)
    
    conn.commit()
    
    # Check if estimates table is empty; if so, seed from data/student_responses.csv if available
    cursor.execute("SELECT COUNT(*) as count FROM estimates")
    row = cursor.fetchone()
    if row["count"] == 0 and seed_from_csv:
        csv_path = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data", "student_responses.csv"))
        if os.path.exists(csv_path):
            print(f"Seeding SQLite database from {csv_path}...")
            with open(csv_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for csv_row in reader:
                    sub_id = csv_row["submission_id"]
                    s_id = csv_row["student_id"]
                    sk_id = csv_row["skill_id"]
                    correct = int(csv_row["correct"])
                    ts = csv_row["timestamp"]
                    resp_ms = int(csv_row["response_time_ms"])
                    
                    # Process via engine
                    process_submission_db(
                        conn=conn,
                        submission_id=sub_id,
                        student_id=s_id,
                        skill_id=sk_id,
                        correct=correct,
                        response_time_ms=resp_ms,
                        timestamp=ts
                    )
            print("Database seeded successfully.")
    conn.close()

def get_snapshot(conn: sqlite3.Connection, student_id: str, skill_id: str) -> Optional[EstimateSnapshot]:
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM estimates WHERE student_id = ? AND skill_id = ?", (student_id, skill_id))
    row = cursor.fetchone()
    if not row:
        return None
    return EstimateSnapshot(
        student_id=row["student_id"],
        skill_id=row["skill_id"],
        p_mastery=row["p_mastery"],
        cognitive_status=row["cognitive_status"],
        total_attempts=row["total_attempts"],
        consecutive_correct=row["consecutive_correct"],
        consecutive_quick_guesses=row["consecutive_quick_guesses"],
        recommended_action=row["recommended_action"],
        recommended_next_skill=row["recommended_next_skill"],
        last_updated=row["last_updated"]
    )

def save_snapshot(conn: sqlite3.Connection, snapshot: EstimateSnapshot):
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO estimates (
            student_id, skill_id, p_mastery, cognitive_status,
            total_attempts, consecutive_correct, consecutive_quick_guesses,
            recommended_action, recommended_next_skill, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        snapshot.student_id, snapshot.skill_id, snapshot.p_mastery, snapshot.cognitive_status,
        snapshot.total_attempts, snapshot.consecutive_correct, snapshot.consecutive_quick_guesses,
        snapshot.recommended_action, snapshot.recommended_next_skill, snapshot.last_updated
    ))
    conn.commit()

def process_submission_db(
    conn: sqlite3.Connection,
    submission_id: Optional[str],
    student_id: str,
    skill_id: str,
    correct: int,
    response_time_ms: int,
    timestamp: Optional[str] = None,
    hint_used: Optional[bool] = False,
    item_difficulty_b: Optional[float] = None,
    q_matrix_weights: Optional[Dict[str, float]] = None
) -> SubmissionResult:
    cursor = conn.cursor()
    
    # Idempotency / Duplicate verification
    if submission_id:
        cursor.execute("SELECT * FROM responses WHERE submission_id = ?", (submission_id,))
        existing = cursor.fetchone()
        if existing:
            # Duplicate submission detected! Return current snapshot without updating estimate
            snapshot = get_snapshot(conn, student_id, skill_id)
            if not snapshot:
                # Fallback if somehow not in estimates table
                snapshot, rec = KnowledgeTracingEngine.update_mastery(None, student_id, skill_id, correct, response_time_ms, timestamp, conn=conn, hint_used=hint_used, item_difficulty_b=item_difficulty_b, q_matrix_weights=q_matrix_weights)
            else:
                _, rec = KnowledgeTracingEngine.update_mastery(snapshot, student_id, skill_id, correct, response_time_ms, timestamp, conn=conn, hint_used=hint_used, item_difficulty_b=item_difficulty_b, q_matrix_weights=q_matrix_weights)
                # We do not save new state since it was a duplicate
            return SubmissionResult(
                submission_id=submission_id,
                student_id=student_id,
                skill_id=skill_id,
                is_duplicate=True,
                updated_estimate=snapshot,
                next_recommendation=rec
            )
            
    # If Q-matrix compound skill weights are provided, update each secondary sub-skill proportionally
    if q_matrix_weights and isinstance(q_matrix_weights, dict):
        for sub_sk, weight in q_matrix_weights.items():
            if sub_sk != skill_id and weight > 0:
                sub_snap = get_snapshot(conn, student_id, sub_sk)
                new_sub_snap, _ = KnowledgeTracingEngine.update_mastery(
                    current_snapshot=sub_snap,
                    student_id=student_id,
                    skill_id=sub_sk,
                    correct=correct,
                    response_time_ms=response_time_ms,
                    timestamp=timestamp,
                    conn=conn,
                    hint_used=hint_used,
                    item_difficulty_b=item_difficulty_b,
                    q_weight=weight
                )
                save_snapshot(conn, new_sub_snap)

    # Fetch current snapshot for primary target skill
    current_snapshot = get_snapshot(conn, student_id, skill_id)
    new_snapshot, rec = KnowledgeTracingEngine.update_mastery(
        current_snapshot=current_snapshot,
        student_id=student_id,
        skill_id=skill_id,
        correct=correct,
        response_time_ms=response_time_ms,
        timestamp=timestamp,
        conn=conn,
        hint_used=hint_used,
        item_difficulty_b=item_difficulty_b,
        q_matrix_weights=q_matrix_weights
    )
    
    # Save raw response
    ts = timestamp if timestamp else datetime.now(timezone.utc).isoformat()
    try:
        cursor.execute("""
            INSERT INTO responses (submission_id, student_id, skill_id, correct, timestamp, response_time_ms, is_duplicate)
            VALUES (?, ?, ?, ?, ?, ?, 0)
        """, (submission_id, student_id, skill_id, correct, ts, response_time_ms))
    except sqlite3.IntegrityError:
        pass
        
    save_snapshot(conn, new_snapshot)
    
    return SubmissionResult(
        submission_id=submission_id or str(datetime.now(timezone.utc).timestamp()),
        student_id=student_id,
        skill_id=skill_id,
        is_duplicate=False,
        updated_estimate=new_snapshot,
        next_recommendation=rec
    )
