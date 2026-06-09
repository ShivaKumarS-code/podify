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
    
    # JWT Configuration
    JWT_SECRET: str = Field(default="super-secret-jwt-key-change-in-env")
    JWT_ALGORITHM: str = Field(default="HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=1440) # 24 hours
    
    # CORS Origins (Allowed Frontend URL)

    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://podify-sigma.vercel.app"
    ]
    
    # Text to Speech configuration (Optional API Keys)
    ELEVENLABS_API_KEY: str = Field(default="")
    OPENAI_API_KEY: str = Field(default="")
    
    # Cerebras API Key
    CEREBRAS_API_KEY: str = Field(default="")

settings = Settings()
