from graphiti import Graphiti
from openai import OpenAI
from app.core.config import settings
import logging
from typing import Dict, List, Any, Optional
import uuid
from datetime import datetime

logger = logging.getLogger(__name__)

class GraphitiClient:
    def __init__(self):
        self.openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.graphiti_instances: Dict[str, Graphiti] = {}
    
    def create_graph_instance(self, graph_name: str) -> str:
        """Create a new Graphiti graph instance"""
        graph_id = str(uuid.uuid4())
        
        try:
            # Initialize Graphiti with Neo4j backend
            graphiti = Graphiti(
                uri=settings.NEO4J_URI,
                user=settings.NEO4J_USERNAME,
                password=settings.NEO4J_PASSWORD,
                database=f"graph_{graph_id}",  # Separate database per graph
                llm_client=self.openai_client,
                embedding_model=settings.GRAPHITI_EMBEDDING_MODEL,
                llm_model=settings.GRAPHITI_LLM_MODEL
            )
            
            self.graphiti_instances[graph_id] = graphiti
            logger.info(f"Created new graph instance: {graph_id} with name: {graph_name}")
            
            # Store graph metadata
            self._store_graph_metadata(graph_id, graph_name)
            
            return graph_id
            
        except Exception as e:
            logger.error(f"Failed to create graph instance: {e}")
            raise e
    
    def get_graph_instance(self, graph_id: str) -> Optional[Graphiti]:
        """Get an existing Graphiti graph instance"""
        if graph_id not in self.graphiti_instances:
            # Try to load existing graph
            try:
                graphiti = Graphiti(
                    uri=settings.NEO4J_URI,
                    user=settings.NEO4J_USERNAME,
                    password=settings.NEO4J_PASSWORD,
                    database=f"graph_{graph_id}",
                    llm_client=self.openai_client,
                    embedding_model=settings.GRAPHITI_EMBEDDING_MODEL,
                    llm_model=settings.GRAPHITI_LLM_MODEL
                )
                self.graphiti_instances[graph_id] = graphiti
                logger.info(f"Loaded existing graph instance: {graph_id}")
            except Exception as e:
                logger.error(f"Failed to load graph instance {graph_id}: {e}")
                return None
        
        return self.graphiti_instances.get(graph_id)
    
    def list_graphs(self) -> List[Dict[str, Any]]:
        """List all available graph instances"""
        # This would query the metadata storage to list all graphs
        # For now, return active instances
        graphs = []
        for graph_id in self.graphiti_instances.keys():
            metadata = self._get_graph_metadata(graph_id)
            graphs.append({
                "graph_id": graph_id,
                "name": metadata.get("name", "Unnamed Graph"),
                "created_at": metadata.get("created_at"),
                "node_count": self._get_node_count(graph_id),
                "edge_count": self._get_edge_count(graph_id)
            })
        return graphs
    
    def add_documents_to_graph(self, graph_id: str, documents: List[str], metadata: Dict[str, Any] = None):
        """Add documents to a graph instance"""
        graphiti = self.get_graph_instance(graph_id)
        if not graphiti:
            raise ValueError(f"Graph instance {graph_id} not found")
        
        try:
            for doc in documents:
                # Add temporal metadata
                doc_metadata = {
                    "timestamp": datetime.now().isoformat(),
                    "source": metadata.get("source", "unknown"),
                    **(metadata or {})
                }
                
                # Process document with Graphiti
                graphiti.add_episode(
                    name=f"doc_{uuid.uuid4()}",
                    episode_body=doc,
                    source=doc_metadata
                )
                
            logger.info(f"Added {len(documents)} documents to graph {graph_id}")
            
        except Exception as e:
            logger.error(f"Failed to add documents to graph {graph_id}: {e}")
            raise e
    
    def search_graph(self, graph_id: str, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Search the graph for relevant information"""
        graphiti = self.get_graph_instance(graph_id)
        if not graphiti:
            raise ValueError(f"Graph instance {graph_id} not found")
        
        try:
            # Use Graphiti's search functionality
            results = graphiti.search(
                query=query,
                center_node_uuid=None,  # Search entire graph
                num_results=limit
            )
            
            return [
                {
                    "node_id": result.uuid,
                    "content": result.name,
                    "type": result.labels[0] if result.labels else "Unknown",
                    "score": getattr(result, 'score', 0.0),
                    "metadata": result.summary if hasattr(result, 'summary') else {}
                }
                for result in results
            ]
            
        except Exception as e:
            logger.error(f"Failed to search graph {graph_id}: {e}")
            raise e
    
    def _store_graph_metadata(self, graph_id: str, graph_name: str):
        """Store graph metadata (implementation depends on your storage choice)"""
        # This could store in Neo4j, a separate database, or file system
        pass
    
    def _get_graph_metadata(self, graph_id: str) -> Dict[str, Any]:
        """Retrieve graph metadata"""
        # Placeholder implementation
        return {
            "name": f"Graph {graph_id[:8]}",
            "created_at": datetime.now().isoformat()
        }
    
    def _get_node_count(self, graph_id: str) -> int:
        """Get number of nodes in graph"""
        # Placeholder implementation
        return 0
    
    def _get_edge_count(self, graph_id: str) -> int:
        """Get number of edges in graph"""
        # Placeholder implementation
        return 0

# Global Graphiti client instance
graphiti_client = GraphitiClient()
