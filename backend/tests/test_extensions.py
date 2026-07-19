import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timezone, timedelta
import math
from app.main import app
from app.core.engine import KnowledgeTracingEngine
from app.routers.students import apply_forgetting_curve_to_snapshot
from app.schemas import EstimateSnapshot
from app.database import get_db_connection, init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_db():
    init_db(seed_from_csv=False)

def test_forgetting_curve_decay():
    """Verify Ebbinghaus forgetting curve decays mastery over time and triggers spaced repetition practice."""
    # Create snapshot from 20 days ago with 90% mastery
    old_ts = (datetime.now(timezone.utc) - timedelta(days=20)).isoformat()
    snap = EstimateSnapshot(
        student_id="decay_student",
        skill_id="skill_arithmetic_01",
        p_mastery=0.90,
        cognitive_status="mastered",
        total_attempts=10,
        consecutive_correct=5,
        consecutive_quick_guesses=0,
        recommended_action="advance",
        recommended_next_skill="skill_algebra_01",
        last_updated=old_ts
    )
    
    decayed_snap = apply_forgetting_curve_to_snapshot(snap)
    assert decayed_snap.decay_applied is True
    assert decayed_snap.days_since_practice >= 19.9
    assert decayed_snap.p_mastery < 0.90
    assert decayed_snap.recommended_action == "practice"
    assert decayed_snap.cognitive_status == "improving"

def test_adaptive_priors(setup_test_db):
    """Verify lateral transfer: high mastery on Basic Arithmetic increases prior for Linear Equations."""
    conn = get_db_connection()
    try:
        # First master basic arithmetic
        client.post("/response", json={
            "submission_id": "prereq_sub_1",
            "student_id": "transfer_student",
            "skill_id": "skill_arithmetic_01",
            "correct": 1,
            "response_time_ms": 3000
        })
        client.post("/response", json={
            "submission_id": "prereq_sub_2",
            "student_id": "transfer_student",
            "skill_id": "skill_arithmetic_01",
            "correct": 1,
            "response_time_ms": 3000
        })
        client.post("/response", json={
            "submission_id": "prereq_sub_3",
            "student_id": "transfer_student",
            "skill_id": "skill_arithmetic_01",
            "correct": 1,
            "response_time_ms": 3000
        })
        
        # Check prior on algebra before any algebra submissions
        prior_algebra = KnowledgeTracingEngine.compute_adaptive_prior("transfer_student", "skill_algebra_01", conn)
        assert prior_algebra > 0.15
    finally:
        conn.close()

def test_class_histogram_endpoint():
    """Verify GET /students/histogram returns bucket counts."""
    # Submit some responses
    client.post("/response", json={
        "submission_id": "hist_sub_1",
        "student_id": "student_a",
        "skill_id": "skill_arithmetic_01",
        "correct": 1,
        "response_time_ms": 3000
    })
    
    res = client.get("/students/histogram?skill_id=skill_arithmetic_01")
    assert res.status_code == 200
    data = res.json()
    assert data["skill_id"] == "skill_arithmetic_01"
    assert data["total_students"] >= 1
    assert isinstance(data["buckets"], list)

def test_irt_bkt_hybrid_difficulty():
    """Verify item difficulty b modulates guess and slip probabilities."""
    # Test that hard item (+1.5 difficulty) reduces guess probability compared to easy item (-1.5 difficulty)
    snap_easy, _ = KnowledgeTracingEngine.update_mastery(
        None, "test_student", "skill_arithmetic_01", correct=1, response_time_ms=3000, item_difficulty_b=-1.5
    )
    snap_hard, _ = KnowledgeTracingEngine.update_mastery(
        None, "test_student", "skill_arithmetic_01", correct=1, response_time_ms=3000, item_difficulty_b=1.5
    )
    # Correct answer on a hard item yields more mastery gain than on an easy item (because guess probability is smaller on hard item)
    assert snap_hard.p_mastery > snap_easy.p_mastery

def test_hint_modulated_learning_rate():
    """Verify hint usage drops guessing to 0.05 and boosts transition learning rate."""
    snap_no_hint, _ = KnowledgeTracingEngine.update_mastery(
        None, "hint_student_1", "skill_arithmetic_01", correct=1, response_time_ms=3000, hint_used=False
    )
    snap_with_hint, _ = KnowledgeTracingEngine.update_mastery(
        None, "hint_student_2", "skill_arithmetic_01", correct=1, response_time_ms=3000, hint_used=True
    )
    assert snap_with_hint.p_mastery > snap_no_hint.p_mastery

def test_cognitive_fatigue_detection():
    """Verify long struggle after many attempts classifies as fatigued and recommends break."""
    snap = EstimateSnapshot(
        student_id="fatigued_student",
        skill_id="skill_arithmetic_01",
        p_mastery=0.65,
        cognitive_status="improving",
        total_attempts=10,
        consecutive_correct=0,
        consecutive_quick_guesses=0,
        recommended_action="practice",
        last_updated=datetime.now(timezone.utc).isoformat()
    )
    # Student takes over 20 seconds and misses
    new_snap, rec = KnowledgeTracingEngine.update_mastery(
        snap, "fatigued_student", "skill_arithmetic_01", correct=0, response_time_ms=25000
    )
    assert new_snap.cognitive_status == "fatigued"
    assert rec.action == "break"
    assert "break" in rec.reason.lower() or "fatigue" in rec.reason.lower()

def test_q_matrix_proportional_updates():
    """Verify Q-matrix weight dictionary updates multiple sub-skills simultaneously via API."""
    res = client.post("/response", json={
        "submission_id": "q_matrix_sub_1",
        "student_id": "q_student",
        "skill_id": "skill_word_problems_01",
        "correct": 1,
        "response_time_ms": 4000,
        "q_matrix_weights": {
            "skill_word_problems_01": 0.6,
            "skill_algebra_01": 0.4
        }
    })
    assert res.status_code == 200
    
    # Verify that secondary sub-skill (algebra) was also updated in database
    res_snap = client.get("/student/q_student/estimate")
    assert res_snap.status_code == 200
    assert res_snap.json()["skills"]["skill_algebra_01"]["total_attempts"] >= 1
