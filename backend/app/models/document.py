from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from pgvector.sqlalchemy import Vector
from datetime import datetime
from typing import Optional, List

class Document(SQLModel, table=True):
    __tablename__: str = "documents"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str
    file_path: str
    page_count: int
    user_id: Optional[int] = Field(default=None, foreign_key="users.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

class DocumentChunk(SQLModel, table=True):
    __tablename__: str = "document_chunks"

    id: Optional[int] = Field(default=None, primary_key=True)
    document_id: int = Field(foreign_key="documents.id", ondelete="CASCADE")
    page_number: int
    chunk_index: int
    content: str
    
    # pgvector embedding representation
    # Gemini text-embedding-004 has 768 dimensions
    embedding: List[float] = Field(sa_column=Column(Vector(768), nullable=False))
