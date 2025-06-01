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
        
        # Build Cypher query with filters
        conditions = []
        params = {"limit": request.node_limit}
        
        # Time filter
        if request.time_filter:
            if "start_date" in request.time_filter:
                conditions.append("n.timestamp >= $start_date")
                params["start_date"] = request.time_filter["start_date"]
            if "end_date" in request.time_filter:
                conditions.append("n.timestamp <= $end_date")
                params["end_date"] = request.time_filter["end_date"]
        
        # Node type filter
        if request.node_types:
            label_conditions = " OR ".join([f"n:{label}" for label in request.node_types])
            conditions.append(f"({label_conditions})")
        
        where_clause = " AND ".join(conditions) if conditions else "1=1"
        
        # Query nodes
        node_query = f"""
        USE graph_{request.graph_id}
        MATCH (n)
        WHERE {where_clause}
        RETURN id(n) as node_id, labels(n) as labels, properties(n) as properties
        LIMIT $limit
        """
        
        # Query relationships
        rel_query = f"""
        USE graph_{request.graph_id}
        MATCH (n)-[r]->(m)
        WHERE {where_clause.replace('n.', 'n.')} AND {where_clause.replace('n.', 'm.')}
        RETURN id(r) as edge_id, id(n) as source_id, id(m) as target_id, 
               type(r) as rel_type, properties(r) as properties
        LIMIT $limit
        """
        
        with neo4j_db.session() as session:
            node_results = session.run(node_query, params).data()
            rel_results = session.run(rel_query, params).data()
        
        # Convert to response format
        nodes = [
            NodeResponse(
                node_id=str(node["node_id"]),
                labels=node["labels"],
                properties=node["properties"] or {},
                created_at=None,  # Add if timestamp exists
                updated_at=None
            )
            for node in node_results
        ]
        
        edges = [
            EdgeResponse(
                edge_id=str(edge["edge_id"]),
                source_node_id=str(edge["source_id"]),
                target_node_id=str(edge["target_id"]),
                relationship_type=edge["rel_type"],
                properties=edge["properties"] or {},
                created_at=None
            )
            for edge in rel_results
        ]
        
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
                }
            }
        )
        
    except HTTPException:
        raise
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
        
        # Build timeline query
        conditions = ["n.timestamp IS NOT NULL"]
        params = {}
        
        if request.start_date:
            conditions.append("n.timestamp >= $start_date")
            params["start_date"] = request.start_date
            
        if request.end_date:
            conditions.append("n.timestamp <= $end_date")
            params["end_date"] = request.end_date
        
        where_clause = " AND ".join(conditions)
        
        # Group by time granularity
        time_format = {
            "hour": "substring(n.timestamp, 0, 13)",
            "day": "substring(n.timestamp, 0, 10)",
            "week": "substring(n.timestamp, 0, 10)",  # Simplified
            "month": "substring(n.timestamp, 0, 7)"
        }.get(request.granularity, "substring(n.timestamp, 0, 10)")
        
        timeline_query = f"""
        USE graph_{request.graph_id}
        MATCH (n)
        WHERE {where_clause}
        WITH {time_format} as time_period, n
        RETURN time_period, 
               count(n) as node_count,
               collect(DISTINCT labels(n)[0]) as node_types,
               collect({{
                   id: id(n),
                   labels: labels(n),
                   properties: properties(n)
               }}) as nodes
        ORDER BY time_period
        """
        
        with neo4j_db.session() as session:
            results = session.run(timeline_query, params).data()
        
        timeline_data = [
            {
                "time_period": result["time_period"],
                "node_count": result["node_count"],
                "node_types": result["node_types"],
                "events": result["nodes"][:10]  # Limit events per period
            }
            for result in results
        ]
        
        return TimelineResponse(
            timeline_data=timeline_data,
            metadata={
                "graph_id": request.graph_id,
                "granularity": request.granularity,
                "total_periods": len(timeline_data),
                "date_range": {
                    "start": request.start_date,
                    "end": request.end_date
                }
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
        
        # Query for subgraph
        subgraph_query = f"""
        USE graph_{graph_id}
        MATCH path = (center)-[*1..{depth}]-(connected)
        WHERE id(center) = $node_id
        WITH nodes(path) as path_nodes, relationships(path) as path_rels
        UNWIND path_nodes as n
        WITH collect(DISTINCT n) as all_nodes, path_rels
        UNWIND path_rels as r
        WITH all_nodes, collect(DISTINCT r) as all_rels
        RETURN all_nodes[0..$limit] as nodes, all_rels[0..$limit] as relationships
        """
        
        params = {"node_id": int(node_id), "limit": limit}
        
        with neo4j_db.session() as session:
            result = session.run(subgraph_query, params).single()
        
        if not result:
            return SubgraphResponse(nodes=[], edges=[], metadata={})
        
        # Convert nodes
        nodes = [
            NodeResponse(
                node_id=str(node.id),
                labels=list(node.labels),
                properties=dict(node),
                created_at=None,
                updated_at=None
            )
            for node in result["nodes"] or []
        ]
        
        # Convert relationships
        edges = [
            EdgeResponse(
                edge_id=str(rel.id),
                source_node_id=str(rel.start_node.id),
                target_node_id=str(rel.end_node.id),
                relationship_type=rel.type,
                properties=dict(rel),
                created_at=None
            )
            for rel in result["relationships"] or []
        ]
        
        return SubgraphResponse(
            nodes=nodes,
            edges=edges,
            metadata={
                "center_node_id": node_id,
                "depth": depth,
                "total_nodes": len(nodes),
                "total_edges": len(edges)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get subgraph for node {node_id} in graph {graph_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get subgraph: {str(e)}")
