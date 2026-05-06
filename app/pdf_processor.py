import os
import uuid
from dotenv import load_dotenv

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")

from langchain_community.document_loaders import PyPDFLoader
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import PGVector

load_dotenv()

embeddings = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2",
    model_kwargs={"local_files_only": True},
)

CONNECTION_STRING = os.getenv(
    "PGVECTOR_CONNECTION_STRING",
    "postgresql+psycopg://postgres:postgres@127.0.0.1:5433/postgres",
)

def process_uploaded_pdf(file_path: str) -> str:
    """
    Process a single uploaded PDF and return a unique collection_name (session_id)
    """
    # Generate unique collection name for this upload
    collection_name = f"pdf_session_{uuid.uuid4().hex[:12]}"

    # Load PDF
    loader = PyPDFLoader(file_path)
    docs = loader.load()

    if not docs:
        raise ValueError("No readable pages found in the uploaded PDF")

    # Chunking
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=750,
        chunk_overlap=120
    )
    chunks = text_splitter.split_documents(docs)

    if not chunks:
        raise ValueError("No extractable text found in the uploaded PDF")

    print(f"Processed {len(chunks)} chunks from {os.path.basename(file_path)}")

    # Store in PGVector with unique collection
    try:
        PGVector.from_documents(
            documents=chunks,
            embedding=embeddings,
            collection_name=collection_name,
            connection_string=CONNECTION_STRING,
            use_jsonb=True,
            pre_delete_collection=True  # Clear if same name exists
        )
    except Exception as exc:
        error_text = str(exc).lower()
        if "password authentication failed" in error_text:
            detail = (
                "Postgres authentication failed. Update PGVECTOR_CONNECTION_STRING "
                "in app/.env with the correct username and password."
            )
        elif "connection timeout" in error_text or "connection failed" in error_text:
            detail = (
                "Postgres is not reachable. Check the host and port in "
                "PGVECTOR_CONNECTION_STRING in app/.env."
            )
        elif "extension" in error_text and "vector" in error_text:
            detail = (
                "The pgvector extension is not installed or cannot be created in this "
                "database. Install pgvector and run CREATE EXTENSION vector."
            )
        else:
            detail = (
                "Could not store PDF embeddings in PGVector. Check that Postgres is "
                "running, PGVECTOR_CONNECTION_STRING is correct, and pgvector is installed."
            )

        raise RuntimeError(detail) from exc

    print(f"PDF stored in collection: {collection_name}")
    return collection_name
