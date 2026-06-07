from fastapi import APIRouter
from app.api.endpoints import documents, sessions

api_router = APIRouter()

api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
