from pathlib import Path
import sys


ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app.services.pdf_service import PDFProcessingService  # noqa: E402


def process_uploaded_pdf(file_path: str) -> str:
    return PDFProcessingService().process_uploaded_pdf(file_path)
