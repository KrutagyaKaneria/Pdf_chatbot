import os

from langchain_community.document_loaders import DirectoryLoader, PyPDFLoader
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import PGVector

# ====================== Load PDFs ======================
loader = DirectoryLoader(
    os.path.abspath("../source_docs"),
    glob="**/*.pdf",
    use_multithreading=True,
    show_progress=True,
    max_concurrency=4,
    loader_cls=PyPDFLoader,
)

docs = loader.load()

# ====================== Embeddings ======================
embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")

# ====================== Better Chunking ======================
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=750,      # Slightly reduced for faster retrieval
    chunk_overlap=120,
    separators=["\n\n", "\n", ". ", " ", ""]
)

chunks = text_splitter.split_documents(docs)

print(f"📄 Total chunks created: {len(chunks)}")

# ====================== Store in PGVector ======================
PG_COLLECTION_NAME = "pdf_rag_vectors"
CONNECTION_STRING = "postgresql+psycopg://postgres:postgres@127.0.0.1:5433/postgres"

db = PGVector.from_documents(
    documents=chunks,
    embedding=embeddings,
    collection_name=PG_COLLECTION_NAME,
    connection_string=CONNECTION_STRING,
    pre_delete_collection=True,
    use_jsonb=True
)

print("✅ Data stored in PGVector successfully!")