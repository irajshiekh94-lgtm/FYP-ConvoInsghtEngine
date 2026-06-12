"""
Chat analysis API — upload → process → get-results pipeline.
"""

import logging
import traceback
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, HTTPException

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


def _run_pipeline_job(job_id: str) -> None:
    """Background worker — runs the full analysis pipeline for one job."""
    job = job_store.get(job_id)
    if not job:
        logger.error("Background pipeline: job %s not found", job_id)
        return

    try:
        _, run_analysis_pipeline = _get_pipeline_helpers()
        logger.info("Background pipeline started for job %s", job_id)
        result, meta = run_analysis_pipeline(
            raw_text=job["rawText"],
            chat_name=job["chatName"],
            current_user=job["currentUser"],
        )
        job_store.set_result(job_id, result, meta)
        _persist_messages_to_mongo(job_id, job, result, meta)
        logger.info("Background pipeline completed for job %s", job_id)
    except Exception as exc:
        logger.error("Process failed for %s: %s", job_id, exc)
        logger.error(traceback.format_exc())
        job_store.set_status(job_id, ProcessingStatus.FAILED, error=str(exc))


@router.post("/process-chat", response_model=JobResultResponse)
async def process_chat(body: ProcessChatRequest, background_tasks: BackgroundTasks):
    """
    Step 2 — Start parse → cluster → summarize → classify → priorities → actions.

    Returns immediately with status ``processing``. Poll ``GET /api/get-results/{id}``.
    """
    job = job_store.get(body.jobId)
    if not job:
        _error_response(404, "not_found", f"Job {body.jobId} not found", job_id=body.jobId)

    status = job.get("status")
    if status in (ProcessingStatus.DONE.value, ProcessingStatus.DONE) and job.get("result"):
        return _build_result_response(job)

    if status in (ProcessingStatus.PROCESSING.value, ProcessingStatus.PROCESSING):
        return _build_result_response(job)

    job_store.set_status(body.jobId, ProcessingStatus.PROCESSING)
    background_tasks.add_task(_run_pipeline_job, body.jobId)
    job = job_store.get(body.jobId)
    return _build_result_response(job)


@router.get("/get-results/{job_id}", response_model=JobResultResponse)
async def get_results(job_id: str):
    """
    Step 3 — Poll job status and canonical result payload when done.
    """
    job = job_store.get(job_id)
    if not job:
        _error_response(404, "not_found", f"Job {job_id} not found", job_id=job_id)

    return _build_result_response(job)


def _persist_messages_to_mongo(job_id: str, job: dict, result, meta: dict) -> None:
    """Store parsed messages in MongoDB for 24-hour summarization."""
    try:
        from backend.services.message_repository import message_repository

        if not message_repository.available:
            return
        messages = [
            m.model_dump() if hasattr(m, "model_dump") else m
            for m in (result.messages if hasattr(result, "messages") else [])
        ]
        message_repository.persist_pipeline_result(
            chat_id=job_id,
            chat_name=job.get("chatName") or meta.get("chatName", ""),
            chat_type=meta.get("chatType", "individual"),
            participants=meta.get("participants", []),
            current_user=job.get("currentUser", "Me"),
            pipeline_messages=messages,
        )
        logger.info("Persisted %d messages for job %s", len(messages), job_id)
    except Exception as exc:
        logger.warning("Could not persist messages for job %s: %s", job_id, exc)


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
