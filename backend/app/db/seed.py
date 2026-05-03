import asyncio
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from app.models.user import User, UserRole
from app.models.document import Document
from app.models.chunk import DocumentChunk
from app.models.chat import ChatSession, ChatMessage
from app.core.security import hash_password
from app.core.config import settings
from sqlalchemy import select
import logging

logger = logging.getLogger(__name__)

db_url = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
engine = create_async_engine(db_url, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def create_tables():
    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        from app.db.session import Base
        await conn.run_sync(Base.metadata.create_all)
    logger.info("✅ Tables created.")


async def seed_users():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == "admin@documind.ai"))
        if result.scalar_one_or_none():
            logger.info("DB already seeded, skipping.")
            return

        users = [
            User(
                name="Admin User",
                email="admin@documind.ai",
                hashed_password=hash_password("Admin@123"),
                role=UserRole.ADMIN,
            ),
            User(
                name="Manager User",
                email="manager@documind.ai",
                hashed_password=hash_password("Manager@123"),
                role=UserRole.MANAGER,
            ),
            User(
                name="Regular User",
                email="user@documind.ai",
                hashed_password=hash_password("User@123"),
                role=UserRole.USER,
            ),
        ]
        db.add_all(users)
        await db.commit()
        logger.info("✅ Seeded default users.")


async def main():
    await create_tables()
    await seed_users()


if __name__ == "__main__":
    asyncio.run(main())
