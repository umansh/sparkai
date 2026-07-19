from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any, Optional
from app.schemas import (
    ParameterConfig,
    AlgorithmSimulationRequest,
    AlgorithmComparisonResponse,
    DAGPropagationRequest,
    DAGPropagationResponse
)
from app.core.multi_algorithm_engine import MultiAlgorithmEngine

router = APIRouter(tags=["AI Algorithms & Parameter Lab"])

# Global in-memory parameter configuration override for live tuning during demo/interview
_active_parameters = ParameterConfig()

@router.get("/algorithms/parameters", response_model=ParameterConfig)
def get_active_parameters():
    """
    Get current active parameter configuration for BKT & alternative models.
    """
    return _active_parameters

@router.post("/algorithms/parameters", response_model=ParameterConfig)
def update_active_parameters(params: ParameterConfig):
    """
    Update active parameter configuration for BKT & alternative models.
    """
    global _active_parameters
    _active_parameters = params
    return _active_parameters

@router.post("/algorithms/compare", response_model=AlgorithmComparisonResponse)
def compare_algorithms(payload: AlgorithmSimulationRequest):
    """
    Execute and compare all 6 alternative knowledge tracing algorithms on a sequence
    of student interaction attempts.
    """
    params = payload.parameters if payload.parameters else _active_parameters
    result = MultiAlgorithmEngine.compare_all(
        responses=payload.responses,
        parameters=params,
        student_id=payload.student_id
    )
    return result

@router.post("/algorithms/dag_propagate", response_model=DAGPropagationResponse)
def simulate_dag_propagation(payload: DAGPropagationRequest):
    """
    Simulate Multi-Skill Joint Tracing across the Directed Acyclic Graph (DAG).
    Demonstrates forward and backward Bayesian prior propagation.
    """
    result = MultiAlgorithmEngine.simulate_dag_propagation(
        target_skill_id=payload.target_skill_id,
        correct=payload.correct,
        response_time_ms=payload.response_time_ms
    )
    return result
