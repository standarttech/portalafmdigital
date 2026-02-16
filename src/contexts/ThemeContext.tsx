import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Theme = 'dark' | 'light' | 'futuristic';

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  isFuturistic: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
  isFuturistic: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('app-theme');
    if (saved === 'light' || saved === 'dark' || saved === 'futuristic') return saved;
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'futuristic');
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'futuristic') {
      root.classList.add('dark', 'futuristic');
    }
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(() => setThemeState(prev => {
    if (prev === 'dark') return 'light';
    if (prev === 'light') return 'dark';
    return 'dark';
  }), []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, isFuturistic: theme === 'futuristic' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
