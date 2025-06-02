import os
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # API Settings
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = True
    
    # OpenAI Settings
    OPENAI_API_KEY: str
    
    # Neo4j Settings
    NEO4J_URI: str = "bolt://localhost:7687"
    NEO4J_USERNAME: str = "neo4j"
    NEO4J_PASSWORD: str
    NEO4J_DATABASE: str = "neo4j"
    
    # Graphiti Settings
    GRAPHITI_EMBEDDING_MODEL: str = "text-embedding-3-small"
    GRAPHITI_LLM_MODEL: str = "gpt-4"
    
    # File Upload Settings
    MAX_FILE_SIZE: int = 10485760  # 10MB
    UPLOAD_DIR: str = "./uploads"
    ALLOWED_FILE_TYPES: list = ["pdf", "txt"]
    
    # Processing Settings
    USE_MOCK_EXTRACTION: bool = True  # Set to False for real OpenAI extraction in production
    MAX_CHUNKS_PER_DOCUMENT: int = 3  # Limit chunks for faster demo processing
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
