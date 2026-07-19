from fastapi import APIRouter, Depends, HTTPException
from typing import List, Dict, Any
from app.schemas import ResponseSubmission, ResponseSyncBatch, SubmissionResult
from app.database import get_db_connection, process_submission_db

router = APIRouter(tags=["Responses"])

@router.post("/response", response_model=SubmissionResult)
def submit_response(payload: ResponseSubmission):
    """
    Submit a single student response.
    Updates the student's mastery probability using BKT + Response Time heuristics,
    checks idempotency via submission_id, and returns the updated estimate and next recommendation.
    """
    conn = get_db_connection()
    try:
        result = process_submission_db(
            conn=conn,
            submission_id=payload.submission_id,
            student_id=payload.student_id,
            skill_id=payload.skill_id,
            correct=payload.correct,
            response_time_ms=payload.response_time_ms,
            timestamp=payload.timestamp,
            hint_used=payload.hint_used,
            item_difficulty_b=payload.item_difficulty_b,
            q_matrix_weights=payload.q_matrix_weights
        )
        return result
    finally:
        conn.close()

@router.post("/response/sync", response_model=List[SubmissionResult])
def batch_sync_responses(batch: ResponseSyncBatch):
    """
    Offline/Low-connectivity synchronization endpoint.
    Receives a batch of queued responses that occurred offline and processes each with
    deduplication check against existing submission_ids.
    """
    conn = get_db_connection()
    results = []
    try:
        for item in batch.responses:
            res = process_submission_db(
                conn=conn,
                submission_id=item.submission_id,
                student_id=item.student_id,
                skill_id=item.skill_id,
                correct=item.correct,
                response_time_ms=item.response_time_ms,
                timestamp=item.timestamp,
                hint_used=item.hint_used,
                item_difficulty_b=item.item_difficulty_b,
                q_matrix_weights=item.q_matrix_weights
            )
            results.append(res)
        return results
    finally:
        conn.close()
