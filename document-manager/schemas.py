from pydantic import BaseModel
from typing import List

class ChatMessage(BaseModel):
    user: str
    assistant: str | None = None
    doc_ids: List[int] | None = None
    chunk_ids: List[str] | None = None

class RequestRetrieveDocument(BaseModel):
    chat_id: int
    messages: List[ChatMessage]

class RetrieveDocument(BaseModel):
    id: str
    doc_id: int
    page_number: int
    chunk_content: str
    score: float | None = None

class ResponseRetrieveDocument(BaseModel):
    documents: List[RetrieveDocument]
