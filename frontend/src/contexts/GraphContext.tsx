import React, { createContext, useContext, useState, useEffect } from 'react';
import { Graph } from '../types/api.ts';
import { ApiService } from '../services/api.ts';

interface GraphContextType {
  graphs: Graph[];
  selectedGraph: Graph | null;
  loading: boolean;
  error: string | null;
  selectGraph: (graphId: string) => void;
  refreshGraphs: () => Promise<void>;
  createGraph: (name: string, description?: string) => Promise<Graph>;
  deleteGraph: (graphId: string) => Promise<void>;
}

const GraphContext = createContext<GraphContextType | undefined>(undefined);

export const useGraph = (): GraphContextType => {
  const context = useContext(GraphContext);
  if (!context) {
    throw new Error('useGraph must be used within a GraphProvider');
  }
  return context;
};

interface GraphProviderProps {
  children: React.ReactNode;
}

export const GraphProvider: React.FC<GraphProviderProps> = ({ children }) => {
  const [graphs, setGraphs] = useState<Graph[]>([]);
  const [selectedGraph, setSelectedGraph] = useState<Graph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadGraphs = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await ApiService.listGraphs();
        setGraphs(response.data.graphs);
      } catch (err) {
        setError('Failed to load graphs');
        console.error('Error loading graphs:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadGraphs();
  }, []);

  const refreshGraphs = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ApiService.listGraphs();
      setGraphs(response.data.graphs);
      
      // Auto-select first graph if none selected
      if (response.data.graphs.length > 0 && !selectedGraph) {
        setSelectedGraph(response.data.graphs[0]);
      }
    } catch (err) {
      setError('Failed to load graphs');
      console.error('Error loading graphs:', err);
    } finally {
      setLoading(false);
    }
  };

  const selectGraph = (graphId: string) => {
    const graph = graphs.find(g => g.graph_id === graphId);
    if (graph) {
      setSelectedGraph(graph);
    }
  };

  const createGraph = async (name: string, description?: string): Promise<Graph> => {
    try {
      const response = await ApiService.createGraph({ name, description });
      const newGraph = response.data;
      setGraphs(prev => [...prev, newGraph]);
      setSelectedGraph(newGraph);
      return newGraph;
    } catch (err) {
      setError('Failed to create graph');
      throw err;
    }
  };

  const deleteGraph = async (graphId: string) => {
    try {
      await ApiService.deleteGraph(graphId);
      setGraphs(prev => prev.filter(g => g.graph_id !== graphId));
      
      // Select another graph if the deleted one was selected
      if (selectedGraph?.graph_id === graphId) {
        const remainingGraphs = graphs.filter(g => g.graph_id !== graphId);
        setSelectedGraph(remainingGraphs.length > 0 ? remainingGraphs[0] : null);
      }
    } catch (err) {
      setError('Failed to delete graph');
      throw err;
    }
  };

  const value: GraphContextType = {
    graphs,
    selectedGraph,
    loading,
    error,
    selectGraph,
    refreshGraphs,
    createGraph,
    deleteGraph,
  };

  return (
    <GraphContext.Provider value={value}>
      {children}
    </GraphContext.Provider>
  );
};
