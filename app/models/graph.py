from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum

class GraphCreate(BaseModel):
    name: str = Field(..., description="Name of the knowledge graph")
    description: Optional[str] = Field(None, description="Description of the graph")

class GraphResponse(BaseModel):
    graph_id: str
    name: str
    description: Optional[str]
    created_at: datetime
    node_count: int
    edge_count: int
    metadata: Optional[Dict[str, Any]] = {}

class GraphList(BaseModel):
    graphs: List[GraphResponse]
    total_count: int

class GraphStats(BaseModel):
    graph_id: str
    node_count: int
    edge_count: int
    node_types: Dict[str, int]
    relationship_types: Dict[str, int]
    temporal_range: Optional[Dict[str, str]]  # start_date, end_date

class NodeResponse(BaseModel):
    node_id: str
    labels: List[str]
    properties: Dict[str, Any]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]

class EdgeResponse(BaseModel):
    edge_id: str
    source_node_id: str
    target_node_id: str
    relationship_type: str
    properties: Dict[str, Any]
    created_at: Optional[datetime]

class SubgraphResponse(BaseModel):
    nodes: List[NodeResponse]
    edges: List[EdgeResponse]
    metadata: Dict[str, Any]

class VisualizationRequest(BaseModel):
    graph_id: str
    node_limit: Optional[int] = Field(100, description="Maximum number of nodes to return")
    time_filter: Optional[Dict[str, str]] = Field(None, description="Time range filter")
    node_types: Optional[List[str]] = Field(None, description="Filter by node types")
    relationship_types: Optional[List[str]] = Field(None, description="Filter by relationship types")

class TimelineRequest(BaseModel):
    graph_id: str
    start_date: Optional[str] = Field(None, description="Start date for timeline")
    end_date: Optional[str] = Field(None, description="End date for timeline")
    granularity: Optional[str] = Field("day", description="Time granularity (hour, day, week, month)")

class TimelineResponse(BaseModel):
    timeline_data: List[Dict[str, Any]]
    metadata: Dict[str, Any]
