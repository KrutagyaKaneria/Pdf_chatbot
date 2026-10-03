FROM python:3.11-slim

WORKDIR /code

RUN pip install --no-cache-dir --upgrade pip

COPY ./pyproject.toml ./README.md ./

COPY ./packages ./packages

COPY ./app ./app

RUN pip install --no-cache-dir .

# Bake the embedding model into the image so the server never downloads it at runtime.
RUN python -m app.services.embedding_service
ENV EMBEDDINGS_LOCAL_ONLY=true

EXPOSE 8080

CMD exec uvicorn app.server:app --host 0.0.0.0 --port 8080
