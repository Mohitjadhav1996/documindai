from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage, MessageRole
from app.models.document import Document
from app.schemas.documents import ChatSessionCreate, ChatSessionResponse, ChatMessageResponse, ChatRequest
from app.core.deps import get_current_user
from app.services.rag_service import rag_service
from typing import List
import json

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/sessions", response_model=ChatSessionResponse, status_code=201)
async def create_session(
    payload: ChatSessionCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.document_id:
        result = await db.execute(select(Document).where(Document.id == payload.document_id))
        doc = result.scalar_one_or_none()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        title = f"Chat: {doc.title}"
    else:
        title = payload.title

    session = ChatSession(
        title=title,
        user_id=current_user.id,
        document_id=payload.document_id,
        session_type=payload.session_type,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.get("/sessions", response_model=List[ChatSessionResponse])
async def list_sessions(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.created_at.desc())
    )
    return result.scalars().all()


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def get_messages(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ChatSession).where(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id,
    ))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    return result.scalars().all()


@router.post("/stream")
async def stream_chat(
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ChatSession).where(
        ChatSession.id == payload.session_id,
        ChatSession.user_id == current_user.id,
    ))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Save user message
    user_msg = ChatMessage(
        session_id=session.id,
        role=MessageRole.USER,
        content=payload.message,
    )
    db.add(user_msg)
    await db.commit()

    async def event_generator():
        full_response = ""
        sources = None
        async for chunk in rag_service.stream_rag_response(
            payload.message, session.document_id, db
        ):
            if chunk.startswith("__SOURCES__"):
                sources_raw = chunk.split("__SOURCES__")[1].split("__SOURCES_END__")[0]
                sources = sources_raw
                yield f"data: {json.dumps({'type': 'sources', 'data': sources_raw})}\n\n"
            else:
                full_response += chunk
                yield f"data: {json.dumps({'type': 'token', 'data': chunk})}\n\n"

        # Save assistant message
        ai_msg = ChatMessage(
            session_id=session.id,
            role=MessageRole.ASSISTANT,
            content=full_response,
            sources=sources,
        )
        db.add(ai_msg)
        await db.commit()
        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.delete("/sessions/{session_id}", status_code=204)
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(ChatSession).where(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id,
    ))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    await db.delete(session)
    await db.commit()
