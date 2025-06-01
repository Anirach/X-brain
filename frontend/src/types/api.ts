// API Types
export interface Graph {
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
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface ChatRequest {
  message: string;
  graph_id: string;
  session_id?: string;
  context_limit?: number;
  search_limit?: number;
}

export interface ChatResponse {
  response: string;
  session_id: string;
  message_id: string;
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
