import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    PROJECT_NAME: str = "Podify Backend"
    
    # Database
    DATABASE_URL: str = Field(default="postgresql://postgres:postgres@localhost:5432/podify")
    
    # Gemini API Key
    GEMINI_API_KEY: str = Field(default="")
    
    # Groq API Key
    GROQ_API_KEY: str = Field(default="")
    
    # CORS Origins (Allowed Frontend URL)
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    
    # Text to Speech configuration (Optional API Keys)
    ELEVENLABS_API_KEY: str = Field(default="")
    OPENAI_API_KEY: str = Field(default="")
    
    # Cerebras API Key
    CEREBRAS_API_KEY: str = Field(default="")

settings = Settings()
