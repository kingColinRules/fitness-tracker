import { createTheme } from '@mui/material/styles';

export const createAppTheme = (mode: 'light' | 'dark') =>
  createTheme({
    palette: {
      mode,
      primary: { main: '#3b82f6' },
      success: { main: '#16a34a', dark: '#15803d' },
      warning: { main: '#f97316' },
      error: { main: '#ef4444' },
      background: {
        default: mode === 'dark' ? '#111827' : '#f9fafb',
        paper: mode === 'dark' ? '#1f2937' : '#ffffff',
      },
      divider: mode === 'dark' ? '#374151' : '#e5e7eb',
      text: {
        primary: mode === 'dark' ? '#e5e7eb' : '#1f2937',
        secondary: mode === 'dark' ? '#9ca3af' : '#6b7280',
      },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
            color: '#ffffff',
          },
        },
      },
    },
  });
