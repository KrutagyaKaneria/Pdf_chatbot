from pathlib import Path
from typing import Any

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import RedirectResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from langserve import add_routes
import shutil
from datetime import datetime
import uuid
from pydantic import BaseModel, Field

from pdf_processor import process_uploaded_pdf
from rag_chain import final_chain

app = FastAPI(title="Dynamic PDF RAG API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/pdfs", StaticFiles(directory=str(UPLOAD_DIR)), name="pdfs")

@app.get("/")
async def redirect_root_to_docs():
    return RedirectResponse("/docs")

# In-memory storage for chat history (for sidebar)
chat_sessions = {}   # {chat_id: {"title": str, "collection_name": str, "messages": [], "created_at": str, "last_updated": str}}


class ChatRequest(BaseModel):
    question: str = Field(min_length=1)
    collection_name: str = Field(min_length=1)
    chat_id: str | None = None


def utc_now() -> str:
    return datetime.utcnow().isoformat() + "Z"


def safe_upload_name(filename: str) -> str:
    base_name = Path(filename).name
    stem = Path(base_name).stem[:80] or "uploaded"
    return f"{stem}_{uuid.uuid4().hex[:10]}.pdf"

# ====================== UPLOAD PDF ======================
@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files allowed")

    file_path = UPLOAD_DIR / safe_upload_name(file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    try:
        collection_name = process_uploaded_pdf(str(file_path))
        return JSONResponse({
            "status": "success",
            "collection_name": collection_name,
            "filename": file.filename,
            "stored_filename": file_path.name
        })
    except Exception as e:
        file_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=str(e))


# ====================== GET ALL CHATS (for Sidebar) ======================
@app.get("/chats")
async def get_all_chats():
    chats = []
    for chat_id, session in chat_sessions.items():
        chats.append({
            "chat_id": chat_id,
            "title": session["title"],
            "collection_name": session["collection_name"],
            "created_at": session["created_at"],
            "last_updated": session.get("last_updated")
        })
    # Sort by last updated (newest first)
    chats.sort(key=lambda x: x.get("last_updated", x["created_at"]), reverse=True)
    return chats


@app.get("/chats/{chat_id}")
async def get_chat(chat_id: str):
    session = chat_sessions.get(chat_id)
    if not session:
        raise HTTPException(status_code=404, detail="Chat not found")

    return {
        "chat_id": chat_id,
        "title": session["title"],
        "collection_name": session["collection_name"],
        "messages": session["messages"],
        "created_at": session["created_at"],
        "last_updated": session.get("last_updated")
    }


# ====================== SEND MESSAGE (Continue or New Chat) ======================
@app.post("/chat")
async def send_message(request: ChatRequest):
    question = request.question.strip()
    collection_name = request.collection_name.strip()
    chat_id = request.chat_id

    if not question or not collection_name:
        raise HTTPException(status_code=400, detail="question and collection_name are required")

    # Create new chat if no chat_id
    if not chat_id:
        chat_id = str(uuid.uuid4())
        now = utc_now()
        chat_sessions[chat_id] = {
            "title": question[:60] + "..." if len(question) > 60 else question,
            "collection_name": collection_name,
            "messages": [],
            "created_at": now,
            "last_updated": now
        }
    elif chat_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Chat not found")
    elif chat_sessions[chat_id]["collection_name"] != collection_name:
        raise HTTPException(
            status_code=409,
            detail="chat_id belongs to a different collection_name"
        )

    # Prepare input for rag_pipeline
    input_data = {
        "question": question,
        "collection_name": collection_name,
        "chat_history": chat_sessions[chat_id]["messages"]
    }

    # Get answer from RAG
    try:
        result: dict[str, Any] = final_chain.invoke(input_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Save conversation
    chat_sessions[chat_id]["messages"].append({"role": "user", "content": question})
    chat_sessions[chat_id]["messages"].append({"role": "assistant", "content": result["answer"]})
    chat_sessions[chat_id]["last_updated"] = utc_now()

    return {
        "chat_id": chat_id,
        "answer": result["answer"],
        "docs": result.get("docs", []),
        "title": chat_sessions[chat_id]["title"]
    }


# LangServe route for playground (optional)
add_routes(
    app,
    final_chain,
    path="/rag",
)

print("Server is running!")
print("   -> Upload PDF     : POST /upload-pdf")
print("   -> Chat           : POST /chat")
print("   -> Get Chat List  : GET /chats")
print("   -> Playground     : http://localhost:8000/rag/playground/")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
