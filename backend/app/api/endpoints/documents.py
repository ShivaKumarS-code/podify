from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlmodel import Session, select
import os
import shutil
from typing import List, Dict, Any
from app.core.database import get_session
from app.models.document import Document
from app.services.pdf_processor import PDFProcessor
from app.services.vector_store import VectorStore
from app.agents.planner import PodcastPlanner

router = APIRouter()

# Ensure uploads directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_session)
) -> Dict[str, Any]:
    """
    Uploads a PDF, processes it (extracts text, chunks it, embeds it),
    and pre-generates a structured discussion agenda using Gemini.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
        
    # 1. Save file locally
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save uploaded file: {str(e)}")

    try:
        # 2. Extract text by page
        pages_content = PDFProcessor.extract_text_by_page(file_path)
        page_count = len(pages_content)
        
        if page_count == 0:
            raise HTTPException(status_code=400, detail="PDF has no extractable text.")
            
        # 3. Create Document record in DB
        db_document = Document(
            title=file.filename.replace(".pdf", "").replace("_", " ").replace("-", " "),
            file_path=file_path,
            page_count=page_count
        )
        db.add(db_document)
        db.commit()
        db.refresh(db_document)
        
        # 4. Chunk document text
        chunks = PDFProcessor.chunk_document(pages_content)
        
        # 5. Generate and store embeddings
        VectorStore.store_chunks(db, db_document.id, chunks)
        
        # 6. Pre-generate Discussion Agenda
        agenda = PodcastPlanner.generate_agenda(db, db_document.id, db_document.title)
        
        return {
            "document_id": db_document.id,
            "title": db_document.title,
            "page_count": db_document.page_count,
            "agenda": agenda
        }
        
    except Exception as e:
        # Cleanup file if processing failed
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(status_code=500, detail=f"PDF Processing failed: {str(e)}")

@router.get("/")
def list_documents(db: Session = Depends(get_session)) -> List[Dict[str, Any]]:
    """
    List all processed documents in the platform.
    """
    statement = select(Document).order_by(Document.created_at.desc())
    documents = db.exec(statement).all()
    
    return [
        {
            "id": doc.id,
            "title": doc.title,
            "page_count": doc.page_count,
            "created_at": doc.created_at
        }
        for doc in documents
    ]
