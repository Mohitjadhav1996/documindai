import os
import json
from typing import List, Tuple, AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, text
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_core.messages import HumanMessage, SystemMessage
from pypdf import PdfReader
from docx import Document as DocxDocument
from app.models.document import Document, DocumentStatus
from app.models.chunk import DocumentChunk
from app.core.config import settings
from app.db.session import AsyncSessionLocal
import logging

logger = logging.getLogger(__name__)


class RAGService:
    def __init__(self):
        self.enabled = bool(settings.OPENAI_API_KEY)
        if self.enabled:
            self.embeddings = OpenAIEmbeddings(
                model=settings.OPENAI_EMBEDDING_MODEL,
                openai_api_key=settings.OPENAI_API_KEY,
                dimensions=768,
            )
            self.llm = ChatOpenAI(
                model=settings.OPENAI_MODEL,
                openai_api_key=settings.OPENAI_API_KEY,
                temperature=0.3,
                max_retries=1,
            )
        else:
            self.embeddings = None
            self.llm = None
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000, chunk_overlap=200
        )

    def _extract_text(self, file_path: str, file_type: str) -> str:
        if file_type == "pdf":
            reader = PdfReader(file_path)
            return "\n".join(page.extract_text() or "" for page in reader.pages)
        elif file_type == "docx":
            doc = DocxDocument(file_path)
            return "\n".join(p.text for p in doc.paragraphs)
        elif file_type in ("txt", "md"):
            with open(file_path, "r", encoding="utf-8") as f:
                return f.read()
        return ""

    async def process_document(self, document_id: int) -> None:
        if not self.enabled:
            logger.error("OpenAI is not configured. Set OPENAI_API_KEY in .env.")
            async with AsyncSessionLocal() as db:
                await db.execute(
                    update(Document).where(Document.id == document_id)
                    .values(status=DocumentStatus.FAILED, total_chunks=0)
                )
                await db.commit()
            return

        file_path = None
        file_type = None
        chunks: List[str] = []

        try:
            # Phase 1: quick DB access only (do not hold DB session during network calls).
            async with AsyncSessionLocal() as db:
                result = await db.execute(select(Document).where(Document.id == document_id))
                doc = result.scalar_one_or_none()
                if not doc:
                    return

                file_path = doc.file_path
                file_type = doc.file_type

                await db.execute(
                    update(Document).where(Document.id == document_id)
                    .values(status=DocumentStatus.PROCESSING)
                )
                await db.commit()

            # Phase 2: external/CPU-heavy work without occupying DB connection.
            text = self._extract_text(file_path, file_type)
            chunks = self.splitter.split_text(text)

            # Skip summary generation to keep ingestion fast/reliable when LLM quota is exhausted.
            summary = None

            # Phase 3: write results.
            async with AsyncSessionLocal() as db:
                for idx, chunk_text in enumerate(chunks):
                    embedding = self.embeddings.embed_query(chunk_text)
                    chunk = DocumentChunk(
                        document_id=document_id,
                        content=chunk_text,
                        chunk_index=idx,
                        embedding=embedding,
                    )
                    db.add(chunk)

                await db.execute(
                    update(Document).where(Document.id == document_id)
                    .values(
                        status=DocumentStatus.READY,
                        summary=summary,
                        total_chunks=len(chunks),
                    )
                )
                await db.commit()

            logger.info(f"Processed document {document_id}: {len(chunks)} chunks")

        except Exception as e:
            logger.error(f"Error processing document {document_id}: {e}")
            async with AsyncSessionLocal() as db:
                await db.execute(
                    update(Document).where(Document.id == document_id)
                    .values(status=DocumentStatus.FAILED, total_chunks=0)
                )
                await db.commit()

    async def retrieve_chunks(
        self, query: str, document_id: int, db: AsyncSession, top_k: int = 5
    ) -> List[Tuple[DocumentChunk, float]]:
        if not self.enabled:
            return []
        query_embedding = self.embeddings.embed_query(query)
        embedding_str = f"[{','.join(map(str, query_embedding))}]"

        result = await db.execute(
            text("""
                SELECT dc.*, 1 - (dc.embedding <=> :embedding::vector) AS score
                FROM document_chunks dc
                WHERE dc.document_id = :doc_id
                ORDER BY dc.embedding <=> :embedding::vector
                LIMIT :top_k
            """),
            {"embedding": embedding_str, "doc_id": document_id, "top_k": top_k},
        )
        rows = result.fetchall()
        chunks = []
        for row in rows:
            chunk = DocumentChunk(
                id=row.id,
                document_id=row.document_id,
                content=row.content,
                chunk_index=row.chunk_index,
            )
            chunks.append((chunk, float(row.score)))
        return chunks

    async def stream_rag_response(
        self, query: str, document_id: int, db: AsyncSession
    ) -> AsyncGenerator[str, None]:
        if not self.enabled:
            yield "OpenAI is not configured. Ask admin to set OPENAI_API_KEY."
            return
        result = await db.execute(select(Document).where(Document.id == document_id))
        doc = result.scalar_one_or_none()
        if not doc or doc.status != DocumentStatus.READY:
            yield "Document is not ready for querying."
            return

        chunks = await self.retrieve_chunks(query, document_id, db)
        context = "\n\n---\n\n".join([f"[Chunk {c.chunk_index}]: {c.content}" for c, _ in chunks])

        system_prompt = f"""You are DocuMind, an intelligent document assistant.
Answer questions based ONLY on the provided document context.
If the answer is not in the context, say so clearly.
Be concise, accurate, and helpful.

Document: {doc.title}

Context:
{context}"""

        sources = json.dumps([
            {"content": c.content[:200], "chunk_index": c.chunk_index, "score": round(s, 3)}
            for c, s in chunks
        ])
        yield f"__SOURCES__{sources}__SOURCES_END__"

        async for chunk in self.llm.astream([
            SystemMessage(content=system_prompt),
            HumanMessage(content=query)
        ]):
            if chunk.content:
                yield chunk.content


rag_service = RAGService()
