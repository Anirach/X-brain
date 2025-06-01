from fastapi import APIRouter, HTTPException, Depends
from typing import List, Dict, Any
import uuid
import time
from datetime import datetime
import logging

from app.models.chat import (
    ChatRequest, ChatResponse, ChatSession, ChatSessionList,
    SearchQuery, SearchResponse, ChatMessage
)
from app.core.graphiti_client import graphiti_client
from app.services.rag_service import RAGService

logger = logging.getLogger(__name__)

router = APIRouter()
rag_service = RAGService()

# In-memory storage for chat sessions (in production, use database)
chat_sessions = {}

@router.post("/message", response_model=ChatResponse)
async def send_message(chat_request: ChatRequest):
    """Send a message to the AI agent"""
    try:
        start_time = time.time()
        
        # Get or create chat session
        session_id = chat_request.session_id or str(uuid.uuid4())
        
        if session_id not in chat_sessions:
            chat_sessions[session_id] = ChatSession(
                session_id=session_id,
                graph_id=chat_request.graph_id,
                messages=[],
                created_at=datetime.now(),
                updated_at=datetime.now()
            )
        
        session = chat_sessions[session_id]
        
        # Validate graph exists
        graphiti = graphiti_client.get_graph_instance(chat_request.graph_id)
        if not graphiti:
            raise HTTPException(status_code=404, detail="Graph not found")
        
        # Add user message to session
        user_message = ChatMessage(
            role="user",
            content=chat_request.message,
            timestamp=datetime.now()
        )
        session.messages.append(user_message)
        
        # Generate AI response using RAG
        response_data = await rag_service.generate_response(
            query=chat_request.message,
            graph_id=chat_request.graph_id,
            chat_history=session.messages[-chat_request.context_limit:] if chat_request.context_limit else [],
            search_limit=chat_request.search_limit
        )
        
        # Add assistant message to session
        assistant_message = ChatMessage(
            role="assistant",
            content=response_data["response"],
            timestamp=datetime.now(),
            metadata=response_data.get("metadata", {})
        )
        session.messages.append(assistant_message)
        
        # Update session
        session.updated_at = datetime.now()
        
        response_time = time.time() - start_time
        
        return ChatResponse(
            response=response_data["response"],
            session_id=session_id,
            message_id=str(uuid.uuid4()),
            sources=response_data.get("sources", []),
            reasoning=response_data.get("reasoning"),
            metadata={
                "response_time": response_time,
                "search_results_count": len(response_data.get("sources", [])),
                **response_data.get("metadata", {})
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to process chat message: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to process message: {str(e)}")

@router.get("/sessions", response_model=ChatSessionList)
async def list_chat_sessions(graph_id: str = None):
    """List chat sessions, optionally filtered by graph ID"""
    try:
        sessions = list(chat_sessions.values())
        
        if graph_id:
            sessions = [s for s in sessions if s.graph_id == graph_id]
        
        return ChatSessionList(
            sessions=sessions,
            total_count=len(sessions)
        )
        
    except Exception as e:
        logger.error(f"Failed to list chat sessions: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list chat sessions: {str(e)}")

@router.get("/sessions/{session_id}", response_model=ChatSession)
async def get_chat_session(session_id: str):
    """Get a specific chat session"""
    if session_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    return chat_sessions[session_id]

@router.delete("/sessions/{session_id}")
async def delete_chat_session(session_id: str):
    """Delete a chat session"""
    if session_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    del chat_sessions[session_id]
    return {"message": f"Chat session {session_id} deleted successfully"}

@router.post("/search", response_model=SearchResponse)
async def search_graph(search_query: SearchQuery):
    """Search the knowledge graph"""
    try:
        start_time = time.time()
        
        # Validate graph exists
        graphiti = graphiti_client.get_graph_instance(search_query.graph_id)
        if not graphiti:
            raise HTTPException(status_code=404, detail="Graph not found")
        
        # Perform search
        results = graphiti_client.search_graph(
            graph_id=search_query.graph_id,
            query=search_query.query,
            limit=search_query.limit
        )
        
        search_time = time.time() - start_time
        
        return SearchResponse(
            results=results,
            query=search_query.query,
            total_results=len(results),
            search_time=search_time,
            metadata={
                "graph_id": search_query.graph_id,
                "filters": search_query.filters or {}
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to search graph: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search graph: {str(e)}")

@router.post("/sessions/{session_id}/clear")
async def clear_chat_session(session_id: str):
    """Clear messages from a chat session"""
    if session_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    session = chat_sessions[session_id]
    session.messages = []
    session.updated_at = datetime.now()
    
    return {"message": f"Chat session {session_id} cleared successfully"}

@router.get("/sessions/{session_id}/export")
async def export_chat_session(session_id: str):
    """Export chat session as JSON"""
    if session_id not in chat_sessions:
        raise HTTPException(status_code=404, detail="Chat session not found")
    
    session = chat_sessions[session_id]
    
    # Convert to exportable format
    export_data = {
        "session_id": session.session_id,
        "graph_id": session.graph_id,
        "created_at": session.created_at.isoformat(),
        "updated_at": session.updated_at.isoformat(),
        "messages": [
            {
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp.isoformat(),
                "metadata": msg.metadata
            }
            for msg in session.messages
        ],
        "metadata": session.metadata
    }
    
    return export_data
