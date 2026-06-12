"""
Request/response schemas for the 24-hour executive summarization API.
"""

from typing import List, Literal, Optional

from pydantic import BaseModel, Field


class StoreMessageItem(BaseModel):
    senderName: str
    messageText: str
    timestamp: str
    chatId: str
    chatType: str = "individual"


class StoreMessagesRequest(BaseModel):
    messages: List[StoreMessageItem]


class StoreMessagesResponse(BaseModel):
    success: bool
    inserted: int = 0
    error: Optional[str] = None


class SummarizeMessageItem(BaseModel):
    senderName: str
    messageText: str
    timestamp: str


class SummarizeRequest(BaseModel):
    chatId: str = Field(..., min_length=1, description="MongoDB chat or job id")
    chatType: Optional[str] = Field(
        None, description="Override chat type: individual or group"
    )
    messages: Optional[List[SummarizeMessageItem]] = Field(
        None,
        description="Optional client-side messages when MongoDB has none (most recent first or any order)",
    )
    maxMessages: Optional[int] = Field(
        None, ge=1, le=500, description="Cap for recent-message fallback"
    )


class SummaryInsights(BaseModel):
    keyDecisions: List[str] = Field(default_factory=list)
    assignedTasks: List[str] = Field(default_factory=list)
    pendingActions: List[str] = Field(default_factory=list)
    blockers: List[str] = Field(default_factory=list)
    peopleMentioned: List[str] = Field(default_factory=list)
    sentiment: Literal["Positive", "Neutral", "Negative"] = "Neutral"


class SummarizeResponse(BaseModel):
    success: bool
    summary: str = ""
    insights: Optional[SummaryInsights] = None
    messageCount: int = 0
    period: Optional[Literal["24h", "conversation_tail", "recent", "client"]] = None
    error: Optional[str] = None


class LlamaTestResponse(BaseModel):
    success: bool
    status: str
    message: str
    model: Optional[str] = None
    provider: Optional[str] = None
    sample_response: Optional[str] = None


# Backward-compatible alias
GeminiTestResponse = LlamaTestResponse
