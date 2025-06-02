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
            
            # Split into chunks for processing (optimized for speed)
            chunks = self._split_text_into_chunks(text_content, chunk_size=8000, overlap=400)
            
            # Limit chunks during development to avoid timeouts
            max_chunks = settings.MAX_CHUNKS_PER_DOCUMENT
            chunks = chunks[:max_chunks]
            
            if progress_callback:
                progress_callback(0.4, f"Split document into {len(chunks)} chunks (limited to {max_chunks} for demo)")
            
            # Process chunks with optimized entity extraction
            total_entities = 0
            total_relationships = 0
            
            for i, chunk in enumerate(chunks):
                if progress_callback:
                    progress = 0.4 + (0.4 * (i + 1) / len(chunks))
                    progress_callback(progress, f"Processing chunk {i + 1}/{len(chunks)}")
                
                # Extract entities and relationships if requested (with timeout protection)
                if extract_entities or extract_relationships:
                    try:
                        extraction_result = await self.extract_entities_from_text(
                            text=chunk,
                            entity_types=None
                        )
                        total_entities += len(extraction_result["entities"])
                        total_relationships += len(extraction_result["relationships"])
                    except Exception as e:
                        logger.warning(f"Entity extraction failed for chunk {i}: {e}")
                        # Continue processing even if extraction fails
                
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
                progress_callback(0.8, "Adding document to knowledge graph")
            
            # Add entire document to graph as well
            graphiti_client.add_documents_to_graph(
                graph_id=graph_id,
                documents=[text_content[:10000]],  # Limit to first 10k chars for demo
                metadata={
                    "source": os.path.basename(file_path),
                    "file_path": file_path,
                    "processed_at": datetime.now().isoformat(),
                    "full_text_length": len(text_content),
                    "chunks_processed": len(chunks)
                }
            )
            
            if progress_callback:
                progress_callback(1.0, "Document processing completed successfully")
            
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
        """Extract entities and relationships from text using OpenAI (optimized for speed)"""
        
        try:
            # For development/demo: Use mock extraction to avoid API delays
            # In production, you can enable real OpenAI extraction by setting USE_MOCK_EXTRACTION=False
            USE_MOCK_EXTRACTION = settings.USE_MOCK_EXTRACTION
            
            if USE_MOCK_EXTRACTION:
                return await self._mock_extract_entities(text, entity_types)
            
            # Real OpenAI extraction with timeout protection
            entity_types_str = ", ".join(entity_types) if entity_types else "Person, Organization, Location, Event, Concept, Date, Product, Technology"
            
            # Truncate text if too long to avoid timeouts
            max_text_length = 8000  # Reduced from default to speed up processing
            if len(text) > max_text_length:
                text = text[:max_text_length] + "... [truncated]"
            
            prompt = f"""
            Extract key entities and relationships from the following text. Focus on the most important ones.
            
            Entity types: {entity_types_str}
            
            Return JSON:
            {{
                "entities": [{{"name": "...", "type": "...", "description": "..."}}],
                "relationships": [{{"source": "...", "target": "...", "relationship": "..."}}]
            }}
            
            Text: {text}
            """
            
            # Add timeout to prevent hanging
            import asyncio
            
            async def make_api_call():
                response = self.openai_client.chat.completions.create(
                    model=settings.GRAPHITI_LLM_MODEL,
                    messages=[
                        {"role": "system", "content": "Extract structured knowledge as JSON. Be concise."},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.1,
                    max_tokens=1500,  # Limit response size
                    timeout=15  # 15 second timeout
                )
                return response.choices[0].message.content
            
            # Use asyncio timeout as additional protection
            result_text = await asyncio.wait_for(make_api_call(), timeout=20.0)
            
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
                    # Fall back to mock if JSON parsing fails
                    logger.warning("Failed to parse OpenAI JSON response, falling back to mock")
                    return await self._mock_extract_entities(text, entity_types)
            
            return {
                "entities": result.get("entities", []),
                "relationships": result.get("relationships", []),
                "metadata": {
                    "model_used": settings.GRAPHITI_LLM_MODEL,
                    "text_length": len(text),
                    "extraction_time": datetime.now().isoformat(),
                    "extraction_method": "openai"
                }
            }
            
        except asyncio.TimeoutError:
            logger.warning("OpenAI API call timed out, falling back to mock extraction")
            return await self._mock_extract_entities(text, entity_types)
        except Exception as e:
            logger.error(f"Failed to extract entities from text: {e}, falling back to mock")
            return await self._mock_extract_entities(text, entity_types)
    
    async def _mock_extract_entities(self, text: str, entity_types: Optional[List[str]] = None) -> Dict[str, Any]:
        """Mock entity extraction for fast development/demo processing"""
        import re
        import random
        
        # Simple keyword-based entity extraction for demo
        entities = []
        relationships = []
        
        # Look for common entity patterns
        words = text.split()[:100]  # Limit to first 100 words for speed
        
        # Mock entities based on simple patterns
        entity_candidates = []
        
        # Capitalized words (potential proper nouns)
        for word in words:
            word_clean = re.sub(r'[^\w\s]', '', word)
            if word_clean and word_clean[0].isupper() and len(word_clean) > 2:
                entity_candidates.append(word_clean)
        
        # Create mock entities from candidates
        entity_types_list = entity_types or ["Person", "Organization", "Location", "Concept", "Technology"]
        
        for i, candidate in enumerate(entity_candidates[:10]):  # Limit to 10 entities
            entity_type = random.choice(entity_types_list)
            entities.append({
                "name": candidate,
                "type": entity_type,
                "description": f"A {entity_type.lower()} mentioned in the document",
                "properties": {"source": "mock_extraction", "confidence": 0.8}
            })
        
        # Create mock relationships between entities
        for i in range(min(len(entities) - 1, 5)):  # Limit to 5 relationships
            relationships.append({
                "source": entities[i]["name"],
                "target": entities[i + 1]["name"],
                "relationship": "RELATES_TO",
                "description": f"Connection between {entities[i]['name']} and {entities[i + 1]['name']}",
                "properties": {"confidence": 0.7, "type": "contextual"}
            })
        
        return {
            "entities": entities,
            "relationships": relationships,
            "metadata": {
                "text_length": len(text),
                "extraction_time": datetime.now().isoformat(),
                "extraction_method": "mock",
                "note": "Mock extraction for development - replace with real extraction when needed"
            }
        }

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
