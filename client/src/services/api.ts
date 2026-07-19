import type {
  SubmissionResult,
  StudentProfileSnapshot,
  StudentSummary,
  SkillInfo,
  QueuedSubmission,
  EstimateSnapshot,
  RecommendationDetail
} from '../types';
import { offlineQueueService } from './offlineQueue';

const API_BASE_URL = 'http://localhost:8000';

let isSimulatedOffline = false;
let is2GSimulation = false;

export const networkService = {
  setSimulatedOffline(status: boolean) {
    isSimulatedOffline = status;
  },
  getSimulatedOffline(): boolean {
    return isSimulatedOffline || !navigator.onLine;
  },
  set2GSimulation(status: boolean) {
    is2GSimulation = status;
  },
  get2GSimulation(): boolean {
    return is2GSimulation;
  }
};

async function artificialDelay() {
  if (networkService.get2GSimulation()) {
    // 2G network simulation: 2000ms to 4500ms delay
    const delay = Math.floor(Math.random() * 2500) + 2000;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}

export const apiService = {
  async listStudents(): Promise<StudentSummary[]> {
    if (networkService.getSimulatedOffline()) {
      return [];
    }
    await artificialDelay();
    try {
      const res = await fetch(`${API_BASE_URL}/students`);
      if (!res.ok) throw new Error('Failed to fetch students');
      return res.json();
    } catch (err) {
      console.warn('Network offline or backend down, returning empty students list.');
      return [];
    }
  },

  async listSkills(): Promise<SkillInfo[]> {
    try {
      const res = await fetch(`${API_BASE_URL}/skills`);
      if (!res.ok) throw new Error('Failed to fetch skills');
      return res.json();
    } catch (err) {
      // Fallback skill hierarchy if offline
      return [
        { skill_id: "skill_arithmetic_01", name: "Basic Arithmetic", prereq: null, next: "skill_algebra_01", difficulty: "Easy" },
        { skill_id: "skill_algebra_01", name: "Linear Equations", prereq: "skill_arithmetic_01", next: "skill_geometry_01", difficulty: "Medium" },
        { skill_id: "skill_geometry_01", name: "Triangles & Angles", prereq: "skill_algebra_01", next: "skill_word_problems_01", difficulty: "Medium" },
        { skill_id: "skill_word_problems_01", name: "Multi-Step Word Problems", prereq: "skill_geometry_01", next: null, difficulty: "Hard" }
      ];
    }
  },

  async getStudentEstimate(student_id: string): Promise<StudentProfileSnapshot | null> {
    if (networkService.getSimulatedOffline()) {
      return null;
    }
    await artificialDelay();
    try {
      const res = await fetch(`${API_BASE_URL}/student/${student_id}/estimate`);
      if (!res.ok) throw new Error('Failed to fetch student estimate');
      return res.json();
    } catch (err) {
      return null;
    }
  },

  async submitResponse(
    student_id: string,
    skill_id: string,
    correct: number,
    response_time_ms: number,
    submission_id: string,
    currentSnapshot?: EstimateSnapshot
  ): Promise<{ result: SubmissionResult; wasOffline: boolean }> {
    const timestamp = new Date().toISOString();

    const computeOptimisticOffline = async (): Promise<{ result: SubmissionResult; wasOffline: boolean }> => {
      const queuedItem: QueuedSubmission = {
        submission_id,
        student_id,
        skill_id,
        correct,
        timestamp,
        response_time_ms,
        status: 'pending',
        retry_count: 0
      };
      await offlineQueueService.addSubmission(queuedItem);

      const p_prev = currentSnapshot ? currentSnapshot.p_mastery : 0.15;
      const p_learn = 0.20;
      let p_guess = 0.25;
      let p_slip = 0.10;

      if (response_time_ms < 1000) {
        if (correct === 1) p_guess = Math.min(0.80, p_guess * 2.6);
        else p_slip = Math.min(0.50, p_slip * 2.2);
      }

      let p_cond = correct === 1
        ? (p_prev * (1 - p_slip)) / (p_prev * (1 - p_slip) + (1 - p_prev) * p_guess)
        : (p_prev * p_slip) / (p_prev * p_slip + (1 - p_prev) * (1 - p_guess));

      let p_new = Math.max(0.01, Math.min(0.99, Number((p_cond + (1 - p_cond) * p_learn).toFixed(4))));

      const total_att = (currentSnapshot?.total_attempts || 0) + 1;
      const cons_corr = correct === 1 ? (currentSnapshot?.consecutive_correct || 0) + 1 : 0;
      const cons_quick = response_time_ms < 1000 ? (currentSnapshot?.consecutive_quick_guesses || 0) + 1 : 0;

      let status: 'improving' | 'plateaued' | 'guessing' | 'mastered' | 'learning' = 'learning';
      if (cons_quick >= 2) status = 'guessing';
      else if (p_new >= 0.85) status = 'mastered';
      else if (p_new - 0.15 >= 0.30 || cons_corr >= 2) status = 'improving';

      const optSnapshot: EstimateSnapshot = {
        student_id,
        skill_id,
        p_mastery: p_new,
        cognitive_status: status,
        total_attempts: total_att,
        consecutive_correct: cons_corr,
        consecutive_quick_guesses: cons_quick,
        recommended_action: p_new > 0.85 ? 'advance' : p_new < 0.40 ? 'scaffold' : 'practice',
        recommended_next_skill: skill_id,
        last_updated: timestamp
      };

      const optRec: RecommendationDetail = {
        action: optSnapshot.recommended_action,
        target_skill_id: skill_id,
        reason: 'Queued offline. Optimistic client estimate computed.',
        difficulty_adjustment: 'Optimistic Offline Assessment'
      };

      return {
        result: {
          submission_id,
          student_id,
          skill_id,
          is_duplicate: false,
          updated_estimate: optSnapshot,
          next_recommendation: optRec
        },
        wasOffline: true
      };
    };

    if (networkService.getSimulatedOffline()) {
      return await computeOptimisticOffline();
    }

    await artificialDelay();
    try {
      const res = await fetch(`${API_BASE_URL}/response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submission_id,
          student_id,
          skill_id,
          correct,
          timestamp,
          response_time_ms
        })
      });

      if (!res.ok) throw new Error('API submission failed');
      const data: SubmissionResult = await res.json();
      return { result: data, wasOffline: false };
    } catch (err) {
      // Network dropped or server offline during submit! Smoothly fallback to offline queueing and optimistic estimate
      return await computeOptimisticOffline();
    }
  },

  async resetAndSeedDB() {
    const res = await fetch(`${API_BASE_URL}/reset_and_seed`, { method: 'POST' });
    return res.json();
  },

  async getParameters(): Promise<import('../types').ParameterConfig> {
    try {
      const res = await fetch(`${API_BASE_URL}/algorithms/parameters`);
      if (!res.ok) throw new Error('Failed to fetch parameters');
      return res.json();
    } catch (err) {
      return {
        p_init: 0.15,
        p_learn: 0.20,
        p_guess: 0.25,
        p_slip: 0.10,
        rapid_guess_ms: 1000,
        guess_multiplier: 2.6,
        slip_multiplier: 2.2,
        plateau_threshold: 3
      };
    }
  },

  async updateParameters(params: import('../types').ParameterConfig): Promise<import('../types').ParameterConfig> {
    const res = await fetch(`${API_BASE_URL}/algorithms/parameters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return res.json();
  },

  async compareAlgorithms(
    responses: import('../types').AlgorithmSimulationItem[],
    parameters?: import('../types').ParameterConfig,
    student_id = 'sim_student'
  ): Promise<import('../types').AlgorithmComparisonResponse> {
    const res = await fetch(`${API_BASE_URL}/algorithms/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id, responses, parameters })
    });
    return res.json();
  },

  async simulateDAG(
    target_skill_id: string,
    correct: number,
    response_time_ms = 3500
  ): Promise<import('../types').DAGPropagationResponse> {
    const res = await fetch(`${API_BASE_URL}/algorithms/dag_propagate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target_skill_id, correct, response_time_ms })
    });
    return res.json();
  },

  async getClassHistogram(skill_id: string): Promise<import('../types').ClassHistogramResponse | null> {
    if (networkService.getSimulatedOffline()) {
      return null;
    }
    await artificialDelay();
    try {
      const res = await fetch(`${API_BASE_URL}/students/histogram?skill_id=${encodeURIComponent(skill_id)}`);
      if (!res.ok) throw new Error('Failed to fetch histogram');
      return res.json();
    } catch (err) {
      return null;
    }
  }
};
