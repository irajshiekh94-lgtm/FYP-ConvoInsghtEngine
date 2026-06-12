"""
Summary API routes — Llama test, message storage, and 24-hour executive summaries.
"""

import logging

from fastapi import APIRouter

from backend.controllers.summary_controller import summary_controller
from backend.schemas.summary import (
    LlamaTestResponse,
    StoreMessagesRequest,
    StoreMessagesResponse,
    SummarizeRequest,
    SummarizeResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["Summarization"])


@router.get("/llama/test", response_model=LlamaTestResponse)
async def test_llama():
    """Verify Meta Llama connectivity (Ollama local or Groq/Together cloud)."""
    return summary_controller.test_llama()


@router.get("/gemini/test", response_model=LlamaTestResponse, deprecated=True)
async def test_gemini_legacy():
    """Deprecated — use GET /api/llama/test. Now runs Llama instead of Gemini."""
    return summary_controller.test_llama()


@router.post("/messages/", response_model=StoreMessagesResponse)
async def store_messages(body: StoreMessagesRequest):
    """Store WhatsApp messages in MongoDB for later summarization."""
    return summary_controller.store_messages(body.messages)


@router.post("/summarize/", response_model=SummarizeResponse)
async def summarize_chat(body: SummarizeRequest):
    """
    Generate an executive-style summary of the last 24 hours of chat activity.

    Fetches messages from MongoDB, sorts chronologically, and sends them to Meta Llama.
    """
    return summary_controller.summarize(body)
