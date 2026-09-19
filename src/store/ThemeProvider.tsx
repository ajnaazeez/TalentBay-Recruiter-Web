import React, { useState, useEffect, useCallback } from 'react';
import { Theme, ThemeContext } from './ThemeContext';

const THEME_STORAGE_KEY = 'talentbay_recruiter_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    } catch {
      // ignore
    }
    return 'system';
  });

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() => {
    return theme === 'dark' ? 'dark' : 'light';
  });

  const applyTheme = useCallback((activeTheme: Theme) => {
    // System Default is explicitly treated as Light Theme (does not follow OS dark mode)
    const isDark = activeTheme === 'dark';
    const resolved = isDark ? 'dark' : 'light';
    setResolvedTheme(resolved);

    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
      root.style.colorScheme = 'light';
    }
  }, []);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }
    applyTheme(newTheme);
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
