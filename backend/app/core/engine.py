from datetime import datetime, timezone
from typing import Dict, Any, Tuple, Optional
from app.schemas import EstimateSnapshot, RecommendationDetail

SKILL_HIERARCHY = [
    {"skill_id": "skill_arithmetic_01", "name": "Basic Arithmetic", "prereq": None, "next": "skill_algebra_01", "difficulty": "Easy"},
    {"skill_id": "skill_algebra_01", "name": "Linear Equations", "prereq": "skill_arithmetic_01", "next": "skill_geometry_01", "difficulty": "Medium"},
    {"skill_id": "skill_geometry_01", "name": "Triangles & Angles", "prereq": "skill_algebra_01", "next": "skill_word_problems_01", "difficulty": "Medium"},
    {"skill_id": "skill_word_problems_01", "name": "Multi-Step Word Problems", "prereq": "skill_geometry_01", "next": None, "difficulty": "Hard"}
]

SKILL_MAP = {s["skill_id"]: s for s in SKILL_HIERARCHY}

class KnowledgeTracingEngine:
    """
    Enhanced Bayesian Knowledge Tracing (BKT) combined with Response-Time Heuristics
    and Cognitive State Trajectory Classification.
    """
    
    @staticmethod
    def get_default_parameters(skill_id: str) -> Dict[str, float]:
        return {
            "p_init": 0.15,
            "p_learn": 0.20,
            "p_guess": 0.25,
            "p_slip": 0.10
        }
        
    @classmethod
    def compute_adaptive_prior(cls, student_id: str, skill_id: str, conn: Optional[Any] = None) -> float:
        """
        Computes adaptive prior P_init based on lateral transfer from prerequisite skill mastery.
        Formula: P_init = base_p_init + transfer_coefficient * P(prereq_mastery)
        """
        base_params = cls.get_default_parameters(skill_id)
        base_p_init = base_params["p_init"]
        if not conn:
            return base_p_init
        
        skill_info = SKILL_MAP.get(skill_id)
        if not skill_info or not skill_info.get("prereq"):
            return base_p_init
        
        prereq_id = skill_info["prereq"]
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT p_mastery FROM estimates WHERE student_id = ? AND skill_id = ?", (student_id, prereq_id))
            row = cursor.fetchone()
            if row and row["p_mastery"] is not None:
                # Lateral transfer: 30% of prerequisite mastery boosts initial prior up to 0.60
                transfer = 0.30 * float(row["p_mastery"])
                return max(base_p_init, min(0.60, round(base_p_init + transfer, 4)))
        except Exception:
            pass
        return base_p_init

    @classmethod
    def update_mastery(
        cls,
        current_snapshot: Optional[EstimateSnapshot],
        student_id: str,
        skill_id: str,
        correct: int,
        response_time_ms: int,
        timestamp: Optional[str] = None,
        conn: Optional[Any] = None,
        hint_used: Optional[bool] = False,
        item_difficulty_b: Optional[float] = None,
        q_matrix_weights: Optional[Dict[str, float]] = None,
        q_weight: float = 1.0
    ) -> Tuple[EstimateSnapshot, RecommendationDetail]:
        params = cls.get_default_parameters(skill_id)
        skill_info = SKILL_MAP.get(skill_id, {"name": skill_id, "prereq": None, "next": None, "difficulty": "Medium"})
        
        # Initialize if first attempt on this skill
        if not current_snapshot:
            p_prev = cls.compute_adaptive_prior(student_id, skill_id, conn)
            total_attempts = 0
            consecutive_correct = 0
            consecutive_quick_guesses = 0
            consecutive_errors = 0
        else:
            p_prev = current_snapshot.p_mastery
            total_attempts = current_snapshot.total_attempts
            consecutive_correct = current_snapshot.consecutive_correct
            consecutive_quick_guesses = current_snapshot.consecutive_quick_guesses
            # Derive consecutive errors if needed
            consecutive_errors = 0 if correct == 1 else (1 if current_snapshot.consecutive_correct == 0 else 0)

        # 0. Item Difficulty Calibration (IRT-BKT Hybrid)
        if item_difficulty_b is None:
            diff_map = {"Easy": -1.2, "Medium": 0.0, "Hard": +1.2}
            b_q = diff_map.get(skill_info.get("difficulty", "Medium"), 0.0)
        else:
            b_q = float(item_difficulty_b)

        p_guess = params["p_guess"]
        p_slip = params["p_slip"]

        # Modulate base guess & slip by IRT difficulty b_q
        p_guess = min(0.70, max(0.05, p_guess * (1.0 - 0.12 * b_q)))
        p_slip = min(0.60, max(0.02, p_slip * (1.0 + 0.15 * max(0.0, b_q))))

        # 1. Response-Time Heuristic Modifiers
        t_resp = max(200, min(120000, response_time_ms))
        is_quick_guess = t_resp < 1000
        
        if is_quick_guess:
            if correct == 1:
                # Lucky rapid click: increase guess probability so mastery gain is muted
                p_guess = min(0.80, p_guess * 2.6)
            else:
                # Careless rushing: increase slip probability because student might know it
                p_slip = min(0.50, p_slip * 2.2)

        # If student requested a hint / scaffold, blind guessing drops and learning rate accelerates
        if hint_used:
            p_guess = min(p_guess, 0.05)
            p_learn = min(0.80, params["p_learn"] * 1.40 * q_weight)
        else:
            p_learn = params["p_learn"] * q_weight
                
        # 2. Bayesian Posterior Computation
        if correct == 1:
            p_conditional = (p_prev * (1.0 - p_slip)) / (p_prev * (1.0 - p_slip) + (1.0 - p_prev) * p_guess)
        else:
            p_conditional = (p_prev * p_slip) / (p_prev * p_slip + (1.0 - p_prev) * (1.0 - p_guess))
            
        # 3. Learning Transition
        p_new = p_conditional + (1.0 - p_conditional) * p_learn
        p_new = max(0.01, min(0.99, round(p_new, 4)))
        
        # 4. Update Counters
        total_attempts += 1
        if correct == 1:
            consecutive_correct += 1
            consecutive_errors = 0
        else:
            consecutive_correct = 0
            consecutive_errors += 1
            
        if is_quick_guess:
            consecutive_quick_guesses += 1
        else:
            consecutive_quick_guesses = 0

        # Check for Cognitive Fatigue: long struggle without rapid rushing
        is_fatigued = (total_attempts >= 10 and t_resp > 20000 and correct == 0) or (consecutive_errors >= 4 and t_resp > 15000)
            
        # 5. Cognitive Trajectory Classification ("improving vs plateaued vs guessing vs fatigued")
        if is_fatigued:
            status = "fatigued"
            # Protect mastery from dropping drastically during fatigue
            p_new = max(p_prev - 0.04, p_new)
        elif consecutive_quick_guesses >= 2 or (total_attempts >= 3 and is_quick_guess and correct == 0):
            status = "guessing"
        elif consecutive_errors >= 3 or (total_attempts >= 6 and p_new < 0.45 and correct == 0):
            status = "plateaued"
        elif p_new >= 0.85:
            status = "mastered"
        elif (p_new - params["p_init"]) >= 0.30 or (consecutive_correct >= 2 and total_attempts >= 2):
            status = "improving"
        else:
            status = "learning"
            
        # 6. Recommendation Prescription Policy
        if status == "fatigued":
            action = "break"
            target_skill = skill_id
            reason = f"Cognitive fatigue detected ({t_resp//1000}s struggle on attempt {total_attempts}). Recommending a 5-minute brain refresh break."
            diff_adj = "Pause Session (Refresh & Recover)"
        elif status == "guessing":
            action = "practice"
            target_skill = skill_id
            reason = f"Rapid guessing detected ({t_resp}ms). Recommending same concept with conceptual reflection prompt."
            diff_adj = "Same (Focused Pacing)"
        elif status == "plateaued" or p_new < 0.40 or consecutive_errors >= 2:
            action = "scaffold"
            if skill_info.get("prereq"):
                target_skill = skill_info["prereq"]
                reason = f"Student is struggling or plateaued on {skill_info['name']} ({p_new*100:.1f}% estimate). Switching to prerequisite skill for scaffolding."
                diff_adj = "Easier (Prerequisite)"
            else:
                target_skill = skill_id
                reason = f"Student needs foundational reinforcement on {skill_info['name']}. Recommending easier scaffolded problem step."
                diff_adj = "Easier (Scaffolded Item)"
        elif p_new > 0.85 or status == "mastered":
            action = "advance"
            if skill_info.get("next"):
                target_skill = skill_info["next"]
                reason = f"Mastery achieved ({p_new*100:.1f}% estimate). Advancing student to next skill level."
                diff_adj = "Harder (Next Skill)"
            else:
                target_skill = skill_id
                reason = f"Mastery unlocked ({p_new*100:.1f}% estimate) on advanced skill. Recommending challenge extension problem."
                diff_adj = "Harder (Challenge Extension)"
        else:
            action = "practice"
            target_skill = skill_id
            reason = f"Student is {status} in the optimal challenge zone ({p_new*100:.1f}% estimate). Recommending another target difficulty problem."
            diff_adj = "Optimal Challenge (Same Skill)"
            
        ts_str = timestamp if timestamp else datetime.now(timezone.utc).isoformat()
        
        new_snapshot = EstimateSnapshot(
            student_id=student_id,
            skill_id=skill_id,
            p_mastery=p_new,
            cognitive_status=status,
            total_attempts=total_attempts,
            consecutive_correct=consecutive_correct,
            consecutive_quick_guesses=consecutive_quick_guesses,
            recommended_action=action,
            recommended_next_skill=target_skill,
            last_updated=ts_str
        )
        
        rec_detail = RecommendationDetail(
            action=action,
            target_skill_id=target_skill,
            reason=reason,
            difficulty_adjustment=diff_adj
        )
        
        return new_snapshot, rec_detail
