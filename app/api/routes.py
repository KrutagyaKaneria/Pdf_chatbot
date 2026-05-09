from fastapi import APIRouter, Depends, File, UploadFile, status
from fastapi.concurrency import iterate_in_threadpool, run_in_threadpool
from fastapi.responses import StreamingResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import Settings, get_settings
from app.models.schemas import (
    ChatListData,
    ChatRequest,
    UploadData,
    UploadJobData,
)
from app.services.chat_service import ChatService, chat_service
from app.services.pdf_service import PDFProcessingService
from app.services.pdf_queue_service import PDFQueueService
from app.core.exceptions import ValidationAppError
from app.utils.files import save_upload_file
from app.utils.responses import success_response


router = APIRouter()


def get_chat_service() -> ChatService:
    return chat_service


def get_pdf_service(settings: Settings = Depends(get_settings)) -> PDFProcessingService:
    return PDFProcessingService(settings)


def get_pdf_queue(settings: Settings = Depends(get_settings)) -> PDFQueueService:
    return PDFQueueService(settings)


@router.post("/upload-pdf", status_code=status.HTTP_201_CREATED)
async def upload_pdf(
    file: UploadFile = File(...),
    settings: Settings = Depends(get_settings),
    pdf_service: PDFProcessingService = Depends(get_pdf_service),
    pdf_queue: PDFQueueService = Depends(get_pdf_queue),
    background: bool = False,
):
    file_path = save_upload_file(file, settings.upload_dir, settings.max_upload_size_bytes)

    if background:
        if not pdf_queue.enabled():
            file_path.unlink(missing_ok=True)
            raise ValidationAppError(
                "Background PDF processing requires Redis cache enabled (CACHE_ENABLED=true) and PDF_BACKGROUND_ENABLED=true"
            )
        job_id = pdf_queue.enqueue(
            file_path=file_path,
            filename=file.filename or file_path.name,
            stored_filename=file_path.name,
        )
        data = UploadJobData(
            job_id=job_id,
            state="queued",
            filename=file.filename or file_path.name,
            stored_filename=file_path.name,
            status_url=f"/upload-pdf/jobs/{job_id}",
        )
        return success_response(
            "PDF upload accepted for background processing",
            data,
            status.HTTP_202_ACCEPTED,
            status="accepted",
            job_id=data.job_id,
            state=data.state,
            status_url=data.status_url,
        )

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


@router.get("/upload-pdf/jobs/{job_id}")
async def get_upload_job(job_id: str, pdf_queue: PDFQueueService = Depends(get_pdf_queue)):
    if not pdf_queue.enabled():
        raise ValidationAppError("Background PDF processing is disabled")
    status_obj = pdf_queue.get_status(job_id)
    if not status_obj:
        raise StarletteHTTPException(status_code=404, detail="Job not found")
    return success_response(
        "PDF job status fetched successfully",
        status_obj,
        job_id=status_obj.get("job_id"),
        state=status_obj.get("state"),
        collection_name=status_obj.get("collection_name") or None,
        error=status_obj.get("error") or None,
        filename=status_obj.get("filename"),
        stored_filename=status_obj.get("stored_filename"),
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
        filename=getattr(chat, "filename", None),
        stored_filename=getattr(chat, "stored_filename", None),
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
        request.filename,
        request.stored_filename,
    )
    return success_response(
        "Answer generated successfully",
        data,
        chat_id=data.chat_id,
        answer=data.answer,
        docs=data.docs,
        title=data.title,
    )


@router.post("/chat/stream")
async def send_message_stream(request: ChatRequest, service: ChatService = Depends(get_chat_service)):
    iterator = service.send_message_stream(
        request.question,
        request.collection_name,
        request.chat_id,
        request.filename,
        request.stored_filename,
    )
    return StreamingResponse(
        iterate_in_threadpool(iterator),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
