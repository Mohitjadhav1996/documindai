import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.api.v1 import api_router
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models.document import Document, DocumentStatus
from app.services.rag_service import rag_service
from sqlalchemy import select
import os

app = FastAPI(
    title="DocuMind AI",
    description="AI-powered document intelligence platform",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Routes
app.include_router(api_router)


@app.on_event("startup")
async def resume_incomplete_documents():
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Document.id).where(
                Document.status.in_([DocumentStatus.PENDING, DocumentStatus.PROCESSING])
            )
        )
        doc_ids = [row[0] for row in result.all()]

    for doc_id in doc_ids:
        asyncio.create_task(rag_service.process_document(doc_id))


@app.get("/health")
async def health():
    return {"status": "ok", "app": settings.APP_NAME}
