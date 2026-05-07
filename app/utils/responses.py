from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from pydantic import BaseModel


def success_response(message: str, data: BaseModel | dict | list, status_code: int = 200, **legacy_fields):
    payload = {
        "success": True,
        "message": message,
        "data": jsonable_encoder(data),
        **legacy_fields,
    }
    return JSONResponse(status_code=status_code, content=jsonable_encoder(payload))


def error_response(message: str, error_code: str, status_code: int, details: dict | None = None):
    payload = {
        "success": False,
        "message": message,
        "error_code": error_code,
        "details": details or {},
        "detail": message,
    }
    return JSONResponse(status_code=status_code, content=jsonable_encoder(payload))
