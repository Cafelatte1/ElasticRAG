from pydantic import BaseModel, EmailStr
from typing import List

class ChatMessage(BaseModel):
    user: str
    assistant: str | None = None
    doc_ids: List[int] | None = None
    chunk_ids: List[str] | None = None

class RetrieveDocument(BaseModel):
    id: str
    doc_id: int
    page_number: int
    chunk_content: str
    score: float | None = None

class RequestSignup(BaseModel):
    username: EmailStr
    password: str

class RequestQuery(BaseModel):
    chat_id: int
    messages: List[ChatMessage]

class RequestSaveChat(BaseModel):
    title: str
    messages: List[ChatMessage]

class RequestUpdateChat(BaseModel):
    chat_id: int
    title: str

class RequestDeleteChat(BaseModel):
    chat_id: int

class RequestSaveMessage(BaseModel):
    chat_id: int
    user: str
    assistant: str | None = None
    doc_ids: List[int] | None = None
    chunk_ids: List[str] | None = None

class RequestDeleteDocument(BaseModel):
    doc_id: int
