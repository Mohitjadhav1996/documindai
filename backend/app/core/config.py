from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "DocuMind AI"
    APP_ENV: str = "development"
    SECRET_KEY: str
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Database
    DATABASE_URL: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str

    # Redis
    REDIS_URL: str = "redis://redis:6379"

    # OpenAI (set via .env — never commit real keys)
    OPENAI_API_KEY: str = ""

    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    # Upload
    MAX_FILE_SIZE_MB: int = 20
    UPLOAD_DIR: str = "./uploads"
    ALLOWED_EXTENSIONS: str = "pdf,docx,txt,md"

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"

    @property
    def allowed_extensions_list(self) -> List[str]:
        return [e.strip() for e in self.ALLOWED_EXTENSIONS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
