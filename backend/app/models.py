from typing import Optional
from datetime import datetime
from sqlmodel import SQLModel, Field


class DocumentBase(SQLModel):
    title: str
    content: str = ""


class Document(DocumentBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DocumentCreate(DocumentBase):
    pass


class DocumentUpdate(SQLModel):
    title: Optional[str] = None
    content: Optional[str] = None
