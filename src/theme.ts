import { createTheme } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    heatmap: string[];
    chartColors: string[];
  }
  interface PaletteOptions {
    heatmap?: string[];
    chartColors?: string[];
  }
}

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

      heatmap: mode === 'dark'
        ? ['#374151', '#7c2d12', '#b45309', '#f97316', '#dc2626']
        : ['#f3f4f6', '#ffedd5', '#fdba74', '#fb923c', '#ef4444'],
      chartColors: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
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
