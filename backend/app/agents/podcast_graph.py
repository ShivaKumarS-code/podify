import google.generativeai as genai
import json
from typing import Dict, Any, List, Optional, TypedDict
from datetime import datetime
from langgraph.graph import StateGraph, END
from sqlmodel import Session, select
from app.core.config import settings
from app.models.session import PodcastSession, PodcastTurn
from app.models.user import User
from app.models.document import Document
from app.services.vector_store import VectorStore

# Configure GenAI
genai.configure(api_key=settings.GEMINI_API_KEY)

# Define LangGraph state dictionary
class PodcastGraphState(TypedDict):
    session_id: str
    document_id: int
    skill_level: str
    agenda: Dict[str, Any]
    agenda_index: int
    transcript_history: List[Dict[str, str]]
    last_speaker: str
    turns_in_current_segment: int
    user_message: Optional[str]
    next_speaker: Optional[str]
    new_turn_text: Optional[str]  # Stores the text generated in this step

# Define Node functions
def moderator_node(state: PodcastGraphState) -> Dict[str, Any]:
    """
    Decides who speaks next, handles agenda progression, and checks for user input.
    This moderator is hidden and does not output chat turns.
    """
    agenda = state["agenda"]
    agenda_index = state["agenda_index"]
    turns_in_current_segment = state["turns_in_current_segment"]
    last_speaker = state["last_speaker"]
    user_message = state["user_message"]
    
    segments = agenda.get("segments", [])
    
    # 1. Check if session has finished all segments AND sign-off has completed
    if agenda_index >= len(segments):
        if last_speaker == "expert":
            # Let cohost say final sign-off
            return {
                **state,
                "next_speaker": "cohost",
                "turns_in_current_segment": turns_in_current_segment + 1
            }
        else:
            # Cohost has signed off too, end the podcast
            return {**state, "next_speaker": None, "new_turn_text": None}

    # 2. Handle user message override
    if user_message:
        # If user interjected, let the Expert answer it (or Co-host, but Expert is primary)
        return {
            **state,
            "next_speaker": "expert",
            "turns_in_current_segment": turns_in_current_segment + 1
        }

    # 3. Topic progression check
    # Move to the next agenda segment if we've discussed this one for 3+ turns
    max_turns_per_segment = 3
    if turns_in_current_segment >= max_turns_per_segment:
        next_index = agenda_index + 1
        if next_index >= len(segments):
            # Transition to conclusion/wrap-up phase
            return {
                **state,
                "agenda_index": next_index,
                "turns_in_current_segment": 0,
                "next_speaker": "expert" # Expert initiates wrap-up
            }
        else:
            # Transition to next segment
            return {
                **state,
                "agenda_index": next_index,
                "turns_in_current_segment": 0,
                "next_speaker": "expert" # Let Expert initiate new topic
            }

    # 4. Standard alternating turn-taking
    if last_speaker == "expert":
        next_sp = "cohost"
    else:
        next_sp = "expert"

    return {**state, "next_speaker": next_sp}


def expert_node(state: PodcastGraphState) -> Dict[str, Any]:
    """
    Expert host (Alexis) generates a knowledgeable turn grounded in PDF retrieval.
    """
    session_id = state["session_id"]
    document_id = state["document_id"]
    agenda = state["agenda"]
    agenda_index = state["agenda_index"]
    transcript_history = state["transcript_history"]
    user_message = state["user_message"]
    skill_level = state["skill_level"]

    segments = agenda.get("segments", [])
    
    # Check if we are in wrap-up phase
    if agenda_index >= len(segments):
        # Fetch document title for wrap-up
        from app.core.database import Session as DBSession, engine
        with DBSession(engine) as db:
            from app.models.document import Document
            doc = db.get(Document, document_id)
            document_title = doc.title if doc else "this topic"
            
        prompt = f"""
You are Alexis, the Expert Host of a professional tech podcast called Podify.
Today's discussion about "{document_title}" has completed. Wrap up the podcast episode.
State a final concluding thought, thank the listeners, and sign off. Be extremely concise: 1 or 2 sentences max.
Speak directly as a human.

NATURAL CONVERSATION GUIDELINES FOR ALEXIS (EXPERT):
- Speak like a real human host, not a reading bot. Keep it conversational, relaxed, and concise.
- Actively inject quirks: include occasional phonetic laughter/chuckles ("haha", "hehe", "haha wow"), pauses or filler words ("uhm", "well", "uh..."), or clearing throat ("ahem").
- Speak directly in the first person. NEVER use written stage directions, asterisks, or brackets (e.g., *laughs*, [coughs]) because the text-to-speech voice will read them out loud literally. Write reactions phonetically as regular spoken text (e.g., "ahem, excuse me...", "haha, that's wild", or "oh, hmm... let's see").
"""
        from app.services.llm import LLMService
        generated_text = LLMService.generate_text(prompt)
        if generated_text.startswith("Alexis:"):
            generated_text = generated_text[len("Alexis:"):].strip()
            
        updated_history = list(transcript_history)
        updated_history.append({"speaker": "expert", "content": generated_text})
        
        return {
            **state,
            "transcript_history": updated_history,
            "last_speaker": "expert",
            "turns_in_current_segment": state["turns_in_current_segment"] + 1,
            "user_message": None,
            "new_turn_text": generated_text
        }

    # Check if we are in introduction phase (first turn)
    if not transcript_history:
        # Fetch document title for intro
        from app.core.database import Session as DBSession, engine
        with DBSession(engine) as db:
            from app.models.document import Document
            doc = db.get(Document, document_id)
            document_title = doc.title if doc else "the document"
            
        prompt = f"""
You are Alexis, the Expert Host of a professional tech podcast called Podify.
Welcome the listeners to Podify, introduce your co-host Julia, and announce that today you will be discussing the uploaded document: "{document_title}".
Keep it very brief: 1 or 2 sentences max. Do NOT say 'According to the PDF'. Speak directly as a human.
CRITICAL: Do NOT repeat greetings (e.g., do not say "hello" or "welcome" twice in the same turn). State your initial greeting once clearly, then introduce Julia, and state the topic.

NATURAL CONVERSATION GUIDELINES FOR ALEXIS (EXPERT):
- Speak like a real human host, not a reading bot. Keep it conversational, relaxed, and concise.
- Actively inject quirks: include occasional phonetic laughter/chuckles ("haha", "hehe", "haha wow"), pauses or filler words ("uhm", "well", "uh..."), or clearing throat ("ahem").
- Speak directly in the first person. NEVER use written stage directions, asterisks, or brackets (e.g., *laughs*, [coughs]) because the text-to-speech voice will read them out loud literally. Write reactions phonetically as regular spoken text (e.g., "ahem, excuse me...", "haha, that's wild", or "oh, hmm... let's see").
"""
        from app.services.llm import LLMService
        generated_text = LLMService.generate_text(prompt)
        if generated_text.startswith("Alexis:"):
            generated_text = generated_text[len("Alexis:"):].strip()
            
        updated_history = list(transcript_history)
        updated_history.append({"speaker": "expert", "content": generated_text})
        
        return {
            **state,
            "transcript_history": updated_history,
            "last_speaker": "expert",
            "turns_in_current_segment": state["turns_in_current_segment"] + 1,
            "user_message": None,
            "new_turn_text": generated_text
        }

    current_segment = segments[agenda_index] if agenda_index < len(segments) else {"title": "General Discussion", "goals": []}
    
    # Perform retrieval using pgvector
    search_query = f"{current_segment['title']} "
    if user_message:
        search_query += f" {user_message}"
    else:
        search_query += " ".join(current_segment.get("goals", []))
        
    # We open a database session to search
    from app.core.database import Session as DBSession, engine
    with DBSession(engine) as db:
        chunks = VectorStore.similarity_search(db, document_id, search_query, k=3)
        context = "\n\n".join([c.content for c in chunks])

    # Build prompt
    history_str = "\n".join([f"{t['speaker'].capitalize()}: {t['content']}" for t in transcript_history[-6:]])
    
    prompt = f"""
You are Alexis, the Expert Co-Host of a professional tech podcast called Podify.
Your style is highly knowledgeable, clear, technical, and concise. You speak in a natural conversational flow.

PORTION OF DOCUMENT CONTEXT FOR REFERENCE:
{context}

CURRENT TOPIC: {current_segment['title']}
TOPIC DESCRIPTION: {current_segment.get('description', '')}
SEGMENT GOALS: {current_segment.get('goals', [])}

USER PROFILE / SKILL LEVEL: {skill_level} (Adapt terminology explanations slightly: if beginner, explain advanced terms; if expert, keep it technical).

RECENT DISCUSSION TRANSCRIPT:
{history_str}

NATURAL CONVERSATION GUIDELINES FOR ALEXIS (EXPERT):
- Speak like a real human host, not a reading bot. Keep it conversational, relaxed, and concise.
- Actively inject quirks: include occasional phonetic laughter/chuckles ("haha", "hehe", "haha wow"), pauses or filler words ("uhm", "well", "uh..."), or clearing throat ("ahem").
- Speak directly in the first person. NEVER use written stage directions, asterisks, or brackets (e.g., *laughs*, [coughs]) because the text-to-speech voice will read them out loud literally. Write reactions phonetically as regular spoken text (e.g., "ahem, excuse me...", "haha, that's wild", or "oh, hmm... let's see").
"""

    if user_message:
        prompt += f"\nTHE USER INTERRUPTED WITH THIS MESSAGE: \"{user_message}\"\n Alexis, answer the user's question directly using the document context. Be extremely concise: 1 or 2 sentences max. Keep it conversational."
    else:
        prompt += f"\nAlexis, generate your next turn. Introduce or explain the concepts in the current topic to Julia (your co-host). Keep it very brief: 1 or 2 sentences max. Do NOT say 'According to the PDF' or refer to 'the document context'. Speak directly as a human."

    from app.services.llm import LLMService
    generated_text = LLMService.generate_text(prompt)

    # Clean response (sometimes gemini puts Alexis: prefix)
    if generated_text.startswith("Alexis:"):
        generated_text = generated_text[len("Alexis:"):].strip()

    # Append to transcript
    updated_history = list(transcript_history)
    updated_history.append({"speaker": "expert", "content": generated_text})

    return {
        **state,
        "transcript_history": updated_history,
        "last_speaker": "expert",
        "turns_in_current_segment": state["turns_in_current_segment"] + 1,
        "user_message": None, # Consume user message
        "new_turn_text": generated_text
    }


def cohost_node(state: PodcastGraphState) -> Dict[str, Any]:
    """
    Curious co-host (Julia) generates a clarifying or debating turn based on user skill level.
    """
    agenda = state["agenda"]
    agenda_index = state["agenda_index"]
    transcript_history = state["transcript_history"]
    skill_level = state["skill_level"]

    segments = agenda.get("segments", [])
    
    # Check if we are in wrap-up phase
    if agenda_index >= len(segments):
        prompt = f"""
You are Julia, the Curious Co-Host of a professional tech podcast called Podify.
Alexis has just wrapped up the podcast and signed off. Say your quick final sign-off, thank the listeners, and say goodbye.
Keep it extremely brief: 1 concise sentence. Do NOT refer to 'the PDF'. Speak directly as a human.

NATURAL CONVERSATION GUIDELINES FOR JULIA (CO-HOST):
- Speak like a real, enthusiastic human co-host. Keep it very conversational, expressive, and concise.
- Actively inject quirks: include giggles ("haha!", "hehe"), vocal agreements ("mm-hmm", "yeah, totally", "oh, wow"), gasp/surprise ("gasp!"), or filler words ("um", "uh", "like", "you know").
- Speak directly in the first person. NEVER use written stage directions, asterisks, or brackets (e.g., *giggles*, [sighs]) because the text-to-speech voice will read them out loud literally. Write reactions phonetically as regular spoken text (e.g., "haha, wait, really?", "gasp, that is huge!", or "uh-huh, makes sense").
"""
        from app.services.llm import LLMService
        generated_text = LLMService.generate_text(prompt)
        if generated_text.startswith("Julia:"):
            generated_text = generated_text[len("Julia:"):].strip();
            
        updated_history = list(transcript_history)
        updated_history.append({"speaker": "cohost", "content": generated_text})
        
        return {
            **state,
            "transcript_history": updated_history,
            "last_speaker": "cohost",
            "turns_in_current_segment": state["turns_in_current_segment"] + 1,
            "new_turn_text": generated_text
        }

    current_segment = segments[agenda_index] if agenda_index < len(segments) else {"title": "General Discussion", "goals": []}
    
    # Build history
    history_str = "\n".join([f"{t['speaker'].capitalize()}: {t['content']}" for t in transcript_history[-6:]])

    # Dynamic Curiosity Prompt
    if skill_level == "beginner":
        curiosity_guideline = "Ask a simple clarifying question or express confusion about what Alexis just said. Ask Alexis to explain using an analogy. Act like a beginner student."
    else:
        curiosity_guideline = "Ask a challenging, deep follow-up question. Compare Alexis's statement with typical industry alternatives. Act like an experienced engineer or researcher."

    prompt = f"""
You are Julia, the Curious Co-Host of a professional tech podcast called Podify.
Your style is friendly, conversational, engaging, and brief. You ask Alexis (the expert) clarifying questions, keep the momentum going, and represent the listener's perspective.

CURRENT TOPIC: {current_segment['title']}
USER PROFILE / SKILL LEVEL: {skill_level}

RECENT DISCUSSION TRANSCRIPT:
{history_str}

GUIDELINES FOR JULIA'S TURN:
- Julia's response MUST be extremely brief: 1 or 2 sentences max (prefer 1 concise sentence).
- {curiosity_guideline}
- Do NOT say 'According to page X' or refer to 'the PDF'. Talk naturally as a co-host.

NATURAL CONVERSATION GUIDELINES FOR JULIA (CO-HOST):
- Speak like a real, enthusiastic human co-host. Keep it very conversational, expressive, and concise.
- Actively inject quirks: include giggles ("haha!", "hehe"), vocal agreements ("mm-hmm", "yeah, totally", "oh, wow"), gasp/surprise ("gasp!"), or filler words ("um", "uh", "like", "you know").
- Speak directly in the first person. NEVER use written stage directions, asterisks, or brackets (e.g., *giggles*, [sighs]) because the text-to-speech voice will read them out loud literally. Write reactions phonetically as regular spoken text (e.g., "haha, wait, really?", "gasp, that is huge!", or "uh-huh, makes sense").
"""

    from app.services.llm import LLMService
    generated_text = LLMService.generate_text(prompt)

    # Clean response
    if generated_text.startswith("Julia:"):
        generated_text = generated_text[len("Julia:"):].strip()

    # Append to transcript
    updated_history = list(transcript_history)
    updated_history.append({"speaker": "cohost", "content": generated_text})

    return {
        **state,
        "transcript_history": updated_history,
        "last_speaker": "cohost",
        "turns_in_current_segment": state["turns_in_current_segment"] + 1,
        "new_turn_text": generated_text
    }


# Build LangGraph
workflow = StateGraph(PodcastGraphState)

workflow.add_node("moderator", moderator_node)
workflow.add_node("expert", expert_node)
workflow.add_node("cohost", cohost_node)

workflow.set_entry_point("moderator")

# Conditional routing: Moderator decides who speaks next
def route_next(state: PodcastGraphState):
    next_sp = state["next_speaker"]
    if next_sp == "expert":
        return "expert"
    elif next_sp == "cohost":
        return "cohost"
    else:
        return END

workflow.add_conditional_edges(
    "moderator",
    route_next,
    {
        "expert": "expert",
        "cohost": "cohost",
        "__end__": END
    }
)

# Expert and Co-host nodes transition to END to return state to orchestrator
workflow.add_edge("expert", END)
workflow.add_edge("cohost", END)

podcast_app = workflow.compile()


class PodcastGraphService:
    @staticmethod
    def run_next_turn(db: Session, session_id: str, user_interruption: Optional[str] = None) -> Optional[PodcastTurn]:
        """
        Executes one step of the LangGraph to generate the next podcast turn (Expert or Co-Host).
        Saves the turn and updates session state in the database.
        """
        # 1. Fetch Session state from DB
        session_obj = db.get(PodcastSession, session_id)
        if not session_obj or not session_obj.is_active:
            return None
            
        # 2. Get recent history
        history_stmt = (
            select(PodcastTurn)
            .where(PodcastTurn.session_id == session_id)
            .order_by(PodcastTurn.created_at)
        )
        turns = db.exec(history_stmt).all()
        
        transcript_history = [{"speaker": t.speaker, "content": t.content} for t in turns]
        last_speaker = "cohost" if not turns else turns[-1].speaker
        
        # Calculate turns in current segment
        # Count backwards until we hit a speaker from a different agenda topic or start of list
        turns_in_current = 0
        current_agenda_topic = session_obj.agenda.get("segments", [])[session_obj.agenda_index]["title"] if session_obj.agenda_index < len(session_obj.agenda.get("segments", [])) else None
        
        for t in reversed(turns):
            if t.agenda_topic == current_agenda_topic and t.speaker != "user":
                turns_in_current += 1
            elif t.speaker != "user":
                break
                
        # 3. Create input state
        initial_state = PodcastGraphState(
            session_id=session_id,
            document_id=session_obj.document_id,
            skill_level=session_obj.skill_level,
            agenda=session_obj.agenda,
            agenda_index=session_obj.agenda_index,
            transcript_history=transcript_history,
            last_speaker=last_speaker,
            turns_in_current_segment=turns_in_current,
            user_message=user_interruption,
            next_speaker=None,
            new_turn_text=None
        )
        
        # If the user interrupted, log the user's turn in the database first
        if user_interruption:
            user_turn = PodcastTurn(
                session_id=session_id,
                speaker="user",
                content=user_interruption,
                agenda_topic=current_agenda_topic
            )
            db.add(user_turn)
            db.commit()
            db.refresh(user_turn)
            
        # 4. Run LangGraph (execute exactly one turn cycle: moderator -> speaker -> moderator)
        # We run until the state reaches a node that finishes generating a new_turn_text
        output = podcast_app.invoke(initial_state)
        
        # 5. Check if session completed
        new_agenda_index = output["agenda_index"]
        next_speaker = output["next_speaker"]
        
        session_obj.agenda_index = new_agenda_index
        if next_speaker is None:
            session_obj.is_active = False
            
        session_obj.updated_at = datetime.utcnow()
        db.add(session_obj)
        db.commit()
        
        # 6. Save and return the generated turn
        new_text = output["new_turn_text"]
        new_speaker = output["last_speaker"] # The agent that just spoke
        
        if new_text:
            # Topic name at the time of generation
            agenda_segments = session_obj.agenda.get("segments", [])
            current_topic = agenda_segments[output["agenda_index"]]["title"] if output["agenda_index"] < len(agenda_segments) else "Conclusion"
            
            # Generate TTS audio
            voice = "en-US-AndrewMultilingualNeural" if new_speaker == "expert" else "en-US-AnaNeural"
            import uuid
            audio_filename = f"{session_id}_{uuid.uuid4().hex}.mp3"
            
            import os
            # Path points to D:\podify\backend\app\static\audio
            static_audio_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "audio")
            os.makedirs(static_audio_dir, exist_ok=True)
            audio_filepath = os.path.join(static_audio_dir, audio_filename)
            
            try:
                import asyncio
                from app.services.tts import TTSService
                asyncio.run(TTSService.generate_audio(new_text, voice, audio_filepath))
                audio_path = f"/static/audio/{audio_filename}"
            except Exception as e:
                print(f"Failed to generate TTS audio: {e}")
                audio_path = None

            db_turn = PodcastTurn(
                session_id=session_id,
                speaker=new_speaker,
                content=new_text,
                agenda_topic=current_topic,
                audio_path=audio_path
            )
            db.add(db_turn)
            db.commit()
            db.refresh(db_turn)
            return db_turn
            
        return None
