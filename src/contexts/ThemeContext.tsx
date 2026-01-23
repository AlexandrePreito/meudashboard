'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { brandColors, getColorConfig } from '@/lib/colors';

interface ThemeContextType {
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  colors: typeof brandColors.blue;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [primaryColor, setPrimaryColorState] = useState(() => {
    // Tenta ler do localStorage no primeiro render (client-side)
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme-color') || 'blue';
    }
    return 'blue';
  });
  const [colors, setColors] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme-color');
      if (saved) return getColorConfig(saved);
    }
    return brandColors.blue;
  });
  const [mounted, setMounted] = useState(false);

  // Aplicar tema salvo imediatamente ao montar
  useEffect(() => {
    const saved = localStorage.getItem('theme-color');
    if (saved) {
      const colorConfig = getColorConfig(saved);
      // Usar setTimeout para evitar setState síncrono em effect
      setTimeout(() => {
        setColors(colorConfig);
        setPrimaryColorState(saved);
      }, 0);
      document.documentElement.style.setProperty('--color-primary', colorConfig.primary);
      document.documentElement.style.setProperty('--color-primary-hover', colorConfig.hover);
      document.documentElement.style.setProperty('--color-primary-light', colorConfig.light);
      document.documentElement.style.setProperty('--color-primary-text', colorConfig.text);
    }
    setTimeout(() => setMounted(true), 0);
  }, []);

  function setPrimaryColor(color: string) {
    const colorConfig = getColorConfig(color);
    setColors(colorConfig);
    setPrimaryColorState(color);
    
    // Salvar no localStorage
    localStorage.setItem('theme-color', color);
    
    // Aplicar CSS variables
    document.documentElement.style.setProperty('--color-primary', colorConfig.primary);
    document.documentElement.style.setProperty('--color-primary-hover', colorConfig.hover);
    document.documentElement.style.setProperty('--color-primary-light', colorConfig.light);
    document.documentElement.style.setProperty('--color-primary-text', colorConfig.text);
  }

  return (
    <ThemeContext.Provider value={{ primaryColor, setPrimaryColor, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
