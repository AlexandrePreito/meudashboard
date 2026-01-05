/**
 * Contexto de Menu Global
 * 
 * Gerencia o estado global do menu lateral do sistema MeuDashboard.
 * 
 * Funcionalidades:
 * - Controle de colapso/expansão do menu (isCollapsed)
 * - Gerenciamento do grupo de empresas ativo (activeGroup)
 * - Hook useMenu para acesso ao contexto
 */

'use client';

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from 'react';

// Interface para grupo de empresas
export interface CompanyGroup {
  id: string;
  name: string;
  slug: string;
}

// Tipo do contexto de menu
interface MenuContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  activeGroup: CompanyGroup | null;
  setActiveGroup: (group: CompanyGroup | null) => void;
}

// Cria o contexto
const MenuContext = createContext<MenuContextType | undefined>(undefined);

// Provider do contexto
interface MenuProviderProps {
  children: ReactNode;
}

export function MenuProvider({ children }: MenuProviderProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeGroup, setActiveGroup] = useState<CompanyGroup | null>(null);

  return (
    <MenuContext.Provider
      value={{
        isCollapsed,
        setIsCollapsed,
        activeGroup,
        setActiveGroup,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
}

// Hook para usar o contexto
export function useMenu(): MenuContextType {
  const context = useContext(MenuContext);
  
  if (context === undefined) {
    throw new Error('useMenu deve ser usado dentro de um MenuProvider');
  }
  
  return context;
}




