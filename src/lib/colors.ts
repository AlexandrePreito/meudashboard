export const brandColors = {
  red: {
    name: 'Vermelho',
    primary: '#dc2626',
    hover: '#b91c1c',
    light: '#fee2e2',
    text: '#991b1b'
  },
  orange: {
    name: 'Laranja',
    primary: '#ea580c',
    hover: '#c2410c',
    light: '#ffedd5',
    text: '#9a3412'
  },
  yellow: {
    name: 'Amarelo',
    primary: '#eab308',
    hover: '#ca8a04',
    light: '#fef9c3',
    text: '#854d0e'
  },
  green: {
    name: 'Verde',
    primary: '#16a34a',
    hover: '#15803d',
    light: '#dcfce7',
    text: '#166534'
  },
  emerald: {
    name: 'Emerald',
    primary: '#10b981',
    hover: '#059669',
    light: '#d1fae5',
    text: '#065f46'
  },
  teal: {
    name: 'Teal',
    primary: '#14b8a6',
    hover: '#0d9488',
    light: '#ccfbf1',
    text: '#134e4a'
  },
  cyan: {
    name: 'Ciano',
    primary: '#0891b2',
    hover: '#0e7490',
    light: '#cffafe',
    text: '#155e75'
  },
  blue: {
    name: 'Azul',
    primary: '#2563eb',
    hover: '#1d4ed8',
    light: '#dbeafe',
    text: '#1e40af'
  },
  indigo: {
    name: 'Índigo',
    primary: '#4f46e5',
    hover: '#4338ca',
    light: '#e0e7ff',
    text: '#3730a3'
  },
  purple: {
    name: 'Roxo',
    primary: '#9333ea',
    hover: '#7e22ce',
    light: '#f3e8ff',
    text: '#6b21a8'
  },
  pink: {
    name: 'Rosa',
    primary: '#db2777',
    hover: '#be185d',
    light: '#fce7f3',
    text: '#9d174d'
  },
  slate: {
    name: 'Slate',
    primary: '#475569',
    hover: '#334155',
    light: '#f1f5f9',
    text: '#1e293b'
  },
  black: {
    name: 'Preto',
    primary: '#000000',
    hover: '#1a1a1a',
    light: '#f3f4f6',
    text: '#000000'
  }
};

export type BrandColor = keyof typeof brandColors;

export function getColorConfig(color: string) {
  // Se for um codigo hex, gera as variacoes automaticamente
  if (color.startsWith('#')) {
    return {
      name: 'Custom',
      primary: color,
      hover: adjustColor(color, -20), // mais escuro
      light: adjustColor(color, 80, 0.2), // mais claro com transparencia
      text: adjustColor(color, -40) // ainda mais escuro
    };
  }
  
  return brandColors[color as BrandColor] || brandColors.blue;
}

// Funcao auxiliar para ajustar cor
function adjustColor(hex: string, amount: number, alpha?: number): string {
  // Remove o # se existir
  hex = hex.replace('#', '');
  
  // Converte para RGB
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);
  
  // Ajusta os valores
  r = Math.max(0, Math.min(255, r + amount));
  g = Math.max(0, Math.min(255, g + amount));
  b = Math.max(0, Math.min(255, b + amount));
  
  // Se tiver alpha, retorna rgba
  if (alpha !== undefined) {
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  // Converte de volta para hex
  const toHex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
