'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

// Interface para grupo de empresas
export interface CompanyGroup {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  primary_color?: string | null;
  use_developer_logo?: boolean;
  use_developer_colors?: boolean;
}

interface UserData {
  id: string;
  is_master?: boolean;
  is_developer?: boolean;
  role?: string;
}

// Interface para desenvolvedor
export interface DeveloperInfo {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
}

// Tipo do contexto de menu
interface MenuContextType {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
  activeGroup: CompanyGroup | null;
  setActiveGroup: (group: CompanyGroup | null) => void;
  user: UserData | null;
  setUser: (user: UserData | null) => void;
  developer: DeveloperInfo | null;
  setDeveloper: (developer: DeveloperInfo | null) => void;
}

// Cria o contexto
const MenuContext = createContext<MenuContextType | undefined>(undefined);

// Provider do contexto
interface MenuProviderProps {
  children: ReactNode;
}

export function MenuProvider({ children }: MenuProviderProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [activeGroup, setActiveGroupState] = useState<CompanyGroup | null>(() => {
    // Tenta ler do localStorage no primeiro render
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('active-group');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return null;
        }
      }
    }
    return null;
  });
  const [user, setUser] = useState<UserData | null>(null);
  const [developer, setDeveloper] = useState<DeveloperInfo | null>(null);

  // Função para setar grupo e salvar no localStorage
  function setActiveGroup(group: CompanyGroup | null) {
    setActiveGroupState(group);
    if (typeof window !== 'undefined') {
      if (group) {
        localStorage.setItem('active-group', JSON.stringify(group));
      } else {
        localStorage.removeItem('active-group');
      }
    }
  }

  return (
    <MenuContext.Provider
      value={{
        isCollapsed,
        setIsCollapsed,
        activeGroup,
        setActiveGroup,
        user,
        setUser,
        developer,
        setDeveloper,
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




