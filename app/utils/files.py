import uuid
from pathlib import Path

from fastapi import UploadFile

from app.core.exceptions import InvalidPDFError, UploadTooLargeError


def safe_upload_name(filename: str) -> str:
    base_name = Path(filename).name
    stem = Path(base_name).stem[:80] or "uploaded"
    return f"{stem}_{uuid.uuid4().hex[:10]}.pdf"


def validate_pdf_upload(file: UploadFile, max_size_bytes: int) -> None:
    if not file.filename:
        raise InvalidPDFError("Missing uploaded filename")
    if not file.filename.lower().endswith(".pdf"):
        raise InvalidPDFError("Only PDF files are allowed")

    content_type = (file.content_type or "").lower()
    if content_type and content_type not in {"application/pdf", "application/octet-stream"}:
        raise InvalidPDFError("Uploaded file must be a PDF")

    size = getattr(file, "size", None)
    if size is not None and size > max_size_bytes:
        raise UploadTooLargeError("Uploaded PDF is too large")


def save_upload_file(file: UploadFile, upload_dir: Path, max_size_bytes: int) -> Path:
    validate_pdf_upload(file, max_size_bytes)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_path = upload_dir / safe_upload_name(file.filename or "uploaded.pdf")

    bytes_written = 0
    with file_path.open("wb") as buffer:
        while chunk := file.file.read(1024 * 1024):
            bytes_written += len(chunk)
            if bytes_written > max_size_bytes:
                file_path.unlink(missing_ok=True)
                raise UploadTooLargeError("Uploaded PDF is too large")
            buffer.write(chunk)

    if bytes_written == 0:
        file_path.unlink(missing_ok=True)
        raise InvalidPDFError("Uploaded PDF is empty")

    return file_path
