from pydantic import BaseModel
from app.models.document import DocumentStatus
from app.models.chat import MessageRole
from datetime import datetime
from typing import Optional, List


# Document schemas
class DocumentResponse(BaseModel):
    id: int
    title: str
    filename: str
    file_type: str
    file_size: int
    status: DocumentStatus
    summary: Optional[str] = None
    total_chunks: int
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# Chat schemas
class ChatSessionCreate(BaseModel):
    document_id: Optional[int] = None
    session_type: str = "rag"
    title: str = "New Chat"


class ChatSessionResponse(BaseModel):
    id: int
    title: str
    document_id: Optional[int] = None
    session_type: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatMessageResponse(BaseModel):
    id: int
    role: MessageRole
    content: str
    sources: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatRequest(BaseModel):
    session_id: int
    message: str


# Agent schemas
class AgentRequest(BaseModel):
    query: str
    session_id: Optional[int] = None


class SourceChunk(BaseModel):
    content: str
    document_title: str
    chunk_index: int
    relevance_score: float
