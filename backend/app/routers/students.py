from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import math
from app.schemas import (
    EstimateSnapshot, StudentProfileSnapshot,
    ClassHistogramItem, ClassHistogramResponse
)
from app.database import get_db_connection, init_db
from app.core.engine import SKILL_HIERARCHY

router = APIRouter(tags=["Students & Skills"])

def apply_forgetting_curve_to_snapshot(snap: EstimateSnapshot) -> EstimateSnapshot:
    """
    Applies Ebbinghaus forgetting curve decay at query time: P(L_t)_decayed = P(L_t) * exp(-lambda * delta_t_days)
    If days_since_practice > 14 and p_mastery >= 0.70, triggers spaced repetition review recommendation.
    """
    if not snap.last_updated or snap.last_updated == "N/A":
        snap.days_since_practice = 0.0
        snap.decay_applied = False
        return snap
        
    try:
        # Parse ISO timestamp
        ts = datetime.fromisoformat(snap.last_updated.replace("Z", "+00:00"))
        now = datetime.now(timezone.utc)
        delta_seconds = (now - ts).total_seconds()
        days = max(0.0, round(delta_seconds / 86400.0, 2))
    except Exception:
        snap.days_since_practice = 0.0
        snap.decay_applied = False
        return snap
        
    snap.days_since_practice = days
    # Apply decay if more than 1 day elapsed (lambda = 0.015 per day)
    if days >= 1.0:
        original_p = snap.p_mastery
        decay_factor = math.exp(-0.015 * days)
        p_decayed = max(0.01, min(0.99, round(snap.p_mastery * decay_factor, 4)))
        snap.p_mastery = p_decayed
        snap.decay_applied = True
        
        # Spaced repetition trigger: If > 14 days and originally mastered or high mastery
        if days > 14.0 and (original_p >= 0.70 or snap.recommended_action == "advance"):
            snap.recommended_action = "practice"
            snap.recommended_next_skill = snap.skill_id
            snap.cognitive_status = "improving"
    else:
        snap.decay_applied = False
        
    return snap

@router.get("/student/{student_id}/estimate", response_model=StudentProfileSnapshot)
def get_student_estimate(student_id: str):
    """
    Get current per-skill estimate snapshot for a student, along with overall status.
    Includes Ebbinghaus query-time memory decay and spaced repetition checks.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM estimates WHERE student_id = ?", (student_id,))
        rows = cursor.fetchall()
        
        if not rows:
            # If student has no attempts yet, return default baseline snapshot across all skills
            skills_dict = {}
            for sk in SKILL_HIERARCHY:
                sk_id = sk["skill_id"]
                snap = EstimateSnapshot(
                    student_id=student_id,
                    skill_id=sk_id,
                    p_mastery=0.15,
                    cognitive_status="learning",
                    total_attempts=0,
                    consecutive_correct=0,
                    consecutive_quick_guesses=0,
                    recommended_action="practice",
                    recommended_next_skill=sk_id,
                    last_updated="N/A",
                    days_since_practice=0.0,
                    decay_applied=False
                )
                skills_dict[sk_id] = snap
            return StudentProfileSnapshot(
                student_id=student_id,
                overall_mastery=0.15,
                primary_status="learning",
                skills=skills_dict
            )
            
        skills_dict = {}
        total_p = 0.0
        statuses = []
        for row in rows:
            snap = EstimateSnapshot(
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
            snap = apply_forgetting_curve_to_snapshot(snap)
            skills_dict[snap.skill_id] = snap
            total_p += snap.p_mastery
            statuses.append(snap.cognitive_status)
            
        # Ensure any missing skills from hierarchy have defaults
        for sk in SKILL_HIERARCHY:
            sk_id = sk["skill_id"]
            if sk_id not in skills_dict:
                snap = EstimateSnapshot(
                    student_id=student_id,
                    skill_id=sk_id,
                    p_mastery=0.15,
                    cognitive_status="learning",
                    total_attempts=0,
                    consecutive_correct=0,
                    consecutive_quick_guesses=0,
                    recommended_action="practice",
                    recommended_next_skill=sk_id,
                    last_updated="N/A",
                    days_since_practice=0.0,
                    decay_applied=False
                )
                skills_dict[sk_id] = snap
                total_p += 0.15
                statuses.append("learning")
                
        overall = round(total_p / len(SKILL_HIERARCHY), 4)
        
        # Determine primary status hierarchy: guessing > plateaued > mastered > improving > learning
        if "guessing" in statuses:
            primary = "guessing"
        elif "plateaued" in statuses:
            primary = "plateaued"
        elif all(s == "mastered" for s in statuses):
            primary = "mastered"
        elif "improving" in statuses:
            primary = "improving"
        else:
            primary = "learning"
            
        return StudentProfileSnapshot(
            student_id=student_id,
            overall_mastery=overall,
            primary_status=primary,
            skills=skills_dict
        )
    finally:
        conn.close()

@router.get("/students", response_model=List[Dict[str, Any]])
def list_students():
    """
    List all students in the classroom with summary statistics (incorporating forgetting curve decay).
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM estimates ORDER BY student_id ASC")
        rows = cursor.fetchall()
        
        # If empty, return default seeded student list
        if not rows:
            return []
            
        students_map = {}
        for row in rows:
            snap = EstimateSnapshot(
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
            snap = apply_forgetting_curve_to_snapshot(snap)
            s_id = snap.student_id
            if s_id not in students_map:
                students_map[s_id] = {"total_p": 0.0, "count": 0, "total_att": 0, "statuses": []}
            students_map[s_id]["total_p"] += snap.p_mastery
            students_map[s_id]["count"] += 1
            students_map[s_id]["total_att"] += snap.total_attempts
            students_map[s_id]["statuses"].append(snap.cognitive_status)
            
        results = []
        for s_id, data in sorted(students_map.items()):
            stat_rows = data["statuses"]
            if "guessing" in stat_rows:
                status = "guessing"
            elif "plateaued" in stat_rows:
                status = "plateaued"
            elif all(s == "mastered" for s in stat_rows):
                status = "mastered"
            elif "improving" in stat_rows:
                status = "improving"
            else:
                status = "learning"
                
            avg_p = data["total_p"] / max(1, data["count"])
            results.append({
                "student_id": s_id,
                "overall_mastery": round(avg_p, 4),
                "total_attempts": data["total_att"],
                "status": status
            })
        return results
    finally:
        conn.close()

@router.get("/students/histogram", response_model=ClassHistogramResponse)
def get_class_histogram(skill_id: str = "skill_arithmetic_01"):
    """
    Returns class mastery distribution across 4 buckets (0-25%, 25-50%, 50-75%, 75-100%)
    color-coded by cognitive status.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM estimates WHERE skill_id = ?", (skill_id,))
        rows = cursor.fetchall()
        
        buckets_map = {}
        total_students = len(rows)
        
        for row in rows:
            snap = EstimateSnapshot(
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
            snap = apply_forgetting_curve_to_snapshot(snap)
            
            p = snap.p_mastery
            if p < 0.25:
                bucket = "0-25%"
            elif p < 0.50:
                bucket = "25-50%"
            elif p < 0.75:
                bucket = "50-75%"
            else:
                bucket = "75-100%"
                
            status = snap.cognitive_status
            key = (bucket, status)
            buckets_map[key] = buckets_map.get(key, 0) + 1
            
        items = []
        for (bucket, status), count in buckets_map.items():
            items.append(ClassHistogramItem(mastery_bucket=bucket, cognitive_status=status, student_count=count))
            
        return ClassHistogramResponse(
            skill_id=skill_id,
            total_students=total_students,
            buckets=items
        )
    finally:
        conn.close()

@router.get("/skills", response_model=List[Dict[str, Any]])
def list_skills():
    return SKILL_HIERARCHY

@router.post("/reset_and_seed")
def reset_and_seed_db():
    """
    Reset database and re-seed from CSV (useful for testing & interview demonstrations).
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("DROP TABLE IF EXISTS responses")
        cursor.execute("DROP TABLE IF EXISTS estimates")
        conn.commit()
    finally:
        conn.close()
        
    init_db(seed_from_csv=True)
    return {"message": "Database reset and seeded successfully."}

