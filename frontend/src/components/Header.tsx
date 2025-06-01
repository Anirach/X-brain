import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Chip,
} from '@mui/material';
import { Memory as BrainIcon } from '@mui/icons-material';

const Header: React.FC = () => {
  return (
    <AppBar 
      position="fixed" 
      sx={{ 
        zIndex: (theme) => theme.zIndex.drawer + 1,
        background: 'linear-gradient(45deg, #1976d2 30%, #42a5f5 90%)',
      }}
    >
      <Toolbar>
        <BrainIcon sx={{ mr: 2 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          X-Brain Knowledge Graph AI
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Chip 
            label="Beta" 
            size="small" 
            color="secondary" 
            variant="outlined"
            sx={{ color: 'white', borderColor: 'white' }}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
