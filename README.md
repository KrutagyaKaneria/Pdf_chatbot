# pdf_chatbot

PDF chat app with FastAPI + PGVector RAG, conversational memory (DB-backed) + caching (Redis), plus Phase 4 optimizations:
- Semantic cache (embedding similarity)
- Retrieval compression (token budget)
- Token/latency metrics
- Background PDF processing (queue + job status)
- SSE streaming chat endpoint

## Quickstart (local)

### 1) Start infra (Postgres pgvector + Redis)

```powershell
docker compose up -d
```

### 2) Backend

```powershell
cd "D:\coding gita\pdf_chatbot"
poetry install
poetry run python app/server.py
```

Backend defaults to `http://localhost:8000`.

### 3) Frontend

```powershell
cd "D:\coding gita\pdf_chatbot\frontend"
npm install
npm start
```

Frontend defaults to `http://localhost:3000`.

## Configuration

App settings are read from `app/.env` (loaded automatically) and environment variables.

Required:
- `GROQ_API_KEY`
- `DATABASE_URL` (default points to dockerized Postgres on `127.0.0.1:5433`)

Optional (recommended):
- `REDIS_URL` (default `redis://127.0.0.1:6379/0`)
- `CACHE_ENABLED` (`true`/`false`)

Phase 4 toggles:
- `SEMANTIC_CACHE_ENABLED`, `SEMANTIC_CACHE_SIMILARITY_THRESHOLD`, `SEMANTIC_CACHE_MAX_ENTRIES`, `SEMANTIC_CACHE_TTL_SECONDS`
- `CONTEXT_TOKEN_BUDGET`, `CONTEXT_MAX_CHUNKS`, `CONTEXT_MAX_CHARS_PER_CHUNK`
- `METRICS_REDIS_ENABLED`
- `PDF_BACKGROUND_ENABLED`, `PDF_QUEUE_NAME`, `PDF_JOB_TTL_SECONDS`, `PDF_JOB_MAX_RETRIES`

## API

### Upload + indexing

- `POST /upload-pdf` (sync)
- `POST /upload-pdf?background=true` (async, returns a job)
- `GET /upload-pdf/jobs/{job_id}` (job status; includes `collection_name` when done)

To run the background worker:

```powershell
cd "D:\coding gita\pdf_chatbot"
poetry run python -m app.worker
```

### Chat

- `POST /chat` (non-streaming JSON response; persists to chat memory)
- `POST /chat/stream` (SSE stream; emits `meta`, `sources`, `token`, `done` events)
- `GET /chats`
- `GET /chats/{chat_id}`

### LangServe

If mounted, the LangServe chain remains available (see app setup in [app/main.py](app/main.py)).
