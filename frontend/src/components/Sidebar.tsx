import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
  Box,
  Paper,
  Chip,
} from '@mui/material';
import {
  AccountTree as GraphIcon,
  Upload as UploadIcon,
  Chat as ChatIcon,
  Visibility as VisualizeIcon,
} from '@mui/icons-material';
import { useGraph } from '../contexts/GraphContext';

interface SidebarProps {
  activeView: 'graphs' | 'documents' | 'chat' | 'visualize';
  onViewChange: (view: 'graphs' | 'documents' | 'chat' | 'visualize') => void;
}

const DRAWER_WIDTH = 240;

const Sidebar: React.FC<SidebarProps> = ({
  graphs,
  selectedGraph,
  onGraphSelected,
  onGraphCreated,
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/' },
    { text: 'Document Loader', icon: <UploadIcon />, path: '/documents' },
    { text: 'Chat Interface', icon: <ChatIcon />, path: '/chat' },
    { text: 'Graph Visualization', icon: <GraphIcon />, path: '/visualize' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const handleCreateGraph = () => {
    navigate('/');
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: DRAWER_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          boxSizing: 'border-box',
          mt: 8, // Account for header height
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
            Knowledge Graphs
          </Typography>
          <Tooltip title="Create new graph">
            <IconButton size="small" onClick={handleCreateGraph}>
              <AddIcon />
            </IconButton>
          </Tooltip>
        </Box>
        
        <FormControl fullWidth size="small">
          <InputLabel>Select Graph</InputLabel>
          <Select
            value={selectedGraph || ''}
            label="Select Graph"
            onChange={(e) => onGraphSelected(e.target.value)}
          >
            {graphs.map((graph) => (
              <MenuItem key={graph.graph_id} value={graph.graph_id}>
                <Box sx={{ width: '100%' }}>
                  <Typography variant="body2" noWrap>
                    {graph.name}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                    <Chip 
                      label={`${graph.node_count} nodes`} 
                      size="small" 
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                    <Chip 
                      label={`${graph.edge_count} edges`} 
                      size="small" 
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', height: 20 }}
                    />
                  </Box>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Divider />

      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
              disabled={item.path !== '/' && !selectedGraph}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{
                  variant: 'body2',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {selectedGraph && (
        <>
          <Divider />
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Current Graph Info
            </Typography>
            {graphs.find(g => g.graph_id === selectedGraph) && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" noWrap>
                  {graphs.find(g => g.graph_id === selectedGraph)?.name}
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                  <Chip 
                    label={`${graphs.find(g => g.graph_id === selectedGraph)?.node_count || 0} nodes`}
                    size="small" 
                    color="primary"
                    variant="outlined"
                  />
                  <Chip 
                    label={`${graphs.find(g => g.graph_id === selectedGraph)?.edge_count || 0} edges`}
                    size="small" 
                    color="secondary"
                    variant="outlined"
                  />
                </Box>
              </Box>
            )}
          </Box>
        </>
      )}
    </Drawer>
  );
};

export default Sidebar;
