import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';

import Dashboard from './components/Dashboard.tsx';
import { GraphProvider } from './contexts/GraphContext.tsx';

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
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GraphProvider>
        <Router>
          <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', p: 2 }}>
            <Dashboard />
          </Box>
        </Router>
      </GraphProvider>
    </ThemeProvider>
  );
};

export default App;
