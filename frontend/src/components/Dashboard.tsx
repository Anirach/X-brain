import React, { useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  Tabs,
  Tab,
  Alert,
  Skeleton
} from '@mui/material';
import {
  AccountTree,
  Description,
  Chat,
  Visibility,
  Add,
  TrendingUp,
  Timeline
} from '@mui/icons-material';
import { useGraph } from '../contexts/GraphContext';
import GraphManager from './GraphManager';
import DocumentLoader from './DocumentLoader';
import ChatInterface from './ChatInterface';
import GraphVisualization from './GraphVisualization';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const Dashboard: React.FC = () => {
  const { selectedGraph, graphs, loading, error } = useGraph();
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const getGraphStats = () => {
    if (!graphs || graphs.length === 0) return null;
    
    const totalNodes = graphs.reduce((sum, graph) => sum + (graph.node_count || 0), 0);
    const totalEdges = graphs.reduce((sum, graph) => sum + (graph.edge_count || 0), 0);
    
    return { totalGraphs: graphs.length, totalNodes, totalEdges };
  };

  const stats = getGraphStats();

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rectangular" height={120} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Overview Cards */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Graphs
                  </Typography>
                  <Typography variant="h4">
                    {stats?.totalGraphs || 0}
                  </Typography>
                </Box>
                <AccountTree color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Nodes
                  </Typography>
                  <Typography variant="h4">
                    {stats?.totalNodes || 0}
                  </Typography>
                </Box>
                <TrendingUp color="secondary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Total Edges
                  </Typography>
                  <Typography variant="h4">
                    {stats?.totalEdges || 0}
                  </Typography>
                </Box>
                <Timeline color="info" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom variant="body2">
                    Active Graph
                  </Typography>
                  <Typography variant="h6" noWrap>
                    {selectedGraph?.name || 'None'}
                  </Typography>
                </Box>
                <Visibility color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Active Graph Details */}
      {selectedGraph && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Active Graph: {selectedGraph.name}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {selectedGraph.description || 'No description available'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip
              label={`${selectedGraph.node_count || 0} nodes`}
              color="primary"
              variant="outlined"
            />
            <Chip
              label={`${selectedGraph.edge_count || 0} edges`}
              color="secondary"
              variant="outlined"
            />
            <Chip
              label={`Created: ${new Date(selectedGraph.created_at).toLocaleDateString()}`}
              variant="outlined"
            />
          </Box>
        </Paper>
      )}

      {/* Main Content Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange} 
            aria-label="dashboard tabs"
            variant="fullWidth"
          >
            <Tab 
              label="Graphs" 
              icon={<AccountTree />} 
              iconPosition="start"
              id="tab-0"
              aria-controls="tabpanel-0"
            />
            <Tab 
              label="Documents" 
              icon={<Description />} 
              iconPosition="start"
              id="tab-1"
              aria-controls="tabpanel-1"
              disabled={!selectedGraph}
            />
            <Tab 
              label="Chat" 
              icon={<Chat />} 
              iconPosition="start"
              id="tab-2"
              aria-controls="tabpanel-2"
              disabled={!selectedGraph}
            />
            <Tab 
              label="Visualize" 
              icon={<Visibility />} 
              iconPosition="start"
              id="tab-3"
              aria-controls="tabpanel-3"
              disabled={!selectedGraph}
            />
          </Tabs>
        </Box>

        <TabPanel value={activeTab} index={0}>
          <GraphManager onGraphCreated={(graphId) => {
            // Handle graph creation - refresh the graph list
            console.log('New graph created:', graphId);
          }} />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          {selectedGraph ? (
            <DocumentLoader />
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                Select a graph to upload documents
              </Typography>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          {selectedGraph ? (
            <ChatInterface />
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                Select a graph to start chatting
              </Typography>
            </Box>
          )}
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          {selectedGraph ? (
            <GraphVisualization />
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary">
                Select a graph to visualize
              </Typography>
            </Box>
          )}
        </TabPanel>
      </Paper>

      {/* Quick Actions for Empty State */}
      {(!graphs || graphs.length === 0) && (
        <Paper sx={{ p: 4, mt: 3, textAlign: 'center' }}>
          <AccountTree sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Welcome to XBrain
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Get started by creating your first knowledge graph
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            size="large"
            onClick={() => setActiveTab(0)}
          >
            Create Your First Graph
          </Button>
        </Paper>
      )}
    </Box>
  );
};

export default Dashboard;
