import pytest
from fastapi.testclient import TestClient
import uuid
import os
from app.main import app
from app.core.engine import KnowledgeTracingEngine
from app.database import init_db

client = TestClient(app)

@pytest.fixture(autouse=True)
def setup_test_db():
    # Re-seed fresh for tests
    init_db(seed_from_csv=False)

def test_biorhythm_engine_improving():
    """Verify BKT updates increase p_mastery when correct=1 and transition to improving/mastered status."""
    snap = None
    for _ in range(4):
        snap, rec = KnowledgeTracingEngine.update_mastery(snap, "test_student", "skill_arithmetic_01", 1, 3500)
    assert snap.p_mastery > 0.60
    assert snap.cognitive_status in ["improving", "mastered"]
    assert rec.action in ["practice", "advance"]

def test_rapid_guessing_detection():
    """Verify rapid guessing (<800ms) triggers guessing classification and practice/reflection prompt."""
    snap = None
    for _ in range(3):
        snap, rec = KnowledgeTracingEngine.update_mastery(snap, "guess_student", "skill_algebra_01", 0, 450)
    assert snap.cognitive_status == "guessing"
    assert rec.action == "practice"

def test_api_submit_and_idempotency():
    """Verify POST /response updates mastery and that resubmitting the same submission_id returns duplicate=True without double counting."""
    sub_id = str(uuid.uuid4())
    payload = {
        "submission_id": sub_id,
        "student_id": "api_test_student",
        "skill_id": "skill_arithmetic_01",
        "correct": 1,
        "response_time_ms": 4000
    }
    
    # First submit
    res1 = client.post("/response", json=payload)
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["is_duplicate"] is False
    mastery1 = data1["updated_estimate"]["p_mastery"]
    
    # Second submit identical sub_id
    res2 = client.post("/response", json=payload)
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["is_duplicate"] is True
    mastery2 = data2["updated_estimate"]["p_mastery"]
    
    # Mastery should not have inflated twice!
    assert mastery1 == mastery2

def test_get_student_estimate():
    """Verify GET /student/{id}/estimate returns all skills and overall mastery."""
    res = client.get("/student/api_test_student/estimate")
    assert res.status_code == 200
    data = res.json()
    assert data["student_id"] == "api_test_student"
    assert "skill_arithmetic_01" in data["skills"]
