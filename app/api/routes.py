from fastapi import APIRouter, Depends, File, UploadFile, status
from fastapi.concurrency import run_in_threadpool

from app.core.config import Settings, get_settings
from app.models.schemas import (
    ChatListData,
    ChatRequest,
    UploadData,
)
from app.services.chat_service import ChatService, chat_service
from app.services.pdf_service import PDFProcessingService
from app.utils.files import save_upload_file
from app.utils.responses import success_response


router = APIRouter()


def get_chat_service() -> ChatService:
    return chat_service


def get_pdf_service(settings: Settings = Depends(get_settings)) -> PDFProcessingService:
    return PDFProcessingService(settings)


@router.post("/upload-pdf", status_code=status.HTTP_201_CREATED)
async def upload_pdf(
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
    pdf_service: PDFProcessingService = Depends(get_pdf_service),
):
    file_path = save_upload_file(file, settings.upload_dir, settings.max_upload_size_bytes)
    try:
        collection_name = await run_in_threadpool(pdf_service.process_uploaded_pdf, file_path)
    except Exception:
        file_path.unlink(missing_ok=True)
        raise

    data = UploadData(
        collection_name=collection_name,
        filename=file.filename or file_path.name,
        stored_filename=file_path.name,
    )
    return success_response(
        "PDF uploaded and indexed successfully",
        data,
        status.HTTP_201_CREATED,
        status="success",
        collection_name=data.collection_name,
        filename=data.filename,
        stored_filename=data.stored_filename,
    )


@router.get("/chats")
async def get_all_chats(service: ChatService = Depends(get_chat_service)):
    chats = service.list_chats()
    return success_response("Chats fetched successfully", ChatListData(chats=chats), chats=chats)


@router.get("/chats/{chat_id}")
async def get_chat(chat_id: str, service: ChatService = Depends(get_chat_service)):
    chat = service.get_chat(chat_id)
    return success_response(
        "Chat fetched successfully",
        chat,
        chat_id=chat.chat_id,
        title=chat.title,
        collection_name=chat.collection_name,
        messages=chat.messages,
        created_at=chat.created_at,
        last_updated=chat.last_updated,
    )


@router.post("/chat")
async def send_message(request: ChatRequest, service: ChatService = Depends(get_chat_service)):
    data = await run_in_threadpool(
        service.send_message,
        request.question,
        request.collection_name,
        request.chat_id,
    )
    return success_response(
        "Answer generated successfully",
        data,
        chat_id=data.chat_id,
        answer=data.answer,
        docs=data.docs,
        title=data.title,
    )
