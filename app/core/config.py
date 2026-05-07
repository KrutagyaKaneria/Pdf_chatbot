from functools import lru_cache
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel, Field, field_validator


ROOT_DIR = Path(__file__).resolve().parents[2]
APP_DIR = Path(__file__).resolve().parents[1]
ENV_FILE = APP_DIR / ".env"

load_dotenv(ENV_FILE)


class Settings(BaseModel):
    app_name: str = "Dynamic PDF RAG API"
    environment: str = "development"
    cors_origins: list[str] = Field(default_factory=lambda: ["*"])

    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"
    llm_temperature: float = 0.2
    llm_max_tokens: int = 512

    redis_url: str = "redis://127.0.0.1:6379/0"
    cache_enabled: bool = True
    cache_default_ttl_seconds: int = 300
    cache_embeddings_ttl_seconds: int = 60 * 60 * 24 * 30
    cache_retrieval_ttl_seconds: int = 120
    cache_answer_ttl_seconds: int = 60
    cache_memory_ttl_seconds: int = 60

    database_url: str = "postgresql+psycopg://postgres:postgres@127.0.0.1:5433/postgres"
    upload_dir: Path = APP_DIR / "uploads"
    max_upload_size_mb: int = 25

    embedding_model: str = "all-MiniLM-L6-v2"
    embeddings_local_only: bool = True
    chunk_size: int = 750
    chunk_overlap: int = 120

    retriever_k: int = 5
    retriever_fetch_k: int = 20
    retriever_lambda_mult: float = 0.7
    history_message_limit: int = 6
    history_token_budget: int = 1200

    memory_summary_max_tokens: int = 256
    memory_summarize_min_messages: int = 6

    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_timeout: int = 30

    log_level: str = "INFO"

    @field_validator("upload_dir", mode="before")
    @classmethod
    def resolve_upload_dir(cls, value: str | Path) -> Path:
        path = Path(value)
        if not path.is_absolute():
            path = APP_DIR / path
        return path

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024

    def validate_runtime(self) -> None:
        missing = []
        if not self.groq_api_key:
            missing.append("GROQ_API_KEY")
        if not self.database_url:
            missing.append("DATABASE_URL or PGVECTOR_CONNECTION_STRING")
        if missing:
            raise ValueError(f"Missing required environment variables: {', '.join(missing)}")


@lru_cache
def get_settings() -> Settings:
    import os

    cors_origins = os.getenv("CORS_ORIGINS", "*")
    settings = Settings(
        app_name=os.getenv("APP_NAME", "Dynamic PDF RAG API"),
        environment=os.getenv("ENVIRONMENT", "development"),
        cors_origins=[origin.strip() for origin in cors_origins.split(",") if origin.strip()],
        groq_api_key=os.getenv("GROQ_API_KEY", ""),
        groq_model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        llm_temperature=float(os.getenv("LLM_TEMPERATURE", "0.2")),
        llm_max_tokens=int(os.getenv("LLM_MAX_TOKENS", "512")),
        redis_url=os.getenv("REDIS_URL", "redis://127.0.0.1:6379/0"),
        cache_enabled=os.getenv("CACHE_ENABLED", "true").lower() == "true",
        cache_default_ttl_seconds=int(os.getenv("CACHE_DEFAULT_TTL_SECONDS", "300")),
        cache_embeddings_ttl_seconds=int(os.getenv("CACHE_EMBEDDINGS_TTL_SECONDS", str(60 * 60 * 24 * 30))),
        cache_retrieval_ttl_seconds=int(os.getenv("CACHE_RETRIEVAL_TTL_SECONDS", "120")),
        cache_answer_ttl_seconds=int(os.getenv("CACHE_ANSWER_TTL_SECONDS", "60")),
        cache_memory_ttl_seconds=int(os.getenv("CACHE_MEMORY_TTL_SECONDS", "60")),
        database_url=os.getenv(
            "DATABASE_URL",
            os.getenv(
                "PGVECTOR_CONNECTION_STRING",
                "postgresql+psycopg://postgres:postgres@127.0.0.1:5433/postgres",
            ),
        ),
        upload_dir=os.getenv("UPLOAD_DIR", "uploads"),
        max_upload_size_mb=int(os.getenv("MAX_UPLOAD_SIZE_MB", "25")),
        embedding_model=os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2"),
        embeddings_local_only=os.getenv("EMBEDDINGS_LOCAL_ONLY", "true").lower() == "true",
        chunk_size=int(os.getenv("CHUNK_SIZE", "750")),
        chunk_overlap=int(os.getenv("CHUNK_OVERLAP", "120")),
        retriever_k=int(os.getenv("RETRIEVER_K", "5")),
        retriever_fetch_k=int(os.getenv("RETRIEVER_FETCH_K", "20")),
        retriever_lambda_mult=float(os.getenv("RETRIEVER_LAMBDA_MULT", "0.7")),
        history_message_limit=int(os.getenv("HISTORY_MESSAGE_LIMIT", "6")),
        history_token_budget=int(os.getenv("HISTORY_TOKEN_BUDGET", "1200")),
        memory_summary_max_tokens=int(os.getenv("MEMORY_SUMMARY_MAX_TOKENS", "256")),
        memory_summarize_min_messages=int(os.getenv("MEMORY_SUMMARIZE_MIN_MESSAGES", "6")),
        db_pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
        db_max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "10")),
        db_pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "30")),
        log_level=os.getenv("LOG_LEVEL", "INFO"),
    )
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    return settings
