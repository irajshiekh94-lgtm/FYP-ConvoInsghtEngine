"""
Standard analysis output schemas for ConvoInsight pipeline.
"""

from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class ProcessingStatus(str, Enum):
    UPLOADED = "uploaded"
    PROCESSING = "processing"
    DONE = "done"
    FAILED = "failed"


class MessageOut(BaseModel):
    sender: str
    content: str
    timestamp: Optional[str] = None
    messageType: str = "text"
    rawTimestamp: Optional[str] = None


class PriorityItem(BaseModel):
    sender: str
    text: str
    intent: str = "other"
    cluster_id: Optional[int] = None
    message_count: int = 0


class PrioritiesOut(BaseModel):
    urgent: List[PriorityItem] = Field(default_factory=list)
    moderate: List[PriorityItem] = Field(default_factory=list)
    low: List[PriorityItem] = Field(default_factory=list)


class ActionItem(BaseModel):
    id: str
    type: str  # task | follow-up | reminder
    description: str
    sender: str
    urgency: str = "medium"  # high | medium | low
    source_summary: Optional[str] = None


class ConversationSummaryOut(BaseModel):
    """Structured summary — built from cluster topics, not raw chat lines."""

    themes: List[str] = Field(default_factory=list)
    key_decisions: List[str] = Field(default_factory=list)
    important_messages: List[str] = Field(default_factory=list)
    overview: str = ""


class EntityOut(BaseModel):
    text: str
    type: str
    count: int = 1


class TopicOut(BaseModel):
    id: int
    title: str
    senders: List[str] = Field(default_factory=list)
    message_count: int = 0
    keywords: List[str] = Field(default_factory=list)


class SentimentOut(BaseModel):
    label: str = "neutral"
    score: float = 0.0
    positive_count: int = 0
    negative_count: int = 0
    neutral_count: int = 0


class AnalyticsOut(BaseModel):
    total_messages: int = 0
    total_participants: int = 0
    messages_by_sender: Dict[str, int] = Field(default_factory=dict)
    action_count: int = 0
    urgent_count: int = 0
    topic_count: int = 0
    entity_count: int = 0


class MetadataOut(BaseModel):
    chat_name: str = ""
    chat_type: str = "individual"
    participants: List[str] = Field(default_factory=list)
    current_user: str = "Me"
    processed_at: str = ""
    pipeline_version: str = "2.1"


class AnalysisResult(BaseModel):
    """Canonical pipeline output — always this shape when status is done."""

    messages: List[MessageOut] = Field(default_factory=list)
    summary: str = ""
    conversation_summary: ConversationSummaryOut = Field(
        default_factory=ConversationSummaryOut
    )
    priorities: PrioritiesOut = Field(default_factory=PrioritiesOut)
    actions: List[ActionItem] = Field(default_factory=list)
    entities: List[EntityOut] = Field(default_factory=list)
    topics: List[TopicOut] = Field(default_factory=list)
    sentiment: SentimentOut = Field(default_factory=SentimentOut)
    analytics: AnalyticsOut = Field(default_factory=AnalyticsOut)
    metadata: MetadataOut = Field(default_factory=MetadataOut)


class ApiError(BaseModel):
    error: str
    detail: str
    status_code: int = 500
    job_id: Optional[str] = None


class JobStatusResponse(BaseModel):
    id: str
    status: ProcessingStatus
    chat_name: Optional[str] = None
    error: Optional[str] = None


class JobResultResponse(BaseModel):
    id: str
    status: ProcessingStatus
    chat_name: Optional[str] = None
    participants: List[str] = Field(default_factory=list)
    message_count: int = 0
    result: Optional[AnalysisResult] = None
    error: Optional[str] = None

    # Legacy fields for /api/chats/upload compatibility
    success: Optional[bool] = None
    chatId: Optional[str] = None
    summaries: Optional[List[Dict[str, Any]]] = None


class UploadChatRequest(BaseModel):
    rawText: str
    currentUser: str = "Me"
    chatName: str = "Untitled Chat"


# Alias for legacy /api/chats/upload
ChatUploadRequest = UploadChatRequest


class SummaryItem(BaseModel):
    sender: str
    summary: str
    intent: str
    cluster_id: Optional[int] = None
    message_count: Optional[int] = None


class ParsedMessageItem(BaseModel):
    sender: str
    content: str
    timestamp: Optional[str] = None
    messageType: Optional[str] = "text"
    rawTimestamp: Optional[str] = None


class ChatUploadResponse(BaseModel):
    success: bool
    status: str = "done"
    chatId: Optional[str] = None
    summaries: Optional[List[SummaryItem]] = None
    participants: Optional[List[str]] = None
    messageCount: Optional[int] = None
    messages: Optional[List[ParsedMessageItem]] = None
    summary: Optional[str] = None
    priorities: Optional[PrioritiesOut] = None
    actions: Optional[List[ActionItem]] = None
    error: Optional[str] = None


class ProcessChatRequest(BaseModel):
    jobId: str
