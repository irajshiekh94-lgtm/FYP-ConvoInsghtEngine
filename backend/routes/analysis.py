"""
Chat analysis API — upload → process → get-results pipeline.
"""

import logging
import traceback
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException

from backend.schemas.analysis import (
    AnalysisResult,
    ApiError,
    JobResultResponse,
    JobStatusResponse,
    ProcessChatRequest,
    ProcessingStatus,
    UploadChatRequest,
)
from backend.services.job_store import job_store


def _get_pipeline_helpers():
    try:
        from backend.services.pipeline import flatten_summaries_for_legacy, run_analysis_pipeline
    except Exception as exc:
        logger.error("Analysis pipeline unavailable: %s", exc)
        raise HTTPException(status_code=503, detail="Analysis pipeline unavailable")

    return flatten_summaries_for_legacy, run_analysis_pipeline

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Chat Analysis"])


def _error_response(status_code: int, error: str, detail: str, job_id: Optional[str] = None):
    body = ApiError(
        error=error,
        detail=detail,
        status_code=status_code,
        job_id=job_id,
    ).model_dump()
    raise HTTPException(status_code=status_code, detail=body)


@router.post("/upload-chat", response_model=JobStatusResponse)
async def upload_chat(body: UploadChatRequest):
    """
    Step 1 — Store raw chat export. Returns job id with status ``uploaded``.
  Call ``POST /api/process-chat`` to run analysis.
    """
    if not body.rawText.strip():
        _error_response(400, "validation_error", "rawText is empty")

    job_id = job_store.create(
        raw_text=body.rawText,
        chat_name=body.chatName,
        current_user=body.currentUser,
    )
    logger.info("Upload job created: %s (%s)", job_id, body.chatName)

    return JobStatusResponse(
        id=job_id,
        status=ProcessingStatus.UPLOADED,
        chat_name=body.chatName,
    )


@router.post("/process-chat", response_model=JobResultResponse)
async def process_chat(body: ProcessChatRequest):
    """
    Step 2 — Run parse → cluster → summarize → classify → priorities → actions.
    """
    job = job_store.get(body.jobId)
    if not job:
        _error_response(404, "not_found", f"Job {body.jobId} not found", job_id=body.jobId)

    status = job.get("status")
    if status in (ProcessingStatus.DONE.value, ProcessingStatus.DONE) and job.get("result"):
        return _build_result_response(job)

    job_store.set_status(body.jobId, ProcessingStatus.PROCESSING)

    try:
        _, run_analysis_pipeline = _get_pipeline_helpers()
        result, meta = run_analysis_pipeline(
            raw_text=job["rawText"],
            chat_name=job["chatName"],
            current_user=job["currentUser"],
        )
        job_store.set_result(body.jobId, result, meta)
        job = job_store.get(body.jobId)
        return _build_result_response(job)

    except Exception as exc:
        logger.error("Process failed for %s: %s", body.jobId, exc)
        logger.error(traceback.format_exc())
        job_store.set_status(body.jobId, ProcessingStatus.FAILED, error=str(exc))
        return JobResultResponse(
            id=body.jobId,
            status=ProcessingStatus.FAILED,
            chat_name=job.get("chatName"),
            error=str(exc),
        )


@router.get("/get-results/{job_id}", response_model=JobResultResponse)
async def get_results(job_id: str):
    """
    Step 3 — Poll job status and canonical result payload when done.
    """
    job = job_store.get(job_id)
    if not job:
        _error_response(404, "not_found", f"Job {job_id} not found", job_id=job_id)

    return _build_result_response(job)


def _build_result_response(job: dict) -> JobResultResponse:
    status = job["status"]
    result: Optional[AnalysisResult] = job.get("result")
    meta = job.get("meta") or {}

    participants = meta.get("participants", [])
    message_count = meta.get("messageCount", 0)

    if isinstance(result, dict):
        result = AnalysisResult(**result)

    flatten_summaries_for_legacy, _ = _get_pipeline_helpers()

    return JobResultResponse(
        id=job["id"],
        status=status,
        chat_name=job.get("chatName") or meta.get("chatName"),
        participants=participants,
        message_count=message_count,
        result=result,
        error=job.get("error"),
        success=status in (ProcessingStatus.DONE.value, ProcessingStatus.DONE),
        chatId=job["id"],
        summaries=(
            flatten_summaries_for_legacy(meta.get("sender_summaries", {}))
            if meta.get("sender_summaries")
            else None
        ),
    )
