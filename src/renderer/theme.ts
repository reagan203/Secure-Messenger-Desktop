import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#0f3460',
    },
    secondary: {
      main: '#4ade80',
    },
    background: {
      default: '#1a1a2e',
      paper: '#141425',
    },
    text: {
      primary: '#eaeaea',
      secondary: '#888',
    },
    divider: '#2a2a4a',
    error: {
      main: '#f87171',
    },
    warning: {
      main: '#facc15',
    },
    success: {
      main: '#4ade80',
    },
  },
  typography: {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  components: {
    MuiSkeleton: {
      defaultProps: {
        animation: 'wave',
      },
      styleOverrides: {
        root: {
          backgroundColor: '#2a2a4a',
          '&::after': {
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)',
          },
        },
      },
    },
  },
});

export default theme;
