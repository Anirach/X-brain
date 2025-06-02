from fastapi import APIRouter, HTTPException, Query
from typing import List, Dict, Any, Optional
import logging

from app.models.graph import (
    VisualizationRequest, SubgraphResponse, TimelineRequest, 
    TimelineResponse, NodeResponse, EdgeResponse
)
from app.core.graphiti_client import graphiti_client
from app.core.database import neo4j_db

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/graph-data", response_model=SubgraphResponse)
async def get_graph_visualization_data(request: VisualizationRequest):
    """Get graph data for D3.js visualization"""
    try:
        # Validate graph exists
        graphiti = graphiti_client.get_graph_instance(request.graph_id)
        if not graphiti:
            raise HTTPException(status_code=404, detail="Graph not found")
        
        # Mock implementation - return sample visualization data from our mock client
        nodes_data = graphiti.get("nodes", [])
        edges_data = graphiti.get("edges", [])
        
        # Convert to response format
        nodes = []
        for i, node_data in enumerate(nodes_data[:request.node_limit]):
            nodes.append(NodeResponse(
                node_id=node_data.get("id", f"node_{i}"),
                labels=[node_data.get("type", "Document")],
                properties={
                    "name": node_data.get("content", f"Node {i}"),
                    "timestamp": node_data.get("timestamp"),
                    **node_data.get("properties", {})
                },
                created_at=node_data.get("timestamp"),
                updated_at=None
            ))
        
        # Create some mock edges between nodes
        edges = []
        for i in range(min(len(nodes) - 1, 5)):  # Limit to 5 edges
            edges.append(EdgeResponse(
                edge_id=f"edge_{i}",
                source_node_id=nodes[i].node_id,
                target_node_id=nodes[i + 1].node_id if i + 1 < len(nodes) else nodes[0].node_id,
                relationship_type="RELATES_TO",
                properties={"weight": 0.8},
                created_at=None
            ))
        
        return SubgraphResponse(
            nodes=nodes,
            edges=edges,
            metadata={
                "total_nodes": len(nodes),
                "total_edges": len(edges),
                "filters_applied": {
                    "time_filter": request.time_filter,
                    "node_types": request.node_types,
                    "relationship_types": request.relationship_types
                },
                "note": "Mock visualization data - replace with real Graphiti queries when available"
            }
        )
        
    except Exception as e:
        logger.error(f"Failed to get visualization data for graph {request.graph_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get visualization data: {str(e)}")

@router.post("/timeline", response_model=TimelineResponse)
async def get_timeline_data(request: TimelineRequest):
    """Get timeline data for temporal visualization"""
    try:
        # Validate graph exists
        graphiti = graphiti_client.get_graph_instance(request.graph_id)
        if not graphiti:
            raise HTTPException(status_code=404, detail="Graph not found")
        
        # Mock timeline data
        from datetime import datetime, timedelta
        import random
        
        # Generate mock timeline data
        timeline_data = []
        start_date = datetime.now() - timedelta(days=30)
        
        for i in range(10):  # Generate 10 time periods
            period_date = start_date + timedelta(days=i * 3)
            timeline_data.append({
                "time_period": period_date.strftime("%Y-%m-%d"),
                "node_count": random.randint(1, 10),
                "node_types": ["Document", "Entity", "Concept"],
                "events": [
                    {
                        "id": f"event_{i}_{j}",
                        "labels": ["Document"],
                        "properties": {"name": f"Event {j} on {period_date.strftime('%Y-%m-%d')}"}
                    }
                    for j in range(min(3, random.randint(1, 5)))
                ]
            })
        
        return TimelineResponse(
            timeline_data=timeline_data,
            metadata={
                "graph_id": request.graph_id,
                "granularity": request.granularity,
                "total_periods": len(timeline_data),
                "date_range": {
                    "start": request.start_date,
                    "end": request.end_date
                },
                "note": "Mock timeline data - replace with real Graphiti queries when available"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get timeline data for graph {request.graph_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get timeline data: {str(e)}")

@router.get("/subgraph/{graph_id}")
async def get_subgraph_around_node(
    graph_id: str,
    node_id: str = Query(..., description="Central node ID"),
    depth: int = Query(2, description="Depth of subgraph"),
    limit: int = Query(50, description="Maximum nodes to return")
):
    """Get subgraph around a specific node"""
    try:
        # Validate graph exists
        graphiti = graphiti_client.get_graph_instance(graph_id)
        if not graphiti:
            raise HTTPException(status_code=404, detail="Graph not found")
        
        # Mock subgraph data - return nodes around the central node
        nodes_data = graphiti.get("nodes", [])
        
        # Find the central node or create a mock one
        central_node = None
        for node in nodes_data:
            if node.get("id") == node_id:
                central_node = node
                break
        
        if not central_node:
            # Create a mock central node
            central_node = {
                "id": node_id,
                "type": "Document",
                "content": f"Central Node {node_id}",
                "timestamp": "2024-01-01T00:00:00Z"
            }
        
        # Create mock subgraph nodes (including central + connected)
        subgraph_nodes = [central_node]
        connected_nodes = nodes_data[:min(limit-1, 5)]  # Add up to 5 connected nodes
        subgraph_nodes.extend(connected_nodes)
        
        # Convert to response format
        nodes = []
        for i, node_data in enumerate(subgraph_nodes):
            nodes.append(NodeResponse(
                node_id=node_data.get("id", f"node_{i}"),
                labels=[node_data.get("type", "Document")],
                properties={
                    "name": node_data.get("content", f"Node {i}"),
                    "timestamp": node_data.get("timestamp"),
                },
                created_at=node_data.get("timestamp"),
                updated_at=None
            ))
        
        # Create mock edges between central node and others
        edges = []
        for i in range(1, len(nodes)):
            edges.append(EdgeResponse(
                edge_id=f"edge_{node_id}_{i}",
                source_node_id=node_id,
                target_node_id=nodes[i].node_id,
                relationship_type="CONNECTED_TO",
                properties={"distance": min(i, depth)},
                created_at=None
            ))
        
        return SubgraphResponse(
            nodes=nodes,
            edges=edges,
            metadata={
                "central_node_id": node_id,
                "depth": depth,
                "total_nodes": len(nodes),
                "total_edges": len(edges),
                "note": "Mock subgraph data - replace with real Graphiti queries when available"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get subgraph for node {node_id} in graph {graph_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get subgraph: {str(e)}")
