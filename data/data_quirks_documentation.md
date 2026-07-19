# SparkSchool Classroom Dataset — Quirks & Handling Strategy

## Overview
This dataset (`data/student_responses.csv`) was generated using `data/generate_dataset.py`, seeded with `Umang_SparkSchool_Founding_Engineer_202607` for reproducibility and uniqueness. It contains interaction logs for 60 students (`student_001` to `student_060`) across 4 core mathematical skills (`skill_arithmetic_01`, `skill_algebra_01`, `skill_geometry_01`, `skill_word_problems_01`).

---

## 1. Student Archetypes Included
To ensure our core estimation model (Part 1) behaves distinctly as required ("behave differently for a student who's clearly improving vs. one who's plateaued vs. one who's guessing"), we explicitly seeded four student profiles:

1. **Improving Students (`student_001_improving`, etc.)**:
   - Start with low accuracy (`~25%` hit rate) and slow response times (`12,000ms - 25,000ms`).
   - Over consecutive attempts, latent knowledge transitions upward ($P(L)$ grows), accuracy rises above `85%`, and response times streamline to `3,000ms - 5,000ms`.
2. **Plateaued / Struggling Students (`student_002_plateaued`, etc.)**:
   - Remain stuck at `~45%` accuracy over 10+ attempts.
   - Frequently exhibit long response durations (`> 30,000ms`) on failed questions, indicating conceptual confusion rather than lack of effort.
3. **Guessing Students (`student_003_guessing`, etc.)**:
   - Exhibit rapid-fire clicking patterns where `response_time_ms < 1000ms` (often `350ms - 950ms`).
   - Accuracy hovers around `~35%` (random coin-flip multiple choice behavior).
4. **Mastered Students (`student_004_mastered`, etc.)**:
   - High performers (`~90%` hit rate) with consistent, thoughtful response speeds (`2,500ms - 6,000ms`).

---

## 2. Deliberately Introduced Quirks & Mitigation Strategies

Per Part 0 requirements, three specific real-world imperfections were injected into the dataset. Below is what was introduced and exactly how our backend estimation engine and API (Parts 1 & 2) handle them:

| Quirk Type | Why It Was Introduced | How Our Engine & API Handle It |
| :--- | :--- | :--- |
| **Duplicate Submissions (`duplicate_submission_2G_retry`)** | In rural/government schools on 2G/3G networks, students frequently experience network freezes. When a submission hangs, they double-tap "Submit" or the client retry loop re-transmits the same payload when connection restores. | **Idempotency Key Verification (`submission_id`)**: Every client submission attaches a unique UUID (`submission_id`). The backend checks `student_responses` table / cache before processing. If `submission_id` already exists, the API returns the cached response with `is_duplicate=True` without updating the student's BKT mastery estimate twice. |
| **Missing Timestamps (`missing_timestamp_device_desync`)** | Low-end tablets offline often lose clock synchronization or return empty string `timestamp` when battery dies while queued. | **Server-Side Fallback Imputation**: If `timestamp` is `None` or empty string `""`, the backend automatically infers the timestamp using the server receipt time (`datetime.utcnow()`) or the last known sequential timestamp for that student. |
| **Implausible Response Durations (`implausible_rapid_click_12ms` / `implausible_session_sleep_12hrs`)** | Accidental double-clicks (12ms) or students falling asleep / switching tabs before hitting submit 12 hours later (`43,200,000ms`). | **Sanitization & Clamping Bounds**: The BKT response-time heuristic clamps `response_time_ms` to a minimum of `200ms` and maximum of `120,000ms` (2 minutes). Anything `< 800ms` triggers rapid-guessing penalty without breaking probability bounds. Anything `> 120,000ms` is treated as a session break rather than a 12-hour cognitive struggle. |
