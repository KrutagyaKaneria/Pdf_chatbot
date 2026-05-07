from fastapi import status


class AppError(Exception):
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    code = "internal_error"

    def __init__(self, message: str, *, details: dict | None = None) -> None:
        self.message = message
        self.details = details or {}
        super().__init__(message)


class ValidationAppError(AppError):
    status_code = status.HTTP_400_BAD_REQUEST
    code = "validation_error"


class InvalidPDFError(ValidationAppError):
    code = "invalid_pdf"


class UploadTooLargeError(ValidationAppError):
    code = "upload_too_large"


class ChatNotFoundError(AppError):
    status_code = status.HTTP_404_NOT_FOUND
    code = "chat_not_found"


class CollectionMismatchError(AppError):
    status_code = status.HTTP_409_CONFLICT
    code = "collection_mismatch"


class VectorStoreError(AppError):
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    code = "vector_store_error"


class LLMError(AppError):
    status_code = status.HTTP_502_BAD_GATEWAY
    code = "llm_error"
