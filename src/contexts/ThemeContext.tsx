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
  const [primaryColor, setPrimaryColor] = useState('blue');
  const [colors, setColors] = useState(brandColors.blue);

  useEffect(() => {
    const colorConfig = getColorConfig(primaryColor);
    setColors(colorConfig);
    
    // Aplicar CSS variables
    document.documentElement.style.setProperty('--color-primary', colorConfig.primary);
    document.documentElement.style.setProperty('--color-primary-hover', colorConfig.hover);
    document.documentElement.style.setProperty('--color-primary-light', colorConfig.light);
    document.documentElement.style.setProperty('--color-primary-text', colorConfig.text);
  }, [primaryColor]);

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
