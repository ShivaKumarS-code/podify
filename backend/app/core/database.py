from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text
from app.core.config import settings

# Create database engine
engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    # SQLModel / SQLAlchemy pooling settings
    pool_pre_ping=True
)

def init_db():
    """
    Initialize database:
    1. Create the pgvector extension if it doesn't exist.
    2. Create all SQLModel tables.
    """
    # Import all models to ensure they are registered on SQLModel.metadata
    from app.models.user import User
    from app.models.document import Document, DocumentChunk
    from app.models.session import PodcastSession, PodcastTurn

    with Session(engine) as session:
        # Enable pgvector extension
        session.exec(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        session.exec(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255);"))
        session.commit()
    
    # Create all tables
    SQLModel.metadata.create_all(engine)

def get_session():
    """
    FastAPI Dependency to get database session.
    """
    with Session(engine) as session:
        yield session
