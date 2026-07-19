export interface EstimateSnapshot {
  student_id: string;
  skill_id: string;
  p_mastery: number;
  cognitive_status: 'improving' | 'plateaued' | 'guessing' | 'mastered' | 'learning';
  total_attempts: number;
  consecutive_correct: number;
  consecutive_quick_guesses: number;
  recommended_action: 'scaffold' | 'practice' | 'advance';
  recommended_next_skill?: string;
  last_updated: string;
  days_since_practice?: number;
  decay_applied?: boolean;
}

export interface RecommendationDetail {
  action: 'scaffold' | 'practice' | 'advance';
  target_skill_id: string;
  reason: string;
  difficulty_adjustment: string;
}

export interface SubmissionResult {
  submission_id: string;
  student_id: string;
  skill_id: string;
  is_duplicate: boolean;
  updated_estimate: EstimateSnapshot;
  next_recommendation: RecommendationDetail;
}

export interface StudentProfileSnapshot {
  student_id: string;
  overall_mastery: number;
  primary_status: 'improving' | 'plateaued' | 'guessing' | 'mastered' | 'learning';
  skills: Record<string, EstimateSnapshot>;
}

export interface StudentSummary {
  student_id: string;
  overall_mastery: number;
  total_attempts: number;
  status: 'improving' | 'plateaued' | 'guessing' | 'mastered' | 'learning';
}

export interface SkillInfo {
  skill_id: string;
  name: string;
  prereq: string | null;
  next: string | null;
  difficulty: string;
}

export interface QueuedSubmission {
  submission_id: string;
  student_id: string;
  skill_id: string;
  correct: number;
  timestamp: string;
  response_time_ms: number;
  status: 'pending' | 'syncing' | 'failed';
  retry_count: number;
}

export interface ParameterConfig {
  p_init: number;
  p_learn: number;
  p_guess: number;
  p_slip: number;
  rapid_guess_ms: number;
  guess_multiplier: number;
  slip_multiplier: number;
  plateau_threshold: number;
}

export interface AlgorithmSimulationItem {
  skill_id: string;
  correct: number;
  response_time_ms: number;
  hint_used?: boolean;
  item_difficulty_b?: number;
  q_matrix_weights?: Record<string, number>;
}

export interface AlgorithmResultDetail {
  algorithm_name: string;
  algorithm_type: string;
  p_mastery: number;
  cognitive_status: string;
  recommended_action: string;
  recommended_next_skill: string;
  reason: string;
  latency_microseconds: number;
  computation_complexity: string;
  explanation: string;
}

export interface AlgorithmComparisonResponse {
  student_id: string;
  interaction_count: number;
  results: AlgorithmResultDetail[];
  summary_insight: string;
}

export interface DAGNodeInfo {
  skill_id: string;
  name: string;
  p_mastery: number;
  prior_boost_received: number;
  prereq: string | null;
  next: string | null;
  status: string;
}

export interface DAGPropagationResponse {
  target_skill_id: string;
  propagation_summary: string;
  nodes: DAGNodeInfo[];
}

export interface CRDTLogEntry {
  id: string;
  device_id: 'teacher_tablet' | 'student_tablet_a';
  timestamp: number;
  operation: 'PUT_RESPONSE' | 'UPDATE_MASTERY' | 'MERGE_DELTAS';
  payload: {
    submission_id?: string;
    student_id: string;
    skill_id: string;
    p_mastery?: number;
    correct?: number;
    vector_clock: Record<string, number>;
  };
}

export interface CRDTDeviceState {
  device_id: string;
  name: string;
  is_online: boolean;
  vector_clock: Record<string, number>;
  local_estimates: Record<string, number>;
  delta_log: CRDTLogEntry[];
}

export interface ClassHistogramItem {
  mastery_bucket: string;
  cognitive_status: string;
  student_count: number;
}

export interface ClassHistogramResponse {
  skill_id: string;
  total_students: number;
  buckets: ClassHistogramItem[];
}

