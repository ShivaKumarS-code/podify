from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from app.core.database import get_session
from app.models.document import Document
from app.models.session import PodcastSession, PodcastTurn
from app.models.user import User
from app.agents.podcast_graph import PodcastGraphService
from app.agents.planner import PodcastPlanner
from app.core.auth import get_current_user

router = APIRouter()

class SessionCreate(BaseModel):
    document_id: int
    skill_level: str = "beginner" # "beginner" or "expert"
    agenda: Optional[Dict[str, Any]] = None # Optional pre-generated agenda

class NextTurnRequest(BaseModel):
    user_message: Optional[str] = None

@router.post("/create")
def create_session(
    data: SessionCreate,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Creates a new podcast session if the document belongs to the user.
    """
    user_id = str(current_user.id)

    document = db.get(Document, data.document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    if document.user_id != user_id:
        raise HTTPException(status_code=403, detail="You do not own this document.")
        
    agenda = data.agenda
    if not agenda:
        try:
            agenda = PodcastPlanner.generate_agenda(db, data.document_id, document.title)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to generate discussion agenda: {str(e)}")
            
    # Create the session
    new_session = PodcastSession(
        document_id=data.document_id,
        user_id=user_id,
        skill_level=data.skill_level,
        agenda=agenda
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    
    # Generate the first turn (introduction) immediately to start the show
    try:
        first_turn = PodcastGraphService.run_next_turn(db, new_session.id)
    except Exception as e:
        import traceback
        traceback.print_exc()
        first_turn = None
        
    return {
        "session_id": new_session.id,
        "document_title": document.title,
        "skill_level": new_session.skill_level,
        "agenda": new_session.agenda,
        "agenda_index": new_session.agenda_index,
        "is_active": new_session.is_active,
        "first_turn": {
            "speaker": first_turn.speaker,
            "content": first_turn.content,
            "audio_path": first_turn.audio_path,
            "created_at": first_turn.created_at
        } if first_turn else None
    }

@router.get("/{session_id}")
def get_session_details(
    session_id: str,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Retrieves the status and metadata of a podcast session if owned by the user.
    """
    user_id = str(current_user.id)

    session_obj = db.get(PodcastSession, session_id)
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")
        
    document = db.get(Document, session_obj.document_id)
    if not document or document.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied to this session.")
        
    title = document.title
    
    return {
        "session_id": session_obj.id,
        "document_id": session_obj.document_id,
        "document_title": title,
        "skill_level": session_obj.skill_level,
        "agenda_index": session_obj.agenda_index,
        "agenda": session_obj.agenda,
        "is_active": session_obj.is_active,
        "created_at": session_obj.created_at
    }

@router.get("/{session_id}/turns")
def get_session_turns(
    session_id: str,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Returns the full history of dialogue turns for a session if owned by the user.
    """
    user_id = str(current_user.id)

    session_obj = db.get(PodcastSession, session_id)
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")
        
    document = db.get(Document, session_obj.document_id)
    if not document or document.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied to this session.")

    statement = (
        select(PodcastTurn)
        .where(PodcastTurn.session_id == session_id)
        .order_by(PodcastTurn.created_at.asc())
    )
    turns = db.exec(statement).all()
    
    return [
        {
            "id": t.id,
            "speaker": t.speaker,
            "content": t.content,
            "agenda_topic": t.agenda_topic,
            "audio_path": t.audio_path,
            "created_at": t.created_at
        }
        for t in turns
    ]

@router.post("/{session_id}/next-turn")
def generate_next_turn(
    session_id: str,
    body: Optional[NextTurnRequest] = None,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Triggers the generation of the next turn in the conversation if owned by the user.
    """
    user_id = str(current_user.id)

    session_obj = db.get(PodcastSession, session_id)
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")
        
    document = db.get(Document, session_obj.document_id)
    if not document or document.user_id != user_id:
        raise HTTPException(status_code=403, detail="Access denied to this session.")

    user_msg = body.user_message if body else None
    
    try:
        new_turn = PodcastGraphService.run_next_turn(db, session_id, user_interruption=user_msg)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate next turn: {str(e)}")
        
    if not new_turn:
        # Means session is completed or inactive
        return {
            "session_completed": True,
            "is_active": session_obj.is_active
        }
        
    return {
        "session_completed": False,
        "turn": {
            "id": new_turn.id,
            "speaker": new_turn.speaker,
            "content": new_turn.content,
            "agenda_topic": new_turn.agenda_topic,
            "audio_path": new_turn.audio_path,
            "created_at": new_turn.created_at
        }
    }
