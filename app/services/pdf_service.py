import uuid
import hashlib
from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader
from langchain_community.vectorstores import PGVector
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import Settings, get_settings
from app.core.exceptions import InvalidPDFError, VectorStoreError
from app.core.logging import get_logger
from app.db.pgvector import ensure_pgvector_ready
from app.services.document_repository import DocumentRepository
from app.services.embedding_service import get_embeddings


logger = get_logger(__name__)


class PDFProcessingService:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self.document_repo = DocumentRepository()

    def process_uploaded_pdf(
        self,
        file_path: str | Path,
        owner_id: str | None = None,
        filename: str | None = None,
        stored_filename: str | None = None,
    ) -> str:
        path = Path(file_path)
        owner = (owner_id or "system").strip() or "system"
        owner_hash = hashlib.sha1(owner.encode("utf-8")).hexdigest()[:12]
        collection_name = f"usr_{owner_hash}_pdf_{uuid.uuid4().hex[:12]}"

        logger.info("Processing PDF upload", extra={"upload_filename": path.name})
        ensure_pgvector_ready()
        logger.info(
            "PGVector bootstrap ready for upload",
            extra={"upload_filename": path.name, "collection_name": collection_name},
        )
        loader = PyPDFLoader(str(path))
        docs = loader.load()
        if not docs:
            raise InvalidPDFError("No readable pages found in the uploaded PDF")

        chunks = []
        if (self.settings.chunking_strategy or "").strip().lower() == "semantic":
            try:
                from langchain_experimental.text_splitter import SemanticChunker

                semantic_splitter = SemanticChunker(get_embeddings())
                chunks = semantic_splitter.split_documents(docs)
            except Exception as exc:
                logger.info(
                    "Semantic chunking unavailable; falling back to recursive",
                    extra={"reason": str(exc)},
                )

        if not chunks:
            text_splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.settings.chunk_size,
                chunk_overlap=self.settings.chunk_overlap,
                separators=["\n\n", "\n", ". ", " ", ""],
            )
            chunks = text_splitter.split_documents(docs)

        for idx, ch in enumerate(chunks):
            ch.metadata = ch.metadata or {}
            ch.metadata.setdefault("chunk_index", idx)
            src = Path(str(ch.metadata.get("source", path.name))).name
            page = ch.metadata.get("page", "")
            ch.metadata.setdefault("chunk_id", f"{src}:{page}:{idx}")
            ch.metadata.setdefault("owner_id", owner)
            ch.metadata.setdefault("collection_name", collection_name)
        if not chunks:
            raise InvalidPDFError("No extractable text found in the uploaded PDF")

        logger.info(
            "PDF chunking complete",
            extra={
                "upload_filename": path.name,
                "chunk_count": len(chunks),
                "collection_name": collection_name,
            },
        )

        try:
            logger.info(
                "Creating PGVector collection and inserting embeddings",
                extra={"upload_filename": path.name, "collection_name": collection_name, "chunk_count": len(chunks)},
            )
            PGVector.from_documents(
                documents=chunks,
                embedding=get_embeddings(),
                collection_name=collection_name,
                connection_string=self.settings.database_url,
                use_jsonb=True,
                pre_delete_collection=True,
                create_extension=False,
            )
        except Exception as exc:
            raise self._vector_error_from_exception(exc) from exc

        logger.info(
            "PDF stored in PGVector",
            extra={"collection_name": collection_name, "chunk_count": len(chunks)},
        )
        self.document_repo.upsert_document(
            owner_id=owner,
            collection_name=collection_name,
            filename=filename or path.name,
            stored_filename=stored_filename or path.name,
        )
        return collection_name

    def _vector_error_from_exception(self, exc: Exception) -> VectorStoreError:
        error_text = str(exc).lower()
        if "password authentication failed" in error_text:
            message = (
                "Postgres authentication failed. Update DATABASE_URL or "
                "PGVECTOR_CONNECTION_STRING in app/.env."
            )
        elif "connection timeout" in error_text or "connection failed" in error_text:
            message = "Postgres is not reachable. Check the host and port in app/.env."
        elif "extension" in error_text and "vector" in error_text:
            message = (
                "The pgvector extension is not installed or cannot be created in this database."
            )
        else:
            message = (
                "Could not store PDF embeddings in PGVector. Check that Postgres is running, "
                "the database connection is correct, and pgvector is installed."
            )
        return VectorStoreError(message, details={"reason": str(exc)})
