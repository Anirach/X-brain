from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

class ChatMessage(BaseModel):
    role: str = Field(..., description="Role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")
    timestamp: datetime = Field(default_factory=datetime.now)
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class ChatSession(BaseModel):
    session_id: str
    graph_id: str
    messages: List[ChatMessage]
    created_at: datetime
    updated_at: datetime
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class ChatRequest(BaseModel):
    message: str = Field(..., description="User message")
    graph_id: str = Field(..., description="Graph to query")
    session_id: Optional[str] = Field(None, description="Chat session ID")
    context_limit: Optional[int] = Field(10, description="Number of previous messages to include")
    search_limit: Optional[int] = Field(5, description="Number of graph search results to include")

class ChatResponse(BaseModel):
    response: str
    session_id: str
    message_id: str
    sources: List[Dict[str, Any]] = Field(default_factory=list, description="Graph sources used")
    reasoning: Optional[str] = Field(None, description="AI reasoning process")
    metadata: Dict[str, Any] = Field(default_factory=dict)

class RAGContext(BaseModel):
    query: str
    graph_results: List[Dict[str, Any]]
    previous_messages: List[ChatMessage]
    system_prompt: str
    metadata: Dict[str, Any]

class ChatSessionList(BaseModel):
    sessions: List[ChatSession]
    total_count: int

class SearchQuery(BaseModel):
    query: str = Field(..., description="Search query")
    graph_id: str = Field(..., description="Graph to search")
    limit: Optional[int] = Field(10, description="Maximum number of results")
    filters: Optional[Dict[str, Any]] = Field(None, description="Additional search filters")

class SearchResponse(BaseModel):
    results: List[Dict[str, Any]]
    query: str
    total_results: int
    search_time: float
    metadata: Dict[str, Any]
