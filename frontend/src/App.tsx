import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import DocumentLoader from './components/DocumentLoader';
import ChatInterface from './components/ChatInterface';
import GraphVisualization from './components/GraphVisualization';
import GraphManager from './components/GraphManager';
import { GraphProvider } from './contexts/GraphContext';
import { ApiService } from './services/api';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

const App: React.FC = () => {
  const [selectedGraph, setSelectedGraph] = useState<string | null>(null);
  const [graphs, setGraphs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGraphs();
  }, []);

  const loadGraphs = async () => {
    try {
      const response = await ApiService.listGraphs();
      setGraphs(response.data.graphs);
      if (response.data.graphs.length > 0 && !selectedGraph) {
        setSelectedGraph(response.data.graphs[0].graph_id);
      }
    } catch (error) {
      console.error('Failed to load graphs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGraphCreated = (graphId: string) => {
    loadGraphs();
    setSelectedGraph(graphId);
  };

  const handleGraphSelected = (graphId: string) => {
    setSelectedGraph(graphId);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GraphProvider>
        <Router>
          <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <Header />
            <Sidebar 
              graphs={graphs}
              selectedGraph={selectedGraph}
              onGraphSelected={handleGraphSelected}
              onGraphCreated={handleGraphCreated}
            />
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: 3,
                mt: 8, // Account for header height
                ml: 30, // Account for sidebar width
              }}
            >
              <Routes>
                <Route 
                  path="/" 
                  element={<GraphManager onGraphCreated={handleGraphCreated} />} 
                />
                <Route 
                  path="/documents" 
                  element={<DocumentLoader selectedGraph={selectedGraph} />} 
                />
                <Route 
                  path="/chat" 
                  element={<ChatInterface selectedGraph={selectedGraph} />} 
                />
                <Route 
                  path="/visualize" 
                  element={<GraphVisualization selectedGraph={selectedGraph} />} 
                />
              </Routes>
            </Box>
          </Box>
        </Router>
      </GraphProvider>
    </ThemeProvider>
  );
};

export default App;
