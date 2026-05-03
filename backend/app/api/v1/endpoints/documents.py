import os, uuid, aiofiles
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, text
from app.db.session import get_db
from app.models.document import Document, DocumentStatus
from app.models.user import User, UserRole
from app.schemas.documents import DocumentResponse
from app.core.deps import get_current_user
from app.core.config import settings
from app.services.rag_service import rag_service
from typing import List

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("/", response_model=List[DocumentResponse])
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Guard against indefinitely stuck jobs (e.g. provider quota/network failures).
    await db.execute(
        update(Document)
        .where(
            Document.status == DocumentStatus.PROCESSING,
            Document.total_chunks == 0,
            Document.created_at < text("NOW() - INTERVAL '15 minutes'"),
        )
        .values(status=DocumentStatus.FAILED)
    )
    await db.commit()

    if current_user.role == UserRole.ADMIN:
        result = await db.execute(select(Document).order_by(Document.created_at.desc()))
    else:
        result = await db.execute(
            select(Document)
            .where(Document.owner_id == current_user.id)
            .order_by(Document.created_at.desc())
        )
    return result.scalars().all()


@router.post("/upload", response_model=DocumentResponse, status_code=201)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in settings.allowed_extensions_list:
        raise HTTPException(status_code=400, detail=f"File type .{ext} not allowed")

    file_size = 0
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    file_path = os.path.join(settings.UPLOAD_DIR, unique_name)

    async with aiofiles.open(file_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            file_size += len(chunk)
            if file_size > settings.MAX_FILE_SIZE_MB * 1024 * 1024:
                os.remove(file_path)
                raise HTTPException(status_code=413, detail="File too large")
            await f.write(chunk)

    doc = Document(
        title=file.filename.rsplit(".", 1)[0],
        filename=file.filename,
        file_path=file_path,
        file_type=ext,
        file_size=file_size,
        owner_id=current_user.id,
        status=DocumentStatus.PENDING,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    background_tasks.add_task(rag_service.process_document, doc.id)
    return doc


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
    return doc


@router.delete("/{doc_id}", status_code=204)
async def delete_document(
    doc_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.owner_id != current_user.id and current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Access denied")
    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)
    await db.delete(doc)
    await db.commit()
