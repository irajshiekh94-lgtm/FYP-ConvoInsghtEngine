"""
In-memory job store for upload → process → get-results flow.
Replace with Redis/MongoDB when scaling.
"""

import threading
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from backend.schemas.analysis import AnalysisResult, ProcessingStatus


class JobStore:
    def __init__(self) -> None:
        self._jobs: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()

    def create(
        self,
        raw_text: str,
        chat_name: str,
        current_user: str,
    ) -> str:
        job_id = str(uuid.uuid4())
        with self._lock:
            self._jobs[job_id] = {
                "id": job_id,
                "status": ProcessingStatus.UPLOADED.value,
                "rawText": raw_text,
                "chatName": chat_name,
                "currentUser": current_user,
                "createdAt": datetime.utcnow().isoformat(),
                "updatedAt": datetime.utcnow().isoformat(),
                "result": None,
                "meta": None,
                "error": None,
            }
        return job_id

    def get(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self._lock:
            job = self._jobs.get(job_id)
            return dict(job) if job else None

    def set_status(
        self,
        job_id: str,
        status: ProcessingStatus,
        error: Optional[str] = None,
    ) -> bool:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return False
            job["status"] = status.value if isinstance(status, ProcessingStatus) else status
            job["updatedAt"] = datetime.utcnow().isoformat()
            if error is not None:
                job["error"] = error
            return True

    def set_result(
        self,
        job_id: str,
        result: AnalysisResult,
        meta: Dict[str, Any],
    ) -> bool:
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return False
            job["status"] = ProcessingStatus.DONE.value
            job["result"] = result
            job["meta"] = meta
            job["updatedAt"] = datetime.utcnow().isoformat()
            job["error"] = None
            return True


job_store = JobStore()
