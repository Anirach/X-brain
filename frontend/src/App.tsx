import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, Drawer, Toolbar } from '@mui/material';

import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import { GraphProvider } from './contexts/GraphContext';

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

const DRAWER_WIDTH = 280;

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GraphProvider>
        <Router>
          <Box sx={{ display: 'flex' }}>
            <Header />
            <Drawer
              variant="permanent"
              sx={{
                width: DRAWER_WIDTH,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                  width: DRAWER_WIDTH,
                  boxSizing: 'border-box',
                },
              }}
            >
              <Toolbar />
              <Sidebar activeView="graphs" onViewChange={() => {}} />
            </Drawer>
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                p: 3,
                width: `calc(100% - ${DRAWER_WIDTH}px)`,
              }}
            >
              <Toolbar />
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/graphs" element={<Dashboard />} />
                <Route path="/documents" element={<Dashboard />} />
                <Route path="/chat" element={<Dashboard />} />
                <Route path="/visualize" element={<Dashboard />} />
              </Routes>
            </Box>
          </Box>
        </Router>
      </GraphProvider>
    </ThemeProvider>
  );
};

export default App;
