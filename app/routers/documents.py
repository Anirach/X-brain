from fastapi import APIRouter, UploadFile, File, HTTPException, Form, BackgroundTasks
from typing import List, Optional
import os
import uuid
import aiofiles
from datetime import datetime
import asyncio
import logging

from app.models.document import (
    DocumentResponse, DocumentProcess, ProcessingStatus, 
    EntityExtraction, EntityResponse
)
from app.core.config import settings
from app.core.graphiti_client import graphiti_client
from app.services.document_processor import DocumentProcessor

logger = logging.getLogger(__name__)

router = APIRouter()
document_processor = DocumentProcessor()

# In-memory storage for processing status (in production, use Redis or database)
processing_status = {}

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    graph_id: str = Form(...),
    extract_entities: bool = Form(True),
    extract_relationships: bool = Form(True)
):
    """Upload and process a document"""
    
    # Validate file type
    file_extension = file.filename.split('.')[-1].lower()
    if file_extension not in settings.ALLOWED_FILE_TYPES:
        raise HTTPException(
            status_code=400, 
            detail=f"File type {file_extension} not allowed. Supported types: {settings.ALLOWED_FILE_TYPES}"
        )
    
    # Validate file size
    if file.size > settings.MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size {file.size} exceeds maximum allowed size of {settings.MAX_FILE_SIZE} bytes"
        )
    
    # Check if graph exists
    graphiti = graphiti_client.get_graph_instance(graph_id)
    if not graphiti:
        raise HTTPException(status_code=404, detail="Graph not found")
    
    try:
        # Generate unique document ID
        document_id = str(uuid.uuid4())
        
        # Save file to disk
        file_path = os.path.join(settings.UPLOAD_DIR, f"{document_id}_{file.filename}")
        
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        # Create document response
        doc_response = DocumentResponse(
            document_id=document_id,
            filename=file.filename,
            file_path=file_path,
            content_type=file.content_type,
            size=len(content),
            status="uploaded",
            uploaded_at=datetime.now(),
            processed_at=None,
            graph_id=graph_id,
            metadata={}
        )
        
        # Initialize processing status
        processing_status[document_id] = ProcessingStatus(
            document_id=document_id,
            status="queued",
            progress=0.0,
            message="Document uploaded, processing queued"
        )
        
        # Start background processing
        background_tasks.add_task(
            process_document_background,
            document_id,
            file_path,
            graph_id,
            extract_entities,
            extract_relationships
        )
        
        return doc_response
        
    except Exception as e:
        logger.error(f"Failed to upload document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to upload document: {str(e)}")

@router.get("/status/{document_id}", response_model=ProcessingStatus)
async def get_processing_status(document_id: str):
    """Get processing status of a document"""
    if document_id not in processing_status:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return processing_status[document_id]

@router.post("/extract-entities", response_model=EntityResponse)
async def extract_entities(extraction_request: EntityExtraction):
    """Extract entities from text without uploading a document"""
    try:
        result = await document_processor.extract_entities_from_text(
            extraction_request.text,
            extraction_request.entity_types
        )
        
        return EntityResponse(
            entities=result["entities"],
            relationships=result["relationships"],
            metadata=result["metadata"]
        )
        
    except Exception as e:
        logger.error(f"Failed to extract entities: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to extract entities: {str(e)}")

@router.get("/list/{graph_id}")
async def list_documents(graph_id: str):
    """List all documents associated with a graph"""
    try:
        # This would typically query a database for document records
        # For now, return a placeholder
        return {"documents": [], "total_count": 0}
        
    except Exception as e:
        logger.error(f"Failed to list documents for graph {graph_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {str(e)}")

@router.delete("/{document_id}")
async def delete_document(document_id: str):
    """Delete a document and its associated data"""
    try:
        # Remove processing status
        if document_id in processing_status:
            del processing_status[document_id]
        
        # Delete file from disk (would also remove from database in production)
        # Implementation depends on how you store document metadata
        
        return {"message": f"Document {document_id} deleted successfully"}
        
    except Exception as e:
        logger.error(f"Failed to delete document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")

async def process_document_background(
    document_id: str,
    file_path: str,
    graph_id: str,
    extract_entities: bool,
    extract_relationships: bool
):
    """Background task to process uploaded document"""
    try:
        # Update status
        processing_status[document_id].status = "processing"
        processing_status[document_id].progress = 0.1
        processing_status[document_id].message = "Starting document processing"
        
        # Process the document
        result = await document_processor.process_document(
            file_path=file_path,
            graph_id=graph_id,
            extract_entities=extract_entities,
            extract_relationships=extract_relationships,
            progress_callback=lambda p, m: update_processing_status(document_id, p, m)
        )
        
        # Update final status
        processing_status[document_id].status = "completed"
        processing_status[document_id].progress = 1.0
        processing_status[document_id].message = "Document processing completed"
        processing_status[document_id].entities_extracted = result.get("entities_count", 0)
        processing_status[document_id].relationships_extracted = result.get("relationships_count", 0)
        
    except Exception as e:
        logger.error(f"Failed to process document {document_id}: {e}")
        processing_status[document_id].status = "failed"
        processing_status[document_id].message = f"Processing failed: {str(e)}"
        processing_status[document_id].errors = [str(e)]

def update_processing_status(document_id: str, progress: float, message: str):
    """Update processing status callback"""
    if document_id in processing_status:
        processing_status[document_id].progress = progress
        processing_status[document_id].message = message
