import google.generativeai as genai
import json
from typing import Dict, Any, List
from app.core.config import settings
from app.models.document import DocumentChunk
from sqlmodel import Session, select

class PodcastPlanner:
    @staticmethod
    def _configure_genai():
        genai.configure(api_key=settings.GEMINI_API_KEY)

    @classmethod
    def generate_agenda(cls, session_db: Session, document_id: int, title: str) -> Dict[str, Any]:
        """
        Retrieves representative pages of the document and generates a 6-segment discussion outline.
        Uses structured JSON output from Gemini.
        """
        cls._configure_genai()
        
        # Retrieve the first 3 chunks and last 2 chunks of the document to form a preview
        # which represents introduction, table of contents, and conclusion.
        chunks_stmt = (
            select(DocumentChunk)
            .where(DocumentChunk.document_id == document_id)
            .order_by(DocumentChunk.chunk_index)
        )
        all_chunks = session_db.exec(chunks_stmt).all()
        
        if not all_chunks:
            # Fallback if no chunks stored yet
            document_content_sample = f"Document Title: {title}"
        else:
            intro_chunks = all_chunks[:4]
            outro_chunks = all_chunks[-2:] if len(all_chunks) > 4 else []
            
            sample_texts = [c.content for c in intro_chunks]
            if outro_chunks:
                sample_texts.append("... [Content Truncated] ...")
                sample_texts.extend([c.content for c in outro_chunks])
                
            document_content_sample = "\n\n".join(sample_texts)

        prompt = f"""
You are an expert Podcast Producer and Script Outline Planner.
Your job is to analyze the document content below and create a structured 6-segment discussion agenda for a podcast hosted by two people:
1. An Expert Host: knowledgeable, technical, authoritative.
2. A Curious Co-Host: asking simplifying questions, translating technical terms.

The podcast must cover the document comprehensively, moving from basic context to deep technical concepts, then limitations/applications, and final takeaways.

DOCUMENT TITLE: {title}
DOCUMENT REPRESENTATIVE SAMPLE CONTENT:
{document_content_sample}

Generate a JSON object matching this exact schema:
{{
  "title": "A catchy title for the podcast episode (e.g. 'Demystifying [Concept]')",
  "summary": "A brief summary of what this document is about and what the podcast will cover.",
  "segments": [
    {{
      "id": 0,
      "title": "Introduction & Hook",
      "description": "Establish the background context, why this topic matters, and the primary problem the document addresses.",
      "goals": [
        "Introduce the main thesis of the document.",
        "Provide an analogy or hook for the listener."
      ]
    }},
    {{
      "id": 1,
      "title": "Core Concept / Methodology",
      "description": "Explain the core mechanics, how it works, and the definitions.",
      "goals": [
        "Explain the main mechanism of the document.",
        "Highlight the primary terms used."
      ]
    }},
    {{
      "id": 2,
      "title": "Technical Deep Dive",
      "description": "Detail the technical architecture, implementation, or specifics of the document.",
      "goals": [
        "Provide details on the underlying technical processes.",
        "Debate technical complexities."
      ]
    }},
    {{
      "id": 3,
      "title": "Applications & Use Cases",
      "description": "Discuss where this method/information applies and how it can be used practically.",
      "goals": [
        "List concrete real-world use cases.",
        "Discuss who benefits from this."
      ]
    }},
    {{
      "id": 4,
      "title": "Limitations, Criticisms & Challenges",
      "description": "Examine what the document got wrong, the limitations of the work, or challenges in implementing it.",
      "goals": [
        "Address limitations or missing details in the work.",
        "Highlight security, cost, or implementation challenges."
      ]
    }},
    {{
      "id": 5,
      "title": "Key Takeaways & Wrap-up",
      "description": "Summarize the key points, final conclusions, and wrap up the discussion.",
      "goals": [
        "Summarize the top three takeaways.",
        "Provide a closing wrap-up question/statement."
      ]
    }}
  ]
}}

Make sure you write detailed, document-specific goals in each segment based on the sample content. Do not generate generic placeholders.
"""

        from app.services.llm import LLMService
        response_text = LLMService.generate_text(prompt, response_json=True)
        
        try:
            agenda = json.loads(response_text)
            return agenda
        except Exception as e:
            # Fallback agenda if JSON parsing fails
            return {
                "title": f"Discussing {title}",
                "summary": "An analysis of the uploaded document.",
                "segments": [
                    {
                        "id": i,
                        "title": f"Topic Segment {i+1}",
                        "description": "Discussing key aspects of the document.",
                        "goals": ["Explore primary elements.", "Provide analysis."]
                    }
                    for i in range(6)
                ]
            }
