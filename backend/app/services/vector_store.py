import google.generativeai as genai
from sqlmodel import Session, select
from typing import List, Dict, Any
from app.core.config import settings
from app.models.document import DocumentChunk

class VectorStore:
    @staticmethod
    def _configure_genai():
        """Configure the Gemini API key."""
        genai.configure(api_key=settings.GEMINI_API_KEY)

    @classmethod
    def get_embedding(cls, text: str, is_query: bool = False) -> List[float]:
      """
      Generates embedding vector for a given text using Gemini's gemini-embedding-001.
      """
      cls._configure_genai()
      task_type = "retrieval_query" if is_query else "retrieval_document"
      
      response = genai.embed_content(
          model="models/gemini-embedding-001",
          content=text,
          task_type=task_type,
          output_dimensionality=768
      )
      return response["embedding"]

    @classmethod
    def get_embeddings_batch(cls, texts: List[str]) -> List[List[float]]:
      """
      Generates embeddings for a batch of texts to optimize API calls.
      """
      cls._configure_genai()
      response = genai.embed_content(
          model="models/gemini-embedding-001",
          content=texts,
          task_type="retrieval_document",
          output_dimensionality=768
      )
      return response["embedding"]

    @classmethod
    def store_chunks(cls, session: Session, document_id: int, chunks: List[Dict[str, Any]]) -> None:
        """
        Generates embeddings for a list of document chunks and saves them to database.
        """
        # Batch generate embeddings in chunks of 50 to prevent hitting API limits
        batch_size = 50
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            contents = [c["content"] for c in batch]
            embeddings = cls.get_embeddings_batch(contents)
            
            for chunk_data, embedding in zip(batch, embeddings):
                db_chunk = DocumentChunk(
                    document_id=document_id,
                    page_number=chunk_data["page_number"],
                    chunk_index=chunk_data["chunk_index"],
                    content=chunk_data["content"],
                    embedding=embedding
                )
                session.add(db_chunk)
        
        session.commit()

    @classmethod
    def similarity_search(cls, session: Session, document_id: int, query: str, k: int = 5) -> List[DocumentChunk]:
        """
        Performs semantic search against stored document chunks using pgvector cosine distance.
        """
        query_vector = cls.get_embedding(query, is_query=True)
        
        # pgvector similarity query: sort by cosine_distance
        statement = (
            select(DocumentChunk)
            .where(DocumentChunk.document_id == document_id)
            .order_by(DocumentChunk.embedding.cosine_distance(query_vector))
            .limit(k)
        )
        
        results = session.exec(statement).all()
        return results
