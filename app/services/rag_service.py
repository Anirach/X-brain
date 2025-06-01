from openai import OpenAI
from typing import List, Dict, Any, Optional
import logging
from datetime import datetime
import json

from app.core.config import settings
from app.core.graphiti_client import graphiti_client
from app.models.chat import ChatMessage

logger = logging.getLogger(__name__)

class RAGService:
    def __init__(self):
        self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.system_prompt = """
        You are an intelligent AI assistant with access to a temporal knowledge graph. 
        Your role is to help users understand and explore information stored in the graph.
        
        When answering questions:
        1. Use the provided graph context to inform your responses
        2. Be specific about information sources when available
        3. If information is not in the graph, clearly state that
        4. Consider temporal relationships and how information has evolved over time
        5. Provide reasoning for your answers when helpful
        
        You have access to relevant nodes and relationships from the knowledge graph based on the user's query.
        """
    
    async def generate_response(
        self,
        query: str,
        graph_id: str,
        chat_history: List[ChatMessage] = None,
        search_limit: int = 5
    ) -> Dict[str, Any]:
        """Generate AI response using RAG pipeline"""
        
        try:
            # Step 1: Search the knowledge graph
            search_results = graphiti_client.search_graph(
                graph_id=graph_id,
                query=query,
                limit=search_limit
            )
            
            # Step 2: Prepare context
            context = self._prepare_context(search_results, chat_history or [])
            
            # Step 3: Generate response
            response = await self._generate_llm_response(query, context)
            
            # Step 4: Extract reasoning and sources
            reasoning = self._extract_reasoning(response, search_results)
            sources = self._format_sources(search_results)
            
            return {
                "response": response,
                "sources": sources,
                "reasoning": reasoning,
                "metadata": {
                    "search_results_count": len(search_results),
                    "model_used": settings.GRAPHITI_LLM_MODEL,
                    "graph_id": graph_id,
                    "generated_at": datetime.now().isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to generate RAG response: {e}")
            raise e
    
    def _prepare_context(self, search_results: List[Dict[str, Any]], chat_history: List[ChatMessage]) -> str:
        """Prepare context from graph search results and chat history"""
        
        context_parts = []
        
        # Add recent chat history
        if chat_history:
            context_parts.append("## Recent Conversation:")
            for message in chat_history[-6:]:  # Last 6 messages
                role = "Human" if message.role == "user" else "Assistant"
                context_parts.append(f"{role}: {message.content}")
            context_parts.append("")
        
        # Add graph search results
        if search_results:
            context_parts.append("## Relevant Knowledge from Graph:")
            for i, result in enumerate(search_results, 1):
                context_parts.append(f"{i}. **{result.get('type', 'Unknown')}**: {result.get('content', '')}")
                
                # Add metadata if available
                if result.get('metadata'):
                    metadata_str = ", ".join([f"{k}: {v}" for k, v in result['metadata'].items() if v])
                    if metadata_str:
                        context_parts.append(f"   Metadata: {metadata_str}")
                
                # Add relevance score
                if 'score' in result:
                    context_parts.append(f"   Relevance: {result['score']:.2f}")
                
                context_parts.append("")
        else:
            context_parts.append("## Knowledge Graph Search:")
            context_parts.append("No directly relevant information found in the knowledge graph for this query.")
            context_parts.append("")
        
        return "\n".join(context_parts)
    
    async def _generate_llm_response(self, query: str, context: str) -> str:
        """Generate response using OpenAI with provided context"""
        
        try:
            messages = [
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": f"""
                Context from knowledge graph and conversation history:
                {context}
                
                User question: {query}
                
                Please provide a helpful and accurate response based on the available context. 
                If the context doesn't contain relevant information, clearly state that and provide 
                general guidance if appropriate.
                """}
            ]
            
            response = self.openai_client.chat.completions.create(
                model=settings.GRAPHITI_LLM_MODEL,
                messages=messages,
                temperature=0.7,
                max_tokens=1000
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Failed to generate LLM response: {e}")
            raise e
    
    def _extract_reasoning(self, response: str, search_results: List[Dict[str, Any]]) -> Optional[str]:
        """Extract reasoning from the response (simplified implementation)"""
        
        # This could be enhanced to ask the LLM to provide explicit reasoning
        # For now, provide basic reasoning about source usage
        
        if not search_results:
            return "Response generated without specific graph context due to no relevant search results."
        
        source_types = list(set([result.get('type', 'Unknown') for result in search_results]))
        reasoning = f"Response generated using {len(search_results)} relevant graph nodes of types: {', '.join(source_types)}"
        
        return reasoning
    
    def _format_sources(self, search_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Format search results as sources for the response"""
        
        sources = []
        for result in search_results:
            source = {
                "node_id": result.get("node_id"),
                "type": result.get("type", "Unknown"),
                "content": result.get("content", ""),
                "relevance_score": result.get("score", 0.0),
                "metadata": result.get("metadata", {})
            }
            sources.append(source)
        
        return sources
    
    async def summarize_conversation(self, messages: List[ChatMessage]) -> str:
        """Generate a summary of the conversation"""
        
        try:
            conversation_text = "\n".join([
                f"{msg.role.title()}: {msg.content}" 
                for msg in messages
            ])
            
            response = self.openai_client.chat.completions.create(
                model=settings.GRAPHITI_LLM_MODEL,
                messages=[
                    {"role": "system", "content": "Summarize the following conversation concisely, highlighting key topics and outcomes."},
                    {"role": "user", "content": conversation_text}
                ],
                temperature=0.3,
                max_tokens=200
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Failed to summarize conversation: {e}")
            return "Unable to generate conversation summary."
    
    async def extract_intent(self, query: str) -> Dict[str, Any]:
        """Extract user intent from query"""
        
        try:
            response = self.openai_client.chat.completions.create(
                model=settings.GRAPHITI_LLM_MODEL,
                messages=[
                    {"role": "system", "content": """
                    Analyze the user's query and extract the intent. Return JSON with:
                    {
                        "intent_type": "search|question|command|exploration",
                        "entities": ["list of entities mentioned"],
                        "temporal_context": "any time-related context",
                        "complexity": "simple|medium|complex"
                    }
                    """},
                    {"role": "user", "content": query}
                ],
                temperature=0.1
            )
            
            result_text = response.choices[0].message.content
            try:
                return json.loads(result_text)
            except json.JSONDecodeError:
                return {
                    "intent_type": "question",
                    "entities": [],
                    "temporal_context": "",
                    "complexity": "medium"
                }
                
        except Exception as e:
            logger.error(f"Failed to extract intent: {e}")
            return {
                "intent_type": "question",
                "entities": [],
                "temporal_context": "",
                "complexity": "medium"
            }
