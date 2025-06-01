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
import { useGraph } from '../contexts/GraphContext.tsx';

interface SidebarProps {
  activeView: 'graphs' | 'documents' | 'chat' | 'visualize';
  onViewChange: (view: 'graphs' | 'documents' | 'chat' | 'visualize') => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedGraph, graphs } = useGraph();

  const menuItems = [
    { 
      id: 'graphs' as const, 
      text: 'Graphs', 
      icon: <GraphIcon />, 
      path: '/graphs',
      description: 'Manage knowledge graphs'
    },
    { 
      id: 'documents' as const, 
      text: 'Documents', 
      icon: <UploadIcon />, 
      path: '/documents',
      description: 'Upload and process documents'
    },
    { 
      id: 'chat' as const, 
      text: 'Chat', 
      icon: <ChatIcon />, 
      path: '/chat',
      description: 'Ask questions about your graph'
    },
    { 
      id: 'visualize' as const, 
      text: 'Visualize', 
      icon: <VisualizeIcon />, 
      path: '/visualize',
      description: 'Explore graph structure'
    },
  ];

  const handleItemClick = (item: typeof menuItems[0]) => {
    onViewChange(item.id);
    navigate(item.path);
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Selected Graph Info */}
      {selectedGraph && (
        <Paper sx={{ m: 2, p: 2, bgcolor: 'primary.50' }}>
          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Active Graph
          </Typography>
          <Typography variant="body2" gutterBottom>
            {selectedGraph.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip
              label={`${selectedGraph.node_count || 0} nodes`}
              size="small"
              color="primary"
              variant="outlined"
            />
            <Chip
              label={`${selectedGraph.edge_count || 0} edges`}
              size="small"
              color="secondary"
              variant="outlined"
            />
          </Box>
          {selectedGraph.description && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              {selectedGraph.description}
            </Typography>
          )}
        </Paper>
      )}

      {/* Navigation Menu */}
      <List sx={{ flex: 1, px: 1 }}>
        {menuItems.map((item) => (
          <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleItemClick(item)}
              sx={{
                borderRadius: 1,
                '&.Mui-selected': {
                  bgcolor: 'primary.100',
                  '&:hover': {
                    bgcolor: 'primary.200',
                  },
                },
                '&:hover': {
                  bgcolor: 'action.hover',
                },
              }}
            >
              <ListItemIcon sx={{ color: location.pathname === item.path ? 'primary.main' : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                secondary={item.description}
                primaryTypographyProps={{
                  fontWeight: location.pathname === item.path ? 'bold' : 'normal',
                  color: location.pathname === item.path ? 'primary.main' : 'inherit',
                }}
                secondaryTypographyProps={{
                  variant: 'caption',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      <Divider />

      {/* Footer Info */}
      <Box sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          XBrain Knowledge Graph System
        </Typography>
        <Typography variant="caption" color="text.secondary" align="center" display="block">
          v1.0.0
        </Typography>
      </Box>
    </Box>
  );
};

export default Sidebar;
