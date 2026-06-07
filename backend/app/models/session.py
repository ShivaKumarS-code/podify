from sqlmodel import SQLModel, Field
from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from typing import Optional, Dict, Any
import uuid

class PodcastSession(SQLModel, table=True):
    __tablename__: str = "podcast_sessions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    document_id: int = Field(foreign_key="documents.id", ondelete="CASCADE")
    user_id: Optional[int] = Field(default=None, foreign_key="users.id")
    skill_level: str = Field(default="beginner") # beginner, expert
    agenda_index: int = Field(default=0) # Index in the discussion agenda
    
    # Store the entire DiscussionAgenda JSON structure:
    # {
    #   "title": "...",
    #   "segments": [
    #      {"title": "Intro", "description": "...", "goals": ["..."]},
    #      ...
    #   ]
    # }
    agenda: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB, nullable=False))
    
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class PodcastTurn(SQLModel, table=True):
    __tablename__: str = "podcast_turns"

    id: Optional[int] = Field(default=None, primary_key=True)
    session_id: str = Field(foreign_key="podcast_sessions.id", ondelete="CASCADE")
    speaker: str = Field(index=True) # "expert", "cohost", "user"
    content: str
    audio_path: Optional[str] = Field(default=None) # Path to synthesised audio file
    agenda_topic: Optional[str] = Field(default=None) # Name of topic being discussed
    created_at: datetime = Field(default_factory=datetime.utcnow)
