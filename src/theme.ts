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
  interface TypographyPropsVariantOverrides {
    labelMicro: true;
    labelXs: true;
    labelSm: true;
    labelLg: true;
    iconSm: true;
    iconMd: true;
    iconLg: true;
  }
  interface TypographyVariants {
    labelMicro: React.CSSProperties;
    labelXs: React.CSSProperties;
    labelSm: React.CSSProperties;
    labelLg: React.CSSProperties;
    iconSm: React.CSSProperties;
    iconMd: React.CSSProperties;
    iconLg: React.CSSProperties;
  }
  interface TypographyVariantsOptions {
    labelMicro?: React.CSSProperties;
    labelXs?: React.CSSProperties;
    labelSm?: React.CSSProperties;
    labelLg?: React.CSSProperties;
    iconSm?: React.CSSProperties;
    iconMd?: React.CSSProperties;
    iconLg?: React.CSSProperties;
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
    typography: {
      fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
      subtitle1: { fontWeight: 600, fontSize: '0.9375rem' },
      labelMicro: { fontSize: '0.625rem' },
      labelXs:    { fontSize: '0.65rem' },
      labelSm:    { fontSize: '0.7rem' },
      labelLg:    { fontSize: '0.8125rem' },
      iconSm:     { fontSize: '1rem' },
      iconMd:     { fontSize: '1.25rem' },
      iconLg:     { fontSize: '1.5rem' },
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: ({ theme }) => ({
            background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
            color: '#ffffff',
            borderRadius: 0,
          }),
        },
      },
      MuiPaper: {
        defaultProps: {
          elevation: 2,
        },
        styleOverrides: {
          root: {
            borderRadius: 8,
          },
        },
      },
      MuiTable: {
        styleOverrides: {
          root: { borderCollapse: 'collapse' },
        },
      },
      MuiTableContainer: {
        styleOverrides: {
          root: { overflowX: 'auto' },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          head: { fontWeight: 600 },
        },
      },
    },
  });
