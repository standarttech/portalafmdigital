import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type BaseTheme = 'dark' | 'light';
export type ColorScheme = 'default' | 'midnight-blue' | 'clean-light' | 'midnight-red';

interface ThemeContextType {
  theme: BaseTheme;
  setTheme: (t: BaseTheme) => void;
  toggleTheme: () => void;
  fxEnabled: boolean;
  setFxEnabled: (v: boolean) => void;
  toggleFx: () => void;
  isFuturistic: boolean;
  colorScheme: ColorScheme;
  setColorScheme: (s: ColorScheme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
  fxEnabled: false,
  setFxEnabled: () => {},
  toggleFx: () => {},
  isFuturistic: false,
  colorScheme: 'default',
  setColorScheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<BaseTheme>(() => {
    const saved = localStorage.getItem('app-theme');
    if (saved === 'dark' || saved === 'light') return saved;
    if (saved === 'futuristic') return 'dark';
    return 'dark';
  });

  const [fxEnabled, setFxEnabledState] = useState<boolean>(() => {
    const saved = localStorage.getItem('app-fx');
    if (saved === 'true') return true;
    if (localStorage.getItem('app-theme') === 'futuristic') return true;
    return false;
  });

  const [colorScheme, setColorSchemeState] = useState<ColorScheme>(() => {
    const saved = localStorage.getItem('app-color-scheme');
    if (saved === 'midnight-blue' || saved === 'clean-light' || saved === 'midnight-red' || saved === 'default') return saved;
    return 'default';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark', 'futuristic', 'scheme-midnight-blue', 'scheme-clean-light', 'scheme-midnight-red');

    // Color scheme determines the base theme automatically
    if (colorScheme === 'midnight-blue') {
      root.classList.add('dark', 'scheme-midnight-blue');
    } else if (colorScheme === 'midnight-red') {
      root.classList.add('dark', 'scheme-midnight-red');
    } else if (colorScheme === 'clean-light') {
      root.classList.add('scheme-clean-light');
    } else {
      if (theme === 'dark') root.classList.add('dark');
    }

    if (fxEnabled) root.classList.add('futuristic');

    localStorage.setItem('app-theme', theme);
    localStorage.setItem('app-fx', String(fxEnabled));
    localStorage.setItem('app-color-scheme', colorScheme);
  }, [theme, fxEnabled, colorScheme]);

  const setTheme = useCallback((t: BaseTheme) => {
    setThemeState(t);
    setColorSchemeState('default');
  }, []);
  const toggleTheme = useCallback(() => {
    setThemeState(prev => prev === 'dark' ? 'light' : 'dark');
    setColorSchemeState('default');
  }, []);
  const setFxEnabled = useCallback((v: boolean) => setFxEnabledState(v), []);
  const toggleFx = useCallback(() => setFxEnabledState(prev => !prev), []);
  const setColorScheme = useCallback((s: ColorScheme) => {
    setColorSchemeState(s);
    if (s === 'midnight-blue' || s === 'midnight-red') setThemeState('dark');
    else if (s === 'clean-light') setThemeState('light');
  }, []);

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      toggleTheme,
      fxEnabled,
      setFxEnabled,
      toggleFx,
      isFuturistic: fxEnabled,
      colorScheme,
      setColorScheme,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export type Theme = BaseTheme;
