from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class DocumentUpload(BaseModel):
    filename: str
    content_type: str
    size: int

class DocumentProcess(BaseModel):
    graph_id: str
    source_metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    extract_entities: bool = Field(True, description="Whether to extract entities")
    extract_relationships: bool = Field(True, description="Whether to extract relationships")

class DocumentResponse(BaseModel):
    document_id: str
    filename: str
    file_path: str
    content_type: str
    size: int
    status: str  # "uploaded", "processing", "completed", "failed"
    uploaded_at: datetime
    processed_at: Optional[datetime]
    graph_id: Optional[str]
    metadata: Optional[Dict[str, Any]] = {}

class ProcessingStatus(BaseModel):
    document_id: str
    status: str
    progress: float  # 0.0 to 1.0
    message: Optional[str]
    entities_extracted: Optional[int]
    relationships_extracted: Optional[int]
    errors: Optional[List[str]]

class EntityExtraction(BaseModel):
    text: str
    entity_types: Optional[List[str]] = Field(None, description="Specific entity types to extract")

class EntityResponse(BaseModel):
    entities: List[Dict[str, Any]]
    relationships: List[Dict[str, Any]]
    metadata: Dict[str, Any]
