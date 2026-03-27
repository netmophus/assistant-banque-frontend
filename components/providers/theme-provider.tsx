'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'default' | 'emerald' | 'sunset' | 'mono' | 'system';

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const initialState: ThemeProviderState = {
  theme: 'default',
  setTheme: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'default',
  storageKey = 'bankia-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  useEffect(() => {
    // Récupérer le thème depuis localStorage
    const storedTheme = localStorage.getItem(storageKey) as Theme;
    
    if (storedTheme) {
      setTheme(storedTheme);
    } else {
      // Utiliser le thème par défaut
      setTheme(defaultTheme);
    }
  }, [defaultTheme, storageKey]);

  useEffect(() => {
    // Appliquer le thème au document
    const root = window.document.documentElement;
    
    // Supprimer tous les attributs data-theme
    root.removeAttribute('data-theme');
    
    // Appliquer le nouveau thème
    if (theme === 'system') {
      // Détecter les préférences système
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      // Pour l'instant, on utilise 'default' pour le dark (plus tard on pourrait ajouter light)
      root.setAttribute('data-theme', prefersDark ? 'default' : 'default');
    } else {
      root.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
