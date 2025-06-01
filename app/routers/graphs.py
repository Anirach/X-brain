from fastapi import APIRouter, HTTPException, Depends
from typing import List
from app.models.graph import (
    GraphCreate, GraphResponse, GraphList, GraphStats, 
    SubgraphResponse, VisualizationRequest, TimelineRequest, TimelineResponse
)
from app.core.graphiti_client import graphiti_client
from app.core.database import neo4j_db
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/create", response_model=GraphResponse)
async def create_graph(graph_data: GraphCreate):
    """Create a new knowledge graph"""
    try:
        graph_id = graphiti_client.create_graph_instance(graph_data.name)
        
        return GraphResponse(
            graph_id=graph_id,
            name=graph_data.name,
            description=graph_data.description,
            created_at=datetime.now(),
            node_count=0,
            edge_count=0,
            metadata={}
        )
    except Exception as e:
        logger.error(f"Failed to create graph: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create graph: {str(e)}")

@router.get("/list", response_model=GraphList)
async def list_graphs():
    """List all available knowledge graphs"""
    try:
        graphs = graphiti_client.list_graphs()
        graph_responses = [
            GraphResponse(
                graph_id=graph["graph_id"],
                name=graph["name"],
                description="",  # Add description field to metadata later
                created_at=datetime.fromisoformat(graph["created_at"]),
                node_count=graph["node_count"],
                edge_count=graph["edge_count"],
                metadata={}
            )
            for graph in graphs
        ]
        
        return GraphList(
            graphs=graph_responses,
            total_count=len(graph_responses)
        )
    except Exception as e:
        logger.error(f"Failed to list graphs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list graphs: {str(e)}")

@router.get("/{graph_id}", response_model=GraphResponse)
async def get_graph(graph_id: str):
    """Get details of a specific graph"""
    try:
        graphiti = graphiti_client.get_graph_instance(graph_id)
        if not graphiti:
            raise HTTPException(status_code=404, detail="Graph not found")
        
        # Get graph metadata
        metadata = graphiti_client._get_graph_metadata(graph_id)
        
        return GraphResponse(
            graph_id=graph_id,
            name=metadata.get("name", "Unnamed Graph"),
            description=metadata.get("description", ""),
            created_at=datetime.fromisoformat(metadata["created_at"]),
            node_count=graphiti_client._get_node_count(graph_id),
            edge_count=graphiti_client._get_edge_count(graph_id),
            metadata=metadata
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get graph {graph_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get graph: {str(e)}")

@router.get("/{graph_id}/stats", response_model=GraphStats)
async def get_graph_stats(graph_id: str):
    """Get statistical information about a graph"""
    try:
        graphiti = graphiti_client.get_graph_instance(graph_id)
        if not graphiti:
            raise HTTPException(status_code=404, detail="Graph not found")
        
        # Query Neo4j for statistics
        with neo4j_db.session() as session:
            # Get node counts by type
            node_stats = session.run(f"""
                USE graph_{graph_id}
                MATCH (n)
                RETURN labels(n) as labels, count(n) as count
            """).data()
            
            # Get relationship counts by type
            rel_stats = session.run(f"""
                USE graph_{graph_id}
                MATCH ()-[r]->()
                RETURN type(r) as type, count(r) as count
            """).data()
            
            # Get temporal range
            temporal_range = session.run(f"""
                USE graph_{graph_id}
                MATCH (n)
                WHERE n.timestamp IS NOT NULL
                RETURN min(n.timestamp) as start_date, max(n.timestamp) as end_date
            """).single()
        
        node_types = {}
        for stat in node_stats:
            labels = stat["labels"]
            if labels:
                key = ":".join(labels)
                node_types[key] = stat["count"]
        
        relationship_types = {stat["type"]: stat["count"] for stat in rel_stats}
        
        temp_range = None
        if temporal_range and temporal_range["start_date"]:
            temp_range = {
                "start_date": temporal_range["start_date"],
                "end_date": temporal_range["end_date"]
            }
        
        return GraphStats(
            graph_id=graph_id,
            node_count=sum(node_types.values()),
            edge_count=sum(relationship_types.values()),
            node_types=node_types,
            relationship_types=relationship_types,
            temporal_range=temp_range
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get graph stats for {graph_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get graph stats: {str(e)}")

@router.delete("/{graph_id}")
async def delete_graph(graph_id: str):
    """Delete a knowledge graph"""
    try:
        graphiti = graphiti_client.get_graph_instance(graph_id)
        if not graphiti:
            raise HTTPException(status_code=404, detail="Graph not found")
        
        # Delete the graph database
        with neo4j_db.session() as session:
            session.run(f"DROP DATABASE graph_{graph_id} IF EXISTS")
        
        # Remove from client instances
        if graph_id in graphiti_client.graphiti_instances:
            del graphiti_client.graphiti_instances[graph_id]
        
        return {"message": f"Graph {graph_id} deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete graph {graph_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete graph: {str(e)}")
