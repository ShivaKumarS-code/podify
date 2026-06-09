from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlmodel import Session, select
import os
import shutil
from typing import List, Dict, Any, Optional
from app.core.database import get_session
from app.models.document import Document
from app.models.user import User
from app.services.pdf_processor import PDFProcessor
from app.services.vector_store import VectorStore
from app.agents.planner import PodcastPlanner
from app.core.auth import get_current_user

router = APIRouter()

# Ensure uploads directory exists
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Uploads a PDF, processes it (extracts text, chunks it, embeds it),
    and pre-generates a structured discussion agenda using Gemini.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    user_id = str(current_user.id)
        
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
            
        # 3. Create Document record in DB linked to user
        db_document = Document(
            title=file.filename.replace(".pdf", "").replace("_", " ").replace("-", " "),
            file_path=file_path,
            page_count=page_count,
            user_id=user_id
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
def list_documents(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    List all processed documents in the platform for the authenticated user.
    """
    user_id = str(current_user.id)

    statement = select(Document).where(Document.user_id == user_id).order_by(Document.created_at.desc())
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

@router.delete("/{document_id}")
def delete_document(
    document_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Deletes a processed document from the platform.
    This also deletes local PDF file and associated database records (Document, DocumentChunk, Sessions, Turns).
    """
    user_id = str(current_user.id)

    doc = db.get(Document, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if doc.user_id != user_id:
        raise HTTPException(status_code=403, detail="You do not own this document.")
        
    # 1. Delete associated sessions and their physical audio files
    from app.models.session import PodcastSession, PodcastTurn
    
    sessions_statement = select(PodcastSession).where(PodcastSession.document_id == document_id)
    sessions = db.exec(sessions_statement).all()
    
    # Static audio path directory
    static_audio_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), 
        "static", 
        "audio"
    )
    
    for session_obj in sessions:
        # Find turns for this session
        turns_statement = select(PodcastTurn).where(PodcastTurn.session_id == session_obj.id)
        turns = db.exec(turns_statement).all()
        for t in turns:
            if t.audio_path:
                filename = os.path.basename(t.audio_path)
                physical_audio_path = os.path.join(static_audio_dir, filename)
                if os.path.exists(physical_audio_path):
                    try:
                        os.remove(physical_audio_path)
                    except Exception as e:
                        print(f"WARNING: Failed to delete audio file {physical_audio_path}: {e}")
            db.delete(t)
        db.delete(session_obj)

    # 2. Delete the physical document file
    if doc.file_path and os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception as e:
            print(f"WARNING: Failed to delete physical document file {doc.file_path}: {e}")
            
    # 3. Delete DocumentChunk records
    from app.models.document import DocumentChunk
    chunks_statement = select(DocumentChunk).where(DocumentChunk.document_id == document_id)
    chunks = db.exec(chunks_statement).all()
    for chunk in chunks:
        db.delete(chunk)
        
    # 4. Delete the Document itself
    db.delete(doc)
    db.commit()
    
    return {"success": True, "message": f"Document '{doc.title}' deleted successfully."}

