// API Types
export interface Graph {
  id: string; // Added for compatibility
  graph_id: string;
  name: string;
  description?: string;
  created_at: string;
  node_count: number;
  edge_count: number;
  metadata?: Record<string, any>;
}

export interface GraphCreate {
  name: string;
  description?: string;
}

export interface GraphList {
  graphs: Graph[];
  total_count: number;
}

export interface ChatMessage {
  id: string; // Added for React keys
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  sources?: Array<{
    node_id: string;
    type: string;
    content: string;
    relevance_score: number;
    metadata: Record<string, any>;
  }>; // Added for source citations
  context_nodes?: Array<{
    node_id: string;
    type: string;
    properties: Record<string, any>;
  }>; // Added for context display
  metadata?: Record<string, any>;
}

export interface ChatRequest {
  message: string;
  graph_id: string;
  session_id?: string;
  context_limit?: number;
  search_limit?: number;
  include_sources?: boolean; // Added for source inclusion
}

export interface ChatResponse {
  response: string;
  session_id: string;
  message_id: string;
  context_nodes?: Array<{
    node_id: string;
    type: string;
    properties: Record<string, any>;
  }>; // Added for context nodes
  sources: Array<{
    node_id: string;
    type: string;
    content: string;
    relevance_score: number;
    metadata: Record<string, any>;
  }>;
  reasoning?: string;
  metadata: Record<string, any>;
}

export interface DocumentResponse {
  document_id: string;
  filename: string;
  file_path: string;
  content_type: string;
  size: number;
  status: string;
  uploaded_at: string;
  processed_at?: string;
  graph_id?: string;
  metadata?: Record<string, any>;
}

export interface ProcessingStatus {
  document_id: string;
  status: string;
  progress: number;
  message?: string;
  entities_extracted?: number;
  relationships_extracted?: number;
  errors?: string[];
}

export interface Node {
  node_id: string;
  labels: string[];
  properties: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface Edge {
  edge_id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: string;
  properties: Record<string, any>;
  created_at?: string;
}

export interface SubgraphResponse {
  nodes: Node[];
  edges: Edge[];
  metadata: Record<string, any>;
}

export interface VisualizationRequest {
  graph_id: string;
  layout_type?: string; // Added for layout type
  node_limit?: number;
  time_filter?: Record<string, string>;
  node_types?: string[];
  relationship_types?: string[];
}

export interface TimelineRequest {
  graph_id: string;
  start_date?: string;
  end_date?: string;
  granularity?: string;
}

export interface TimelineResponse {
  timeline_data: Array<{
    time_period: string;
    node_count: number;
    node_types: string[];
    events: any[];
  }>;
  metadata: Record<string, any>;
}

// Additional types for document management
export interface Document {
  id: string;
  document_id: string;
  filename: string;
  file_path: string;
  content_type: string;
  size: number;
  status: string;
  uploaded_at: string;
  processed_at?: string;
  graph_id?: string;
  metadata?: Record<string, any>;
}

export interface DocumentUploadRequest {
  file: File;
  graph_id: string;
  extract_entities?: boolean;
  extract_relationships?: boolean;
}

// Additional types for visualization
export interface VisualizationData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata?: Record<string, any>;
}

export interface GraphNode {
  id: string;
  node_id: string;
  labels: string[];
  properties: Record<string, any>;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  created_at?: string;
  updated_at?: string;
}

export interface GraphEdge {
  id: string;
  edge_id: string;
  source: string;
  target: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: string;
  properties: Record<string, any>;
  created_at?: string;
}
