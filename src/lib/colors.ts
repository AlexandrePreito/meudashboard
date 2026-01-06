export const brandColors = {
  blue: {
    name: 'Azul',
    primary: '#2563eb',
    hover: '#1d4ed8',
    light: '#dbeafe',
    text: '#1e40af'
  },
  cyan: {
    name: 'Ciano',
    primary: '#0891b2',
    hover: '#0e7490',
    light: '#cffafe',
    text: '#155e75'
  },
  green: {
    name: 'Verde',
    primary: '#16a34a',
    hover: '#15803d',
    light: '#dcfce7',
    text: '#166534'
  },
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
  indigo: {
    name: 'Índigo',
    primary: '#4f46e5',
    hover: '#4338ca',
    light: '#e0e7ff',
    text: '#3730a3'
  }
};

export type BrandColor = keyof typeof brandColors;

export function getColorConfig(color: string) {
  return brandColors[color as BrandColor] || brandColors.blue;
}
