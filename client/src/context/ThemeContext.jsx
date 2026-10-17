import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

const readSaved = () => {
  try {
    return localStorage.getItem('theme');
  } catch {
    return null;
  }
};

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );

  const apply = useCallback((next) => {
    document.documentElement.classList.toggle('dark', next === 'dark');
    setThemeState(next);
  }, []);

  const setTheme = useCallback(
    (next) => {
      try {
        localStorage.setItem('theme', next);
      } catch {
        /* storage can be blocked */
      }
      apply(next);
    },
    [apply]
  );

  const toggleTheme = useCallback(() => setTheme(theme === 'dark' ? 'light' : 'dark'), [theme, setTheme]);

  // No saved choice: follow the computer's theme when it changes
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => {
      if (!readSaved()) apply(e.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [apply]);

  const value = useMemo(() => ({ theme, isDark: theme === 'dark', setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}