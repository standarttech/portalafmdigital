import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type BaseTheme = 'dark' | 'light';

interface ThemeContextType {
  theme: BaseTheme;
  setTheme: (t: BaseTheme) => void;
  toggleTheme: () => void;
  fxEnabled: boolean;
  setFxEnabled: (v: boolean) => void;
  toggleFx: () => void;
  isFuturistic: boolean; // kept for backward compat = fxEnabled
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
  fxEnabled: false,
  setFxEnabled: () => {},
  toggleFx: () => {},
  isFuturistic: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<BaseTheme>(() => {
    const saved = localStorage.getItem('app-theme');
    // migrate legacy 'futuristic' value
    if (saved === 'dark' || saved === 'light') return saved;
    if (saved === 'futuristic') return 'dark';
    return 'dark';
  });

  const [fxEnabled, setFxEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem('app-fx');
    if (saved === 'true') return true;
    // migrate: if old theme was futuristic, enable fx
    if (localStorage.getItem('app-theme') === 'futuristic') return true;
    return false;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'futuristic');
    if (theme === 'dark') root.classList.add('dark');
    if (fxEnabled) root.classList.add('futuristic');
    localStorage.setItem('app-theme', theme);
    localStorage.setItem('app-fx', String(fxEnabled));
  }, [theme, fxEnabled]);

  const setTheme = useCallback((t: BaseTheme) => setThemeState(t), []);
  const toggleTheme = useCallback(() => setThemeState(prev => prev === 'dark' ? 'light' : 'dark'), []);
  const setFxEnabled = useCallback((v: boolean) => setFxEnabledState(v), []);
  const toggleFx = useCallback(() => setFxEnabledState(prev => !prev), []);

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      toggleTheme,
      fxEnabled,
      setFxEnabled,
      toggleFx,
      isFuturistic: fxEnabled,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// Re-export Theme type for backward compat
export type Theme = BaseTheme;
