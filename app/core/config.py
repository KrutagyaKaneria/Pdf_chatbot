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
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000", "http://127.0.0.1:3000"])

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

    semantic_cache_enabled: bool = True
    semantic_cache_similarity_threshold: float = 0.92
    semantic_cache_max_entries: int = 200
    semantic_cache_ttl_seconds: int = 60 * 30

    metrics_redis_enabled: bool = True

    context_token_budget: int = 1600
    context_max_chunks: int = 8
    context_max_chars_per_chunk: int = 1600

    pdf_background_enabled: bool = True
    pdf_queue_name: str = "default"
    pdf_job_ttl_seconds: int = 60 * 60 * 6
    pdf_job_max_retries: int = 2

    database_url: str = "postgresql+psycopg://postgres:postgres@127.0.0.1:5433/postgres"
    upload_dir: Path = APP_DIR / "uploads"
    max_upload_size_mb: int = 25

    embedding_model: str = "all-MiniLM-L6-v2"
    embeddings_local_only: bool = True
    chunking_strategy: str = "recursive"  # recursive | semantic
    chunk_size: int = 750
    chunk_overlap: int = 120

    retriever_k: int = 5
    retriever_fetch_k: int = 20
    retriever_lambda_mult: float = 0.7

    query_rewrite_enabled: bool = True
    query_rewrite_history_messages: int = 8

    keyword_search_enabled: bool = True
    keyword_search_k: int = 12
    keyword_search_fetch_k: int = 60
    keyword_bm25_enabled: bool = True
    keyword_bm25_k1: float = 1.5
    keyword_bm25_b: float = 0.75

    hybrid_search_enabled: bool = True
    hybrid_rrf_k: int = 60
    hybrid_vector_weight: float = 1.0
    hybrid_keyword_weight: float = 1.0

    reranker_enabled: bool = True
    reranker_provider: str = "llm"  # llm | bge
    reranker_model_name: str = "BAAI/bge-reranker-base"
    reranker_local_only: bool = True
    reranker_top_n: int = 20
    reranker_max_chars: int = 1500
    reranker_snippet_chars: int = 420

    retrieval_observability_log_enabled: bool = True
    retrieval_observability_store_enabled: bool = False
    retrieval_trace_ttl_seconds: int = 60 * 60
    history_message_limit: int = 6
    history_token_budget: int = 1200

    memory_summary_max_tokens: int = 256
    memory_summarize_min_messages: int = 6

    db_pool_size: int = 5
    db_max_overflow: int = 10
    db_pool_timeout: int = 30

    log_level: str = "INFO"
    # Authentication settings
    auth_provider: str = "local"  # local | clerk | auth0
    jwt_secret: str | None = None
    jwt_algorithm: str = "HS256"
    jwks_url: str | None = None
    jwt_private_key: str | None = None
    jwt_public_key: str | None = None
    access_token_exp_minutes: int = 15
    refresh_token_exp_days: int = 30
    auth_refresh_cookie_name: str = "refresh_token"
    auth_cookie_secure: bool = False
    auth_cookie_samesite: str = "lax"
    clerk_api_key: str | None = None
    clerk_frontend_api: str | None = None

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

    cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
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
        semantic_cache_enabled=os.getenv("SEMANTIC_CACHE_ENABLED", "true").lower() == "true",
        semantic_cache_similarity_threshold=float(os.getenv("SEMANTIC_CACHE_SIMILARITY_THRESHOLD", "0.92")),
        semantic_cache_max_entries=int(os.getenv("SEMANTIC_CACHE_MAX_ENTRIES", "200")),
        semantic_cache_ttl_seconds=int(os.getenv("SEMANTIC_CACHE_TTL_SECONDS", str(60 * 30))),
        metrics_redis_enabled=os.getenv("METRICS_REDIS_ENABLED", "true").lower() == "true",
        context_token_budget=int(os.getenv("CONTEXT_TOKEN_BUDGET", "1600")),
        context_max_chunks=int(os.getenv("CONTEXT_MAX_CHUNKS", "8")),
        context_max_chars_per_chunk=int(os.getenv("CONTEXT_MAX_CHARS_PER_CHUNK", "1600")),
        pdf_background_enabled=os.getenv("PDF_BACKGROUND_ENABLED", "true").lower() == "true",
        pdf_queue_name=os.getenv("PDF_QUEUE_NAME", "default"),
        pdf_job_ttl_seconds=int(os.getenv("PDF_JOB_TTL_SECONDS", str(60 * 60 * 6))),
        pdf_job_max_retries=int(os.getenv("PDF_JOB_MAX_RETRIES", "2")),
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
        chunking_strategy=os.getenv("CHUNKING_STRATEGY", "recursive"),
        chunk_size=int(os.getenv("CHUNK_SIZE", "750")),
        chunk_overlap=int(os.getenv("CHUNK_OVERLAP", "120")),
        retriever_k=int(os.getenv("RETRIEVER_K", "5")),
        retriever_fetch_k=int(os.getenv("RETRIEVER_FETCH_K", "20")),
        retriever_lambda_mult=float(os.getenv("RETRIEVER_LAMBDA_MULT", "0.7")),
        query_rewrite_enabled=os.getenv("QUERY_REWRITE_ENABLED", "true").lower() == "true",
        query_rewrite_history_messages=int(os.getenv("QUERY_REWRITE_HISTORY_MESSAGES", "8")),
        keyword_search_enabled=os.getenv("KEYWORD_SEARCH_ENABLED", "true").lower() == "true",
        keyword_search_k=int(os.getenv("KEYWORD_SEARCH_K", "12")),
        keyword_search_fetch_k=int(os.getenv("KEYWORD_SEARCH_FETCH_K", "60")),
        keyword_bm25_enabled=os.getenv("KEYWORD_BM25_ENABLED", "true").lower() == "true",
        keyword_bm25_k1=float(os.getenv("KEYWORD_BM25_K1", "1.5")),
        keyword_bm25_b=float(os.getenv("KEYWORD_BM25_B", "0.75")),
        hybrid_search_enabled=os.getenv("HYBRID_SEARCH_ENABLED", "true").lower() == "true",
        hybrid_rrf_k=int(os.getenv("HYBRID_RRF_K", "60")),
        hybrid_vector_weight=float(os.getenv("HYBRID_VECTOR_WEIGHT", "1.0")),
        hybrid_keyword_weight=float(os.getenv("HYBRID_KEYWORD_WEIGHT", "1.0")),
        reranker_enabled=os.getenv("RERANKER_ENABLED", "true").lower() == "true",
        reranker_provider=os.getenv("RERANKER_PROVIDER", "llm"),
        reranker_model_name=os.getenv("RERANKER_MODEL_NAME", "BAAI/bge-reranker-base"),
        reranker_local_only=os.getenv("RERANKER_LOCAL_ONLY", "true").lower() == "true",
        reranker_top_n=int(os.getenv("RERANKER_TOP_N", "20")),
        reranker_max_chars=int(os.getenv("RERANKER_MAX_CHARS", "1500")),
        reranker_snippet_chars=int(os.getenv("RERANKER_SNIPPET_CHARS", "420")),
        retrieval_observability_log_enabled=os.getenv("RETRIEVAL_OBSERVABILITY_LOG_ENABLED", "true").lower() == "true",
        retrieval_observability_store_enabled=os.getenv("RETRIEVAL_OBSERVABILITY_STORE_ENABLED", "false").lower() == "true",
        retrieval_trace_ttl_seconds=int(os.getenv("RETRIEVAL_TRACE_TTL_SECONDS", str(60 * 60))),
        history_message_limit=int(os.getenv("HISTORY_MESSAGE_LIMIT", "6")),
        history_token_budget=int(os.getenv("HISTORY_TOKEN_BUDGET", "1200")),
        memory_summary_max_tokens=int(os.getenv("MEMORY_SUMMARY_MAX_TOKENS", "256")),
        memory_summarize_min_messages=int(os.getenv("MEMORY_SUMMARIZE_MIN_MESSAGES", "6")),
        db_pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
        db_max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "10")),
        db_pool_timeout=int(os.getenv("DB_POOL_TIMEOUT", "30")),
        log_level=os.getenv("LOG_LEVEL", "INFO"),
        auth_provider=os.getenv("AUTH_PROVIDER", "local"),
        jwt_secret=os.getenv("JWT_SECRET"),
        jwt_algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
        jwks_url=os.getenv("JWKS_URL"),
        jwt_private_key=os.getenv("JWT_PRIVATE_KEY"),
        jwt_public_key=os.getenv("JWT_PUBLIC_KEY"),
        access_token_exp_minutes=int(os.getenv("ACCESS_TOKEN_EXP_MINUTES", "15")),
        refresh_token_exp_days=int(os.getenv("REFRESH_TOKEN_EXP_DAYS", "30")),
        auth_refresh_cookie_name=os.getenv("AUTH_REFRESH_COOKIE_NAME", "refresh_token"),
        auth_cookie_secure=os.getenv("AUTH_COOKIE_SECURE", "false").lower() == "true",
        auth_cookie_samesite=os.getenv("AUTH_COOKIE_SAMESITE", "lax"),
    )
    settings.upload_dir.mkdir(parents=True, exist_ok=True)
    return settings
