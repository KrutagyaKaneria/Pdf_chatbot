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

## Render Deployment

Render works best with two services:

1. A Python web service for the FastAPI backend.
2. A static site for the React frontend.

Use these settings:

Backend web service:

```text
Build command: poetry install --no-interaction --no-ansi
Start command: poetry run python app/server.py
```

Frontend static site:

```text
Build command: npm ci && npm run build
Publish directory: build
```

Required backend environment variables on Render:

- `GROQ_API_KEY`
- `DATABASE_URL`
- `REDIS_URL`
- `CLOUDINARY_URL` or `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET`
- `ENVIRONMENT=production`
- `CORS_ORIGINS=<your Render frontend URL>`
- `AUTH_COOKIE_SAMESITE=none`
- `AUTH_COOKIE_SECURE=true`

Required frontend environment variable on Render:

- `REACT_APP_API_BASE_URL=<your Render backend URL>`

If you keep background PDF processing enabled, also add a separate worker service with:

```text
Start command: poetry run python -m app.worker
```

The worker requires the same Redis and database settings as the web service.

## Cloud Migration

Production storage and infrastructure are managed services:

- Supabase Postgres provides the primary relational database and PGVector support.
- Redis Cloud provides semantic cache, retrieval cache, memory cache, token tracking, and queue state.
- Cloudinary stores uploaded PDFs and serves them through secure delivery URLs.

Uploaded PDFs are no longer written to a local `uploads/` folder in production. The backend uploads them to Cloudinary, stores the metadata in PostgreSQL, and the RAG pipeline downloads the Cloudinary asset when it needs to chunk and embed the document.

For production, keep these rules in place:

- Use `DATABASE_URL` from Supabase.
- Use `REDIS_URL` from Redis Cloud.
- Use `CLOUDINARY_URL` or the split Cloudinary env vars.
- Do not rely on local Docker for production data services.
- Keep `AUTH_COOKIE_SAMESITE=none` and `AUTH_COOKIE_SECURE=true` when the frontend and backend are on different domains.

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
