import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { getMuiTheme, darkSurfaces, lightSurfaces } from '@/theme/muiTheme';

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
    return saved === 'dark' || saved === 'light' ? saved : 'light';
  });

  const toggleThemeMode = () => {
    setMode((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('erp_theme_mode', next);
      return next;
    });
  };

  useEffect(() => {
    const surfaces = mode === 'dark' ? darkSurfaces : lightSurfaces;
    if (mode === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    document.body.style.backgroundColor = surfaces.background;
    document.body.style.color = surfaces.textPrimary;
  }, [mode]);

  const muiTheme = useMemo(() => getMuiTheme(mode), [mode]);

  return (
    <ThemeModeContext.Provider value={{ mode, toggleThemeMode }}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
}
