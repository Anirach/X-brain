import os
import fitz  # PyMuPDF
from pdfminer.high_level import extract_text as pdf_extract_text
from openai import OpenAI
from typing import Dict, Any, List, Optional, Callable
import logging
from datetime import datetime
import json

from app.core.config import settings
from app.core.graphiti_client import graphiti_client

logger = logging.getLogger(__name__)

class DocumentProcessor:
    def __init__(self):
        self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    
    async def process_document(
        self,
        file_path: str,
        graph_id: str,
        extract_entities: bool = True,
        extract_relationships: bool = True,
        progress_callback: Optional[Callable[[float, str], None]] = None
    ) -> Dict[str, Any]:
        """Process a document and add it to the knowledge graph"""
        
        try:
            if progress_callback:
                progress_callback(0.1, "Extracting text from document")
            
            # Extract text based on file type
            text_content = await self._extract_text(file_path)
            
            if progress_callback:
                progress_callback(0.3, "Text extraction completed")
            
            # Split into chunks for processing
            chunks = self._split_text_into_chunks(text_content)
            
            if progress_callback:
                progress_callback(0.4, f"Split document into {len(chunks)} chunks")
            
            # Process each chunk
            total_entities = 0
            total_relationships = 0
            
            for i, chunk in enumerate(chunks):
                if progress_callback:
                    progress = 0.4 + (0.5 * (i + 1) / len(chunks))
                    progress_callback(progress, f"Processing chunk {i + 1}/{len(chunks)}")
                
                # Extract entities and relationships if requested
                if extract_entities or extract_relationships:
                    extraction_result = await self.extract_entities_from_text(
                        text=chunk,
                        entity_types=None
                    )
                    total_entities += len(extraction_result["entities"])
                    total_relationships += len(extraction_result["relationships"])
                
                # Add to graph
                await self._add_chunk_to_graph(
                    chunk, graph_id, 
                    metadata={
                        "source": os.path.basename(file_path),
                        "chunk_index": i,
                        "total_chunks": len(chunks)
                    }
                )
            
            if progress_callback:
                progress_callback(0.9, "Adding document to knowledge graph")
            
            # Add entire document to graph as well
            graphiti_client.add_documents_to_graph(
                graph_id=graph_id,
                documents=[text_content],
                metadata={
                    "source": os.path.basename(file_path),
                    "file_path": file_path,
                    "processed_at": datetime.now().isoformat()
                }
            )
            
            if progress_callback:
                progress_callback(1.0, "Document processing completed")
            
            return {
                "success": True,
                "entities_count": total_entities,
                "relationships_count": total_relationships,
                "chunks_processed": len(chunks),
                "text_length": len(text_content)
            }
            
        except Exception as e:
            logger.error(f"Failed to process document {file_path}: {e}")
            raise e
    
    async def _extract_text(self, file_path: str) -> str:
        """Extract text from document based on file type"""
        file_extension = os.path.splitext(file_path)[1].lower()
        
        if file_extension == '.pdf':
            return await self._extract_text_from_pdf(file_path)
        elif file_extension == '.txt':
            return await self._extract_text_from_txt(file_path)
        else:
            raise ValueError(f"Unsupported file type: {file_extension}")
    
    async def _extract_text_from_pdf(self, file_path: str) -> str:
        """Extract text from PDF using PyMuPDF"""
        try:
            doc = fitz.open(file_path)
            text_content = ""
            
            for page_num in range(doc.page_count):
                page = doc[page_num]
                text_content += page.get_text() + "\n"
            
            doc.close()
            return text_content
            
        except Exception as e:
            logger.warning(f"PyMuPDF failed, trying pdfminer: {e}")
            # Fallback to pdfminer
            return pdf_extract_text(file_path)
    
    async def _extract_text_from_txt(self, file_path: str) -> str:
        """Extract text from TXT file"""
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    
    def _split_text_into_chunks(self, text: str, chunk_size: int = 4000, overlap: int = 200) -> List[str]:
        """Split text into overlapping chunks"""
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            
            # Try to end at a sentence boundary
            if end < len(text):
                # Look for sentence end within last 200 characters
                sentence_end = text.rfind('.', start + chunk_size - 200, end)
                if sentence_end > start:
                    end = sentence_end + 1
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            start = end - overlap
        
        return chunks
    
    async def extract_entities_from_text(
        self, 
        text: str, 
        entity_types: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Extract entities and relationships from text using OpenAI"""
        
        try:
            entity_types_str = ", ".join(entity_types) if entity_types else "Person, Organization, Location, Event, Concept, Date, Product, Technology"
            
            prompt = f"""
            Extract entities and relationships from the following text. 
            
            Entity types to focus on: {entity_types_str}
            
            Return the result as a JSON object with the following structure:
            {{
                "entities": [
                    {{
                        "name": "entity name",
                        "type": "entity type",
                        "description": "brief description",
                        "properties": {{"key": "value"}}
                    }}
                ],
                "relationships": [
                    {{
                        "source": "source entity name",
                        "target": "target entity name",
                        "relationship": "relationship type",
                        "description": "relationship description",
                        "properties": {{"key": "value"}}
                    }}
                ]
            }}
            
            Text to analyze:
            {text}
            """
            
            response = self.openai_client.chat.completions.create(
                model=settings.GRAPHITI_LLM_MODEL,
                messages=[
                    {"role": "system", "content": "You are an expert at extracting structured knowledge from text. Always return valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1
            )
            
            result_text = response.choices[0].message.content
            
            # Parse JSON response
            try:
                result = json.loads(result_text)
            except json.JSONDecodeError:
                # Try to extract JSON from response if it's wrapped in markdown
                if "```json" in result_text:
                    json_start = result_text.find("```json") + 7
                    json_end = result_text.find("```", json_start)
                    result_text = result_text[json_start:json_end]
                    result = json.loads(result_text)
                else:
                    raise ValueError("Invalid JSON response from OpenAI")
            
            return {
                "entities": result.get("entities", []),
                "relationships": result.get("relationships", []),
                "metadata": {
                    "model_used": settings.GRAPHITI_LLM_MODEL,
                    "text_length": len(text),
                    "extraction_time": datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to extract entities from text: {e}")
            raise e
    
    async def _add_chunk_to_graph(self, chunk: str, graph_id: str, metadata: Dict[str, Any]):
        """Add a text chunk to the knowledge graph"""
        try:
            graphiti_client.add_documents_to_graph(
                graph_id=graph_id,
                documents=[chunk],
                metadata=metadata
            )
        except Exception as e:
            logger.error(f"Failed to add chunk to graph {graph_id}: {e}")
            raise e
