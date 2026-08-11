import { createTheme } from '@mui/material/styles';

export const brand = {
  primary: '#087A3D',
  dark: '#04552B',
  deep: '#023020',
  light: '#EAF6E8',
  lighter: '#F2FAF0',
  page: '#F7F9F5',
  border: '#E4EBE1',
  text: '#16231B',
  soft: '#44584C',
  muted: '#7A8B80',
  faint: '#9BA99F',
};

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: brand.primary,
      dark: brand.dark,
      light: '#2F9757',
      contrastText: '#FFFFFF',
    },
    secondary: { main: brand.dark },
    background: { default: brand.page, paper: '#FFFFFF' },
    text: { primary: brand.text, secondary: brand.soft },
    divider: brand.border,
    success: { main: brand.primary },
    error: { main: '#DC2626' },
    warning: { main: '#D97706' },
    info: { main: '#2563EB' },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
    button: { textTransform: 'none', fontWeight: 600 },
    h4: { fontWeight: 800, letterSpacing: '-0.3px' },
    h5: { fontWeight: 800, letterSpacing: '-0.3px' },
    subtitle1: { fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, boxShadow: 'none' },
        containedPrimary: {
          boxShadow: '0 1px 2px rgba(8, 122, 61, 0.35)',
          '&:hover': { boxShadow: '0 2px 8px rgba(2, 48, 32, 0.12)' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: brand.deep,
          color: '#FFFFFF',
          fontSize: 11,
          fontWeight: 500,
          padding: '5px 9px',
          borderRadius: 6,
        },
        arrow: { color: brand.deep },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontSize: 10,
            fontWeight: 700,
            color: brand.muted,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            backgroundColor: brand.lighter,
            whiteSpace: 'nowrap',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottomColor: '#F0F4EE',
          fontSize: 13,
          whiteSpace: 'nowrap',
          py: 1.4,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
    MuiTextField: {
      defaultProps: { size: 'small' },
    },
  },
});
