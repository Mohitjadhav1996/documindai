# Copy fixed agent service
from typing import AsyncGenerator
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_community.tools import DuckDuckGoSearchRun
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.document import Document, DocumentStatus
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


class AgentService:
    def __init__(self):
        self.enabled = bool(settings.OPENAI_API_KEY)
        if self.enabled:
            self.llm = ChatOpenAI(
                model=settings.OPENAI_MODEL,
                openai_api_key=settings.OPENAI_API_KEY,
                temperature=0.4,
                max_retries=1,
            )
        else:
            self.llm = None

    async def _search_web(self, query: str) -> str:
        try:
            tool = DuckDuckGoSearchRun()
            return tool.run(query[:200])
        except Exception as e:
            return f"Search failed: {str(e)}"

    async def _list_documents(self, db: AsyncSession, user_id: int) -> str:
        try:
            result = await db.execute(
                select(Document).where(
                    Document.owner_id == user_id,
                    Document.status == DocumentStatus.READY,
                )
            )
            docs = result.scalars().all()
            if not docs:
                return "No documents available."
            return "\n".join([f"ID:{d.id} | {d.title} ({d.file_type})" for d in docs])
        except Exception as e:
            return f"Error: {str(e)}"

    async def _query_document(self, doc_id: int, question: str, db: AsyncSession) -> str:
        try:
            from app.services.rag_service import rag_service
            chunks = await rag_service.retrieve_chunks(question, doc_id, db, top_k=3)
            if not chunks:
                return "No relevant content found."
            return "\n\n".join([f"[Chunk {c.chunk_index}]: {c.content}" for c, _ in chunks])
        except Exception as e:
            return f"Error: {str(e)}"

    async def stream_agent_response(
        self, query: str, db: AsyncSession, user_id: int
    ) -> AsyncGenerator[str, None]:
        if not self.enabled:
            yield "OpenAI is not configured. Set OPENAI_API_KEY in backend .env."
            return
        query_lower = query.lower()
        needs_web = any(w in query_lower for w in [
            "search", "web", "latest", "news", "current", "today", "recent",
        ])
        needs_docs = any(w in query_lower for w in [
            "document", "file", "upload", "my doc", "summarize my",
            "what do i have", "list", "across all",
        ])

        context_parts = []

        if needs_web:
            yield "🔍 **Searching the web...**\n\n"
            search_q = query.replace("search the web for", "").replace("search for", "").strip()
            web_result = await self._search_web(search_q)
            context_parts.append(f"## Web Search Results:\n{web_result[:2000]}")
            yield "✅ **Web search complete**\n\n"

        if needs_docs:
            yield "📂 **Checking your documents...**\n\n"
            doc_list = await self._list_documents(db, user_id)
            context_parts.append(f"## Your Documents:\n{doc_list}")
            result = await db.execute(
                select(Document).where(
                    Document.owner_id == user_id,
                    Document.status == DocumentStatus.READY,
                ).limit(3)
            )
            docs = result.scalars().all()
            for doc in docs:
                content = await self._query_document(doc.id, query, db)
                context_parts.append(f"## From '{doc.title}':\n{content[:1000]}")
            yield "✅ **Document search complete**\n\n"

        if not needs_web and not needs_docs:
            yield "🔍 **Researching your question...**\n\n"
            web_result = await self._search_web(query)
            context_parts.append(f"## Research Results:\n{web_result[:2000]}")
            yield "✅ **Research complete**\n\n"

        yield "🧠 **Generating answer...**\n\n"
        context = "\n\n---\n\n".join(context_parts) if context_parts else "No additional context."

        system_prompt = f"""You are DocuMind Agent, an intelligent AI research assistant.
Use the gathered context below to answer the user query accurately.
Format with markdown — headers, bullets, bold where helpful.

## Context:
{context}"""

        try:
            async for chunk in self.llm.astream([
                SystemMessage(content=system_prompt),
                HumanMessage(content=query),
            ]):
                if chunk.content:
                    yield chunk.content
        except Exception as e:
            logger.error(f"LLM stream error: {e}")
            yield f"\n\nError: {str(e)}"


agent_service = AgentService()
