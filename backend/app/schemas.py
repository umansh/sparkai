from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class ResponseSubmission(BaseModel):
    submission_id: Optional[str] = Field(default=None, description="Client-generated UUID for idempotency & deduplication")
    student_id: str = Field(..., description="Unique student identifier")
    skill_id: str = Field(..., description="Skill/concept identifier")
    correct: int = Field(..., ge=0, le=1, description="1 if correct, 0 if incorrect")
    timestamp: Optional[str] = Field(default=None, description="ISO timestamp of response")
    response_time_ms: int = Field(..., ge=0, description="Response time in milliseconds")
    hint_used: Optional[bool] = Field(default=False, description="True if student requested instructional scaffold/hint")
    item_difficulty_b: Optional[float] = Field(default=None, description="IRT item difficulty parameter b (-3.0 to +3.0)")
    q_matrix_weights: Optional[Dict[str, float]] = Field(default=None, description="Multi-skill proportional weight attribution map")

class ResponseSyncBatch(BaseModel):
    responses: List[ResponseSubmission]

class EstimateSnapshot(BaseModel):
    student_id: str
    skill_id: str
    p_mastery: float = Field(..., description="Current probability of mastery P(L_t)")
    cognitive_status: str = Field(..., description="improving, plateaued, guessing, mastered, learning, or fatigued")
    total_attempts: int
    consecutive_correct: int
    consecutive_quick_guesses: int
    recommended_action: str = Field(..., description="scaffold, practice, advance, or break")
    recommended_next_skill: Optional[str] = None
    last_updated: str
    days_since_practice: Optional[float] = Field(default=None, description="Days elapsed since last practice on this skill")
    decay_applied: Optional[bool] = Field(default=False, description="True if Ebbinghaus forgetting curve decay was applied at query time")

class RecommendationDetail(BaseModel):
    action: str
    target_skill_id: str
    reason: str
    difficulty_adjustment: str

class SubmissionResult(BaseModel):
    submission_id: str
    student_id: str
    skill_id: str
    is_duplicate: bool = False
    updated_estimate: EstimateSnapshot
    next_recommendation: RecommendationDetail

class StudentProfileSnapshot(BaseModel):
    student_id: str
    overall_mastery: float
    primary_status: str
    skills: Dict[str, EstimateSnapshot]

class ParameterConfig(BaseModel):
    p_init: float = Field(default=0.15, ge=0.01, le=0.99, description="Prior mastery probability P(L_0)")
    p_learn: float = Field(default=0.20, ge=0.01, le=0.99, description="Transition learning rate P(T)")
    p_guess: float = Field(default=0.25, ge=0.01, le=0.99, description="Guessing probability P(G)")
    p_slip: float = Field(default=0.10, ge=0.01, le=0.99, description="Slip probability P(S)")
    rapid_guess_ms: int = Field(default=1000, ge=200, le=5000, description="Threshold for rapid guessing heuristic")
    guess_multiplier: float = Field(default=2.6, ge=1.0, le=5.0, description="Multiplier for P(G) on rapid correct guess")
    slip_multiplier: float = Field(default=2.2, ge=1.0, le=5.0, description="Multiplier for P(S) on rapid careless slip")
    plateau_threshold: int = Field(default=3, ge=2, le=10, description="Consecutive errors before plateau scaffolding")

class AlgorithmSimulationItem(BaseModel):
    skill_id: str = "skill_arithmetic_01"
    correct: int = Field(..., ge=0, le=1)
    response_time_ms: int = Field(default=3000, ge=0)
    hint_used: Optional[bool] = False
    item_difficulty_b: Optional[float] = None
    q_matrix_weights: Optional[Dict[str, float]] = None

class AlgorithmSimulationRequest(BaseModel):
    student_id: str = "sim_student"
    responses: List[AlgorithmSimulationItem]
    parameters: Optional[ParameterConfig] = None

class AlgorithmResultDetail(BaseModel):
    algorithm_name: str
    algorithm_type: str
    p_mastery: float
    cognitive_status: str
    recommended_action: str
    recommended_next_skill: str
    reason: str
    latency_microseconds: float
    computation_complexity: str
    explanation: str

class AlgorithmComparisonResponse(BaseModel):
    student_id: str
    interaction_count: int
    results: List[AlgorithmResultDetail]
    summary_insight: str

class DAGNodeInfo(BaseModel):
    skill_id: str
    name: str
    p_mastery: float
    prior_boost_received: float
    prereq: Optional[str] = None
    next: Optional[str] = None
    status: str

class DAGPropagationRequest(BaseModel):
    target_skill_id: str
    correct: int = Field(..., ge=0, le=1)
    response_time_ms: int = 3500

class DAGPropagationResponse(BaseModel):
    target_skill_id: str
    propagation_summary: str
    nodes: List[DAGNodeInfo]

class ClassHistogramItem(BaseModel):
    mastery_bucket: str = Field(..., description="0-25%, 25-50%, 50-75%, or 75-100%")
    cognitive_status: str
    student_count: int

class ClassHistogramResponse(BaseModel):
    skill_id: str
    total_students: int
    buckets: List[ClassHistogramItem]


