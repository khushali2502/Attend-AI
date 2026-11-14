from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/attendai"
    SECRET_KEY: str = "45cb7d189c445ee6c17e1329a1bcf9ceb002c918efbfa9b247f0f4a861d85834"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30
    ENVIRONMENT: str = "development"
    PROJECT_NAME: str = "Krishi Swar - Farmer Voice AI Assistant"

    # AI & RAG Configuration
    GEMINI_API_KEY: Optional[str] = None
    PINECONE_API_KEY: Optional[str] = None
    PINECONE_INDEX_NAME: str = "krishi-swar-kb"
    REDIS_URL: Optional[str] = None

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
