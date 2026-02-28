'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
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
  selectedGroupIds: string[];
  setSelectedGroupIds: (ids: string[]) => void;
  user: UserData | null;
  setUser: (user: UserData | null) => void;
  developer: DeveloperInfo | null;
  setDeveloper: (developer: DeveloperInfo | null) => void;
  groups: CompanyGroup[];
  setGroups: (groups: CompanyGroup[]) => void;
  loadGroups: () => Promise<void>;
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
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(() => {
    // Tenta ler do localStorage no primeiro render
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selected-group-ids');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          return [];
        }
      }
    }
    return [];
  });
  const [user, setUser] = useState<UserData | null>(null);
  const [developer, setDeveloper] = useState<DeveloperInfo | null>(null);
  const [groups, setGroups] = useState<CompanyGroup[]>([]);

  // Função para setar grupo e salvar no localStorage (declarada antes de loadGroups para uso interno)
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

  const loadGroups = useCallback(async () => {
    const u = user;
    if (!u?.id) return;
    try {
      const res = await fetch('/api/user/groups', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const freshGroups = (data.groups || []) as CompanyGroup[];
        setGroups(freshGroups);
        if (data.developer) setDeveloper(data.developer);
        if (freshGroups.length > 0) {
          setActiveGroupState((current) => {
            let next: CompanyGroup | null;
            if (current) {
              const updated = freshGroups.find((g) => g.id === current.id);
              if (updated) {
                next = JSON.stringify(updated) !== JSON.stringify(current) ? updated : current;
              } else {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('active-group');
                  localStorage.removeItem('selected-group-ids');
                }
                if (u.is_master) {
                  const saved = typeof window !== 'undefined' ? localStorage.getItem('active-group') : null;
                  if (saved) {
                    try {
                      const parsed = JSON.parse(saved);
                      const found = freshGroups.find((g) => g.id === parsed.id);
                      next = found || null;
                    } catch {
                      next = null;
                    }
                  } else {
                    next = null;
                  }
                } else {
                  next = freshGroups[0];
                }
              }
            } else {
              if (u.is_master) {
                const saved = typeof window !== 'undefined' ? localStorage.getItem('active-group') : null;
                if (saved) {
                  try {
                    const parsed = JSON.parse(saved);
                    const found = freshGroups.find((g) => g.id === parsed.id);
                    next = found || null;
                  } catch {
                    next = null;
                  }
                } else {
                  next = null;
                }
              } else {
                next = freshGroups[0];
              }
            }
            if (typeof window !== 'undefined' && next) {
              localStorage.setItem('active-group', JSON.stringify(next));
            } else if (typeof window !== 'undefined' && !next) {
              localStorage.removeItem('active-group');
            }
            return next;
          });
        } else {
          if (typeof window !== 'undefined' && !u.is_master) {
            localStorage.removeItem('active-group');
            localStorage.removeItem('selected-group-ids');
          }
          setActiveGroupState(null);
        }
      } else {
        if (res.status !== 401 && res.status !== 403) {
          setGroups([]);
          setActiveGroupState(null);
        }
      }
    } catch {
      setGroups([]);
      setActiveGroupState(null);
    }
  }, [user?.id, user?.is_master]);

  const loadedUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user?.id || loadedUserIdRef.current === user.id) return;
    loadedUserIdRef.current = user.id;
    setGroups([]);
    loadGroups();
  }, [user?.id, loadGroups]);

  // Função para setar grupos selecionados e salvar no localStorage
  function setSelectedGroupIdsState(ids: string[]) {
    setSelectedGroupIds(ids);
    if (typeof window !== 'undefined') {
      localStorage.setItem('selected-group-ids', JSON.stringify(ids));
    }
  }

  return (
    <MenuContext.Provider
      value={{
        isCollapsed,
        setIsCollapsed,
        activeGroup,
        setActiveGroup,
        selectedGroupIds,
        setSelectedGroupIds: setSelectedGroupIdsState,
        user,
        setUser,
        developer,
        setDeveloper,
        groups,
        setGroups,
        loadGroups,
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




