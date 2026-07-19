import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_and_update_parameters():
    """Verify GET and POST /algorithms/parameters."""
    res = client.get("/algorithms/parameters")
    assert res.status_code == 200
    data = res.json()
    assert data["p_init"] == 0.15
    
    # Update
    new_params = {
        "p_init": 0.25,
        "p_learn": 0.30,
        "p_guess": 0.20,
        "p_slip": 0.15,
        "rapid_guess_ms": 1200,
        "guess_multiplier": 3.0,
        "slip_multiplier": 2.5,
        "plateau_threshold": 4
    }
    res_up = client.post("/algorithms/parameters", json=new_params)
    assert res_up.status_code == 200
    assert res_up.json()["p_init"] == 0.25

def test_compare_algorithms():
    """Verify POST /algorithms/compare runs all 6 algorithms and returns comparison summary."""
    payload = {
        "student_id": "test_comparer",
        "responses": [
            {"skill_id": "skill_arithmetic_01", "correct": 1, "response_time_ms": 400},
            {"skill_id": "skill_arithmetic_01", "correct": 1, "response_time_ms": 350},
            {"skill_id": "skill_arithmetic_01", "correct": 0, "response_time_ms": 4000}
        ]
    }
    res = client.post("/algorithms/compare", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert len(data["results"]) == 6
    names = [r["algorithm_name"] for r in data["results"]]
    assert any("Enhanced BKT" in n for n in names)
    assert any("Item Response Theory" in n for n in names)
    assert any("Deep Knowledge Tracing" in n for n in names)
    assert any("Elo Rating" in n for n in names)
    assert any("Performance Factors Analysis" in n for n in names)
    assert any("Multi-Skill Joint Tracing" in n for n in names)

def test_dag_propagate():
    """Verify POST /algorithms/dag_propagate updates priors across prerequisite nodes."""
    payload = {
        "target_skill_id": "skill_geometry_01",
        "correct": 1,
        "response_time_ms": 3200
    }
    res = client.post("/algorithms/dag_propagate", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["target_skill_id"] == "skill_geometry_01"
    assert len(data["nodes"]) == 4
    # Geometry correct should have boosted Arithmetic and Algebra (prereqs)
    geom_node = next(n for n in data["nodes"] if n["skill_id"] == "skill_geometry_01")
    arith_node = next(n for n in data["nodes"] if n["skill_id"] == "skill_arithmetic_01")
    assert geom_node["prior_boost_received"] > 0
    assert arith_node["prior_boost_received"] > 0
