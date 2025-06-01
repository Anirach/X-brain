import axios, { AxiosResponse } from 'axios';
import {
  Graph,
  GraphCreate,
  GraphList,
  ChatRequest,
  ChatResponse,
  DocumentResponse,
  ProcessingStatus,
  SubgraphResponse,
  VisualizationRequest,
  TimelineRequest,
  TimelineResponse,
} from '../types/api';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log('API Request:', config.method?.toUpperCase(), config.url);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export class ApiService {
  // Graph Management
  static async listGraphs(): Promise<AxiosResponse<GraphList>> {
    return apiClient.get('/graphs/list');
  }

  static async createGraph(graphData: GraphCreate): Promise<AxiosResponse<Graph>> {
    return apiClient.post('/graphs/create', graphData);
  }

  static async getGraph(graphId: string): Promise<AxiosResponse<Graph>> {
    return apiClient.get(`/graphs/${graphId}`);
  }

  static async deleteGraph(graphId: string): Promise<AxiosResponse<{ message: string }>> {
    return apiClient.delete(`/graphs/${graphId}`);
  }

  static async getGraphStats(graphId: string): Promise<AxiosResponse<any>> {
    return apiClient.get(`/graphs/${graphId}/stats`);
  }

  // Document Management
  static async uploadDocument(
    file: File,
    graphId: string,
    extractEntities: boolean = true,
    extractRelationships: boolean = true
  ): Promise<AxiosResponse<DocumentResponse>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('graph_id', graphId);
    formData.append('extract_entities', extractEntities.toString());
    formData.append('extract_relationships', extractRelationships.toString());

    return apiClient.post('/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  static async getProcessingStatus(documentId: string): Promise<AxiosResponse<ProcessingStatus>> {
    return apiClient.get(`/documents/status/${documentId}`);
  }

  static async listDocuments(graphId: string): Promise<AxiosResponse<any>> {
    return apiClient.get(`/documents/list/${graphId}`);
  }

  static async deleteDocument(documentId: string): Promise<AxiosResponse<{ message: string }>> {
    return apiClient.delete(`/documents/${documentId}`);
  }

  // Chat Interface
  static async sendChatMessage(request: ChatRequest): Promise<AxiosResponse<ChatResponse>> {
    return apiClient.post('/chat/message', request);
  }

  static async getChatSessions(graphId?: string): Promise<AxiosResponse<any>> {
    const params = graphId ? { graph_id: graphId } : {};
    return apiClient.get('/chat/sessions', { params });
  }

  static async getChatSession(sessionId: string): Promise<AxiosResponse<any>> {
    return apiClient.get(`/chat/sessions/${sessionId}`);
  }

  static async deleteChatSession(sessionId: string): Promise<AxiosResponse<{ message: string }>> {
    return apiClient.delete(`/chat/sessions/${sessionId}`);
  }

  static async clearChatSession(sessionId: string): Promise<AxiosResponse<{ message: string }>> {
    return apiClient.post(`/chat/sessions/${sessionId}/clear`);
  }

  static async exportChatSession(sessionId: string): Promise<AxiosResponse<any>> {
    return apiClient.get(`/chat/sessions/${sessionId}/export`);
  }

  static async searchGraph(graphId: string, query: string, limit: number = 10): Promise<AxiosResponse<any>> {
    return apiClient.post('/chat/search', {
      graph_id: graphId,
      query,
      limit,
    });
  }

  // Visualization
  static async getVisualizationData(request: VisualizationRequest): Promise<AxiosResponse<SubgraphResponse>> {
    return apiClient.post('/visualizations/graph-data', request);
  }

  static async getTimelineData(request: TimelineRequest): Promise<AxiosResponse<TimelineResponse>> {
    return apiClient.post('/visualizations/timeline', request);
  }

  static async getSubgraph(
    graphId: string,
    nodeId: string,
    depth: number = 2,
    limit: number = 50
  ): Promise<AxiosResponse<SubgraphResponse>> {
    return apiClient.get(`/visualizations/subgraph/${graphId}`, {
      params: { node_id: nodeId, depth, limit },
    });
  }

  // Health Check
  static async healthCheck(): Promise<AxiosResponse<any>> {
    return apiClient.get('/health');
  }
}
