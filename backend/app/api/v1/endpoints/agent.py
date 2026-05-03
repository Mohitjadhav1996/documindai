# Copy fixed agent endpoint
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.models.user import User
from app.models.chat import ChatSession, ChatMessage, MessageRole
from app.schemas.documents import AgentRequest
from app.core.deps import get_current_user
from app.services.agent_service import agent_service
import json
import asyncio
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/stream")
async def stream_agent(
    payload: AgentRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session_id = payload.session_id
    try:
        if session_id:
            existing = await db.get(ChatSession, session_id)
            if not existing or existing.user_id != current_user.id:
                session_id = None
        if not session_id:
            session = ChatSession(
                title=f"Agent: {payload.query[:40]}",
                user_id=current_user.id,
                session_type="agent",
            )
            db.add(session)
            await db.commit()
            await db.refresh(session)
            session_id = session.id

        user_msg = ChatMessage(
            session_id=session_id,
            role=MessageRole.USER,
            content=payload.query,
        )
        db.add(user_msg)
        await db.commit()
    except Exception as e:
        logger.error(f"Agent session setup error: {e}")
        async def setup_error_stream():
            yield f"data: {json.dumps({'type': 'token', 'data': 'Unable to initialize agent session. Please try again.'})}\n\n"
            yield f"data: {json.dumps({'type': 'done'})}\n\n"
        return StreamingResponse(setup_error_stream(), media_type="text/event-stream")

    async def event_generator():
        full_response = ""
        try:
            yield f"data: {json.dumps({'type': 'session_id', 'data': session_id})}\n\n"
            async for chunk in agent_service.stream_agent_response(
                payload.query, db, current_user.id
            ):
                full_response += chunk
                yield f"data: {json.dumps({'type': 'token', 'data': chunk})}\n\n"
                await asyncio.sleep(0)
        except Exception as e:
            logger.error(f"Agent stream error: {e}")
            yield f"data: {json.dumps({'type': 'token', 'data': str(e)})}\n\n"
        finally:
            try:
                if full_response:
                    ai_msg = ChatMessage(
                        session_id=session_id,
                        role=MessageRole.ASSISTANT,
                        content=full_response,
                    )
                    db.add(ai_msg)
                    await db.commit()
            except Exception:
                pass
            yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        },
    )