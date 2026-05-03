import { createTheme, alpha } from '@mui/material/styles'

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#6C63FF', light: '#9D97FF', dark: '#4B44CC' },
    secondary: { main: '#FF6584', light: '#FF8FA3', dark: '#CC4D68' },
    success: { main: '#4CAF82' },
    warning: { main: '#FFB547' },
    error: { main: '#FF5252' },
    background: {
      default: '#0A0A0F',
      paper: '#12121A',
    },
    text: { primary: '#F0F0FF', secondary: '#8888AA' },
    divider: 'rgba(108,99,255,0.12)',
  },
  typography: {
    fontFamily: '"Inter", "DM Sans", sans-serif',
    h1: { fontWeight: 700 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: '#0A0A0F',
          scrollbarWidth: 'thin',
          scrollbarColor: '#6C63FF33 transparent',
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-thumb': { background: '#6C63FF44', borderRadius: 4 },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(108,99,255,0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 10,
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #6C63FF 0%, #9D97FF 100%)',
          boxShadow: '0 4px 20px rgba(108,99,255,0.3)',
          '&:hover': { boxShadow: '0 6px 28px rgba(108,99,255,0.45)' },
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            '& fieldset': { borderColor: 'rgba(108,99,255,0.2)' },
            '&:hover fieldset': { borderColor: 'rgba(108,99,255,0.5)' },
            '&.Mui-focused fieldset': { borderColor: '#6C63FF' },
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          background: '#12121A',
          border: '1px solid rgba(108,99,255,0.1)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          '&:hover': {
            borderColor: 'rgba(108,99,255,0.3)',
            boxShadow: '0 8px 32px rgba(108,99,255,0.12)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          '&.Mui-selected': {
            background: 'rgba(108,99,255,0.15)',
            borderLeft: '3px solid #6C63FF',
          },
        },
      },
    },
  },
})
