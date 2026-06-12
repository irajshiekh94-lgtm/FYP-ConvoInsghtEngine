"""
Centralized API error handling for FastAPI.
"""

import logging
import traceback

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


def register_error_handlers(app: FastAPI) -> None:
    """Attach global exception handlers to the FastAPI application."""

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException):
        logger.error("HTTP %s %s: %s", request.method, request.url.path, exc.detail)
        if isinstance(exc.detail, dict) and "error" in exc.detail:
            payload = {**exc.detail, "status_code": exc.status_code}
        else:
            payload = {
                "success": False,
                "error": "request_failed",
                "detail": str(exc.detail),
                "status_code": exc.status_code,
            }
        return JSONResponse(status_code=exc.status_code, content=payload)

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        logger.error(
            "Unhandled exception on %s %s: %s",
            request.method,
            request.url.path,
            exc,
        )
        logger.error(traceback.format_exc())
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "internal_server_error",
                "detail": str(exc),
                "status_code": 500,
            },
        )
