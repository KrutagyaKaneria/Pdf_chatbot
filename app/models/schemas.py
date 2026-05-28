from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, Field


T = TypeVar("T")


class ErrorResponse(BaseModel):
    success: Literal[False] = False
    message: str
    error_code: str
    details: dict[str, Any] = Field(default_factory=dict)


class ApiResponse(BaseModel, Generic[T]):
    success: Literal[True] = True
    message: str
    data: T


class SourceReference(BaseModel):
    source: str
    page: int | None = None


class UploadData(BaseModel):
    collection_name: str
    filename: str
    stored_filename: str
    cloudinary_public_id: str | None = None
    cloudinary_url: str | None = None


class UploadResponse(ApiResponse[UploadData]):
    status: str = "success"
    collection_name: str
    filename: str
    stored_filename: str


class UploadJobData(BaseModel):
    job_id: str
    state: str
    filename: str
    stored_filename: str
    status_url: str
    cloudinary_public_id: str | None = None
    cloudinary_url: str | None = None
    collection_name: str | None = None
    error: str | None = None


class ChatRequest(BaseModel):
    question: str = Field(min_length=1)
    collection_name: str = Field(min_length=1)
    chat_id: str | None = None
    filename: str | None = None
    stored_filename: str | None = None


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatData(BaseModel):
    chat_id: str
    answer: str
    docs: list[SourceReference] = Field(default_factory=list)
    title: str


class ChatResponse(ApiResponse[ChatData]):
    chat_id: str
    answer: str
    docs: list[SourceReference] = Field(default_factory=list)
    title: str


class UserPublic(BaseModel):
    user_id: str
    email: str | None = None
    name: str | None = None


class SignupRequest(BaseModel):
    email: str
    password: str = Field(min_length=8)
    name: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str | None = None


class AuthTokenData(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int


class AuthSessionData(BaseModel):
    user: UserPublic
    tokens: AuthTokenData


class AuthResponse(ApiResponse[AuthSessionData]):
    user: UserPublic
    tokens: AuthTokenData


class ChatSummary(BaseModel):
    chat_id: str
    title: str
    collection_name: str
    filename: str | None = None
    stored_filename: str | None = None
    created_at: str
    last_updated: str | None = None


class ChatListData(BaseModel):
    chats: list[ChatSummary]


class ChatDetailData(ChatSummary):
    messages: list[ChatMessage] = Field(default_factory=list)


class QuestionInput(BaseModel):
    question: str
    collection_name: str
    chat_history: list[dict[str, str]] = Field(default_factory=list)
    memory_summary: str = ""


class RagResult(BaseModel):
    answer: str
    docs: list[SourceReference] = Field(default_factory=list)
    collection_name: str
