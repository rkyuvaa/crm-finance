import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

interface ThemeModeContextValue {
  mode: 'light' | 'dark';
  toggleThemeMode: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  mode: 'light',
  toggleThemeMode: () => {},
});

export const useThemeMode = () => useContext(ThemeModeContext);

export function ThemeModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('erp_theme_mode');
    return (saved === 'dark' || saved === 'light') ? saved : 'light';
  });

  const toggleThemeMode = () => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('erp_theme_mode', next);
      return next;
    });
  };

  useEffect(() => {
    if (mode === 'dark') {
      document.body.classList.add('dark-mode');
      document.body.style.backgroundColor = '#121316';
      document.body.style.color = '#F1F5F9';
    } else {
      document.body.classList.remove('dark-mode');
      document.body.style.backgroundColor = '#F7F9F5';
      document.body.style.color = '#16231B';
    }
  }, [mode]);

  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#087A3D',
            dark: '#04552B',
            light: '#2F9757',
            contrastText: '#FFFFFF',
          },
          secondary: { main: '#04552B' },
          background: {
            default: mode === 'dark' ? '#121316' : '#F7F9F5',
            paper: mode === 'dark' ? '#1E1F23' : '#FFFFFF',
          },
          text: {
            primary: mode === 'dark' ? '#F1F5F9' : '#16231B',
            secondary: mode === 'dark' ? '#94A3B8' : '#44584C',
          },
          divider: mode === 'dark' ? '#2D2E33' : '#E4EBE1',
          success: { main: '#16A34A' },
          error: { main: '#DC2626' },
          warning: { main: '#D97706' },
          info: { main: '#2563EB' },
        },
        shape: { borderRadius: 10 },
        typography: {
          fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
          button: { textTransform: 'none', fontWeight: 600 },
        },
        components: {
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: 'none',
                borderColor: mode === 'dark' ? '#2D2E33' : '#E4EBE1',
              },
            },
          },
          MuiTableCell: {
            styleOverrides: {
              root: {
                borderBottomColor: mode === 'dark' ? '#2D2E33' : '#F0F4EE',
              },
            },
          },
        },
      }),
    [mode]
  );

  return (
    <ThemeModeContext.Provider value={{ mode, toggleThemeMode }}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
