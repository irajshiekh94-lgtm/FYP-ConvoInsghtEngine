"""
Mongo-backed job store for upload → process → get-results flow.
Requires MongoDB for all operations.
"""

import logging
import uuid
from datetime import datetime
from typing import Any, Dict, Optional

from backend.schemas.analysis import AnalysisResult, ProcessingStatus
from config.mongodb import mongodb
from pydantic import BaseModel
from pymongo.errors import PyMongoError

logger = logging.getLogger(__name__)


class JobStore:
    def __init__(self) -> None:
        self._collection = None
        self._in_memory = {}
        try:
            self._connect_to_mongo()
        except Exception:
            # MongoDB unavailable — fall back to an in-memory store so
            # the API remains functional for uploads and processing.
            logger.warning("MongoDB unavailable — using in-memory JobStore fallback")

    def _connect_to_mongo(self) -> None:
        db = mongodb.get_db()
        if db is None:
            raise RuntimeError("MongoDB returned no database")
        self._collection = db["analysis_jobs"]
        try:
            self._collection.create_index("id", unique=True)
        except Exception:
            # ignore index creation errors on some environments
            pass
        logger.info("✓ JobStore connected to MongoDB")

    def _serialize_result(self, result: AnalysisResult) -> Any:
        if isinstance(result, BaseModel):
            return result.model_dump()
        return result

    def _serialize_meta(self, meta: Dict[str, Any]) -> Dict[str, Any]:
        return {k: (v.model_dump() if isinstance(v, BaseModel) else v) for k, v in meta.items()}

    def create(
        self,
        raw_text: str,
        chat_name: str,
        current_user: str,
    ) -> str:
        job_id = str(uuid.uuid4())
        job_data = {
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

        try:
            if self._collection is not None:
                self._collection.insert_one(job_data)
            else:
                self._in_memory[job_id] = job_data
            return job_id
        except PyMongoError as exc:
            logger.error("❌ Failed to persist job to MongoDB: %s", exc)
            raise

    def get(self, job_id: str) -> Optional[Dict[str, Any]]:
        try:
            if self._collection is not None:
                job = self._collection.find_one({"id": job_id}, {"_id": 0})
                return job if job else None
            return self._in_memory.get(job_id)
        except PyMongoError as exc:
            logger.error("❌ MongoDB get failed: %s", exc)
            raise

    def set_status(
        self,
        job_id: str,
        status: ProcessingStatus,
        error: Optional[str] = None,
    ) -> bool:
        updated_at = datetime.utcnow().isoformat()
        status_value = status.value if isinstance(status, ProcessingStatus) else status

        try:
            update = {"status": status_value, "updatedAt": updated_at}
            if error is not None:
                update["error"] = error
            if self._collection is not None:
                result = self._collection.update_one(
                    {"id": job_id},
                    {"$set": update},
                )
                return result.matched_count == 1
            # in-memory update
            job = self._in_memory.get(job_id)
            if not job:
                return False
            job.update(update)
            self._in_memory[job_id] = job
            return True
        except PyMongoError as exc:
            logger.error("❌ MongoDB set_status failed: %s", exc)
            raise

    def set_result(
        self,
        job_id: str,
        result: AnalysisResult,
        meta: Dict[str, Any],
    ) -> bool:
        serialized_result = self._serialize_result(result)
        serialized_meta = self._serialize_meta(meta)
        updated_at = datetime.utcnow().isoformat()

        try:
            update = {
                "status": ProcessingStatus.DONE.value,
                "result": serialized_result,
                "meta": serialized_meta,
                "updatedAt": updated_at,
                "error": None,
            }
            if self._collection is not None:
                result_obj = self._collection.update_one(
                    {"id": job_id},
                    {"$set": update},
                )
                return result_obj.matched_count == 1
            # in-memory
            job = self._in_memory.get(job_id)
            if not job:
                return False
            job.update(update)
            job["result"] = serialized_result
            job["meta"] = serialized_meta
            self._in_memory[job_id] = job
            return True
        except PyMongoError as exc:
            logger.error("❌ MongoDB set_result failed: %s", exc)
            raise


job_store = JobStore()
