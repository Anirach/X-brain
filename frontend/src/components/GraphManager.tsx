import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  AccountTree as GraphIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { useGraph } from '../contexts/GraphContext';

interface GraphManagerProps {
  onGraphCreated: (graphId: string) => void;
}

const GraphManager: React.FC<GraphManagerProps> = ({ onGraphCreated }) => {
  const { graphs, createGraph, deleteGraph, loading, error } = useGraph();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newGraphName, setNewGraphName] = useState('');
  const [newGraphDescription, setNewGraphDescription] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateGraph = async () => {
    if (!newGraphName.trim()) return;

    try {
      setCreating(true);
      const graph = await createGraph(newGraphName, newGraphDescription);
      onGraphCreated(graph.graph_id);
      setCreateDialogOpen(false);
      setNewGraphName('');
      setNewGraphDescription('');
    } catch (error) {
      console.error('Failed to create graph:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteGraph = async (graphId: string) => {
    if (window.confirm('Are you sure you want to delete this graph? This action cannot be undone.')) {
      try {
        await deleteGraph(graphId);
      } catch (error) {
        console.error('Failed to delete graph:', error);
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading graphs...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Knowledge Graphs
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setCreateDialogOpen(true)}
        >
          Create New Graph
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {graphs.map((graph) => (
          <Grid item xs={12} md={6} lg={4} key={graph.graph_id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box display="flex" alignItems="center">
                    <GraphIcon color="primary" sx={{ mr: 1 }} />
                    <Typography variant="h6" component="h2">
                      {graph.name}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDeleteGraph(graph.graph_id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>

                {graph.description && (
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {graph.description}
                  </Typography>
                )}

                <Box display="flex" gap={1} mb={2}>
                  <Chip
                    label={`${graph.node_count} nodes`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={`${graph.edge_count} edges`}
                    size="small"
                    color="secondary"
                    variant="outlined"
                  />
                </Box>

                <Typography variant="caption" color="text.secondary">
                  Created: {new Date(graph.created_at).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}

        {graphs.length === 0 && (
          <Grid item xs={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <TimelineIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No Knowledge Graphs Yet
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  Create your first knowledge graph to get started with document processing and AI chat.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setCreateDialogOpen(true)}
                >
                  Create Your First Graph
                </Button>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Knowledge Graph</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Graph Name"
            fullWidth
            variant="outlined"
            value={newGraphName}
            onChange={(e) => setNewGraphName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newGraphDescription}
            onChange={(e) => setNewGraphDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleCreateGraph}
            disabled={!newGraphName.trim() || creating}
            variant="contained"
          >
            {creating ? 'Creating...' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GraphManager;
