'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LogOut, ChevronDown, User, Zap, Menu, X, Key, Shield, LayoutDashboard, Sparkles
} from 'lucide-react';
import { useMenu } from '@/contexts/MenuContext';
import { useTheme } from '@/contexts/ThemeContext';

// Componente do Asterisco Animado (gira TODA vez que rolar)
function AnimatedLogo({ size = 48, scrollY = 0, isInitialSpin = false }: { size?: number; scrollY?: number; isInitialSpin?: boolean }) {
  const rotation = isInitialSpin ? 0 : scrollY * 0.5;

  return (
    <svg 
      viewBox="0 0 100 100" 
      width={size} 
      height={size}
      style={{ 
        transform: `rotate(${rotation}deg)`,
        transition: isInitialSpin ? 'none' : 'transform 0.1s ease-out',
        animation: isInitialSpin ? 'initialSpin 2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards' : 'none'
      }}
    >
      <defs>
        <linearGradient id={`logoGradHeader${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <g fill={`url(#logoGradHeader${size})`}>
        <rect x="45" y="10" width="10" height="80" rx="5" />
        <rect x="45" y="10" width="10" height="80" rx="5" transform="rotate(60 50 50)" />
        <rect x="45" y="10" width="10" height="80" rx="5" transform="rotate(120 50 50)" />
      </g>
    </svg>
  );
}

// Nome da marca com M e D maiores
function BrandName({ className = "", size = "text-xl" }: { className?: string; size?: string }) {
  return (
    <span className={`brand-name ${size} ${className}`} style={{ fontFamily: "'Orbitron', 'Exo 2', sans-serif", fontWeight: 700, letterSpacing: '0.02em', color: '#2563eb' }}>
      <span className="text-[1.2em]">M</span>eu<span className="text-[1.2em]">D</span>ashboard
    </span>
  );
}

interface CompanyGroup {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  primary_color?: string | null;
  use_developer_logo?: boolean;
  use_developer_colors?: boolean;
}

interface HeaderProps {
  user: {
    id: string;
    email: string;
    full_name?: string;
    is_master?: boolean;
    is_developer?: boolean;
    role?: string;
  };
}

// Menu dinâmico baseado no perfil do usuário
function getNavItems(user: HeaderProps['user']) {
  const items: { href: string; label: string }[] = [];

  // User comum: menu vazio no header (navegação fica no sidebar)
  if (!user.is_master && !user.is_developer && user.role === 'user') {
    return items;
  }

  // MASTER: Admin
  if (user.is_master) {
    items.push({ href: '/admin', label: 'Admin' });
  }

  // DESENVOLVEDOR: Desenvolvedor
  if (user.is_developer) {
    items.push({ href: '/dev', label: 'Desenvolvedor' });
  }
  
  // ADMIN (não master, não dev): Administrador
  if (!user.is_master && !user.is_developer && user.role === 'admin') {
    items.push({ href: '/administrador', label: 'Administrador' });
    items.push({ href: '/powerbi', label: 'Power BI' });
    items.push({ href: '/whatsapp', label: 'WhatsApp' });
    items.push({ href: '/assistente-ia/evolucao', label: 'Assistente IA' });
    items.push({ href: '/dashboard', label: 'Dashboards' });
    // ADMIN NÃO TEM Configurações
    return items;
  }

  // Para developer: Power BI e WhatsApp vêm antes de Dashboards
  if (user.is_developer && !user.is_master) {
    items.push({ href: '/powerbi', label: 'Power BI' });
    items.push({ href: '/whatsapp', label: 'WhatsApp' });
    items.push({ href: '/assistente-ia/evolucao', label: 'Assistente IA' });
    items.push({ href: '/dashboard', label: 'Dashboards' });
  } else if (user.is_master) {
    // Para master: ordem original
    items.push({ href: '/dashboard', label: 'Dashboards' });
    items.push({ href: '/powerbi', label: 'Power BI' });
    items.push({ href: '/whatsapp', label: 'WhatsApp' });
    items.push({ href: '/assistente-ia/evolucao', label: 'Assistente IA' });
  }

  // Configurações: APENAS master
  if (user.is_master) {
    items.push({ href: '/configuracoes', label: 'Configurações' });
  }

  return items;
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeGroup, setActiveGroup, setIsCollapsed, developer, setDeveloper, selectedGroupIds, setSelectedGroupIds } = useMenu();
  const [groups, setGroups] = useState<CompanyGroup[]>([]);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const groupDropdownRefDesktop = useRef<HTMLDivElement>(null);
  const groupDropdownRefMobile = useRef<HTMLDivElement>(null);
  const { setPrimaryColor } = useTheme();

  // Verificar se ainda está carregando os dados do grupo
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const [isInitialSpin, setIsInitialSpin] = useState(true);

  // Verificar se está na área dev
  const isDevArea = pathname?.startsWith('/dev');
  // Verificar se está na área admin
  const isAdminArea = pathname?.startsWith('/admin');

  // Detecta scroll para girar os asteriscos TODA vez
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Animação de entrada - gira e para após 2 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialSpin(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const isOutsideDesktop = groupDropdownRefDesktop.current && !groupDropdownRefDesktop.current.contains(target);
      const isOutsideMobile = groupDropdownRefMobile.current && !groupDropdownRefMobile.current.contains(target);
      
      // Só fecha se clicar fora de AMBOS os refs
      if (isOutsideDesktop && isOutsideMobile) {
        setShowGroupDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Determinar logo e cor do tema
  const brandLogo = useMemo(() => {
    // 1. Master: sempre logo do MeuDashboard (null = usa AnimatedLogo)
    if (user.is_master) {
      return null; // null faz mostrar AnimatedLogo
    }
    
    // 2. Desenvolvedor: sempre logo do desenvolvedor
    if (user.is_developer) {
      return developer?.logo_url || null;
    }
    
    // 3. Admin/Visualizador: respeitar configurações do grupo
    if (activeGroup) {
      // Se grupo usa logo do developer (padrão é true)
      if (activeGroup.use_developer_logo !== false) {
        return developer?.logo_url || activeGroup.logo_url || null;
      }
      // Caso contrário, usa logo do próprio grupo
      return activeGroup.logo_url || null;
    }
    
    // Fallback: se não tem grupo, tenta logo do developer
    return developer?.logo_url || null;
  }, [user.is_master, user.is_developer, developer?.logo_url, activeGroup?.logo_url, activeGroup?.use_developer_logo]);

  const brandName = useMemo(() => {
    // 1. Master: sempre "MeuDashboard"
    if (user.is_master) {
      return 'MeuDashboard';
    }
    
    // 2. Desenvolvedor: sempre nome do desenvolvedor
    if (user.is_developer) {
      return developer?.name || 'MeuDashboard';
    }
    
    // 3. Admin/Visualizador: respeitar configurações do grupo
    if (activeGroup) {
      // Se grupo usa logo do developer (padrão é true)
      if (activeGroup.use_developer_logo !== false) {
        return developer?.name || activeGroup.name || 'MeuDashboard';
      }
      // Caso contrário, usa nome do grupo
      return activeGroup.name || 'MeuDashboard';
    }
    
    // Fallback: se não tem grupo, tenta nome do developer
    return developer?.name || 'MeuDashboard';
  }, [user.is_master, user.is_developer, developer?.name, activeGroup?.name, activeGroup?.use_developer_logo]);

  const primaryColorValue = useMemo(() => {
    // Master sempre usa azul
    if (user.is_master) {
      return '#3B82F6';
    }
    
    // Desenvolvedor sempre usa sua cor (independente da página)
    if (user.is_developer) {
      return developer?.primary_color || '#0ea5e9';
    }
    
    // Se o grupo usa cores do developer (padrão é true), usa cor do developer
    if (activeGroup?.use_developer_colors !== false && developer?.primary_color) {
      return developer.primary_color;
    }
    
    // Se o grupo tem cor própria, usa cor do grupo
    if (activeGroup?.primary_color) {
      return activeGroup.primary_color;
    }
    
    // Fallback: cor do developer ou padrão
    return developer?.primary_color || '#0ea5e9';
  }, [user.is_master, user.is_developer, developer?.primary_color, activeGroup?.primary_color, activeGroup?.use_developer_colors]);


  useEffect(() => {
    setPrimaryColor(primaryColorValue);
  }, [primaryColorValue, setPrimaryColor]);

  const loadGroups = useCallback(async () => {
    // SEGURANÇA: Verificar se usuário está definido antes de carregar grupos
    if (!user?.id) {
      setIsLoadingGroups(false);
      return;
    }
    
    setIsLoadingGroups(true);
    try {
      const res = await fetch('/api/user/groups', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const freshGroups = data.groups || [];
        
        // SEGURANÇA: Sempre substituir groups com os dados frescos da API
        // A API já filtra corretamente por developer_id, então apenas ela pode ser confiável
        setGroups(freshGroups);
        
        // Setar developer se existir
        if (data.developer) {
          setDeveloper(data.developer);
        }
        
        if (freshGroups.length > 0) {
          const currentActiveGroup = activeGroup;
          if (currentActiveGroup) {
            // SEGURANÇA: Verificar se o activeGroup pertence ao desenvolvedor atual
            const updatedGroup = freshGroups.find((g: CompanyGroup) => g.id === currentActiveGroup.id);
            if (updatedGroup) {
              // Grupo existe e pertence ao dev atual - atualiza com dados frescos
              if (JSON.stringify(updatedGroup) !== JSON.stringify(currentActiveGroup)) {
                setActiveGroup(updatedGroup);
              }
            } else {
              // Grupo antigo NÃO pertence mais ao desenvolvedor atual (SEGURANÇA)
              console.warn('[SEGURANÇA Header] Grupo ativo salvo não pertence ao desenvolvedor atual:', currentActiveGroup.id, 'Limpando...');
              // Limpar do localStorage
              if (typeof window !== 'undefined') {
                localStorage.removeItem('active-group');
                localStorage.removeItem('selected-group-ids');
              }
              // Se é Master, mantém null (Todos). Senão, seleciona o primeiro
              if (!user.is_master) {
                setActiveGroup(freshGroups[0]);
              } else {
                setActiveGroup(null);
              }
            }
          } else {
            // Não tinha grupo selecionado
            // Se é Master, mantém null (Todos). Senão, seleciona o primeiro
            if (!user.is_master) {
              setActiveGroup(freshGroups[0]);
            } else {
              setActiveGroup(null);
            }
          }
        } else {
          // SEGURANÇA: Se não há grupos, limpar activeGroup também
          setActiveGroup((currentActiveGroup) => {
            if (currentActiveGroup && !user.is_master) {
              console.warn('[SEGURANÇA Header] Nenhum grupo disponível, limpando activeGroup');
              if (typeof window !== 'undefined') {
                localStorage.removeItem('active-group');
                localStorage.removeItem('selected-group-ids');
              }
              return null;
            }
            return currentActiveGroup;
          });
        }
      } else {
        // SEGURANÇA: Se a API retornou erro, tentar ler o erro da resposta
        let errorMessage = 'Erro desconhecido';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // Se não conseguir parsear, usar o status
          errorMessage = `Erro HTTP ${res.status}`;
        }
        
        // Log detalhado do erro
        const errorDetails = {
          status: res.status,
          statusText: res.statusText,
          error: errorMessage,
          userId: user?.id,
          userEmail: user?.email,
          url: res.url
        };
        console.error('[SEGURANÇA Header] Erro ao carregar grupos da API:', JSON.stringify(errorDetails, null, 2));
        
        // Não limpar grupos se for erro 401 (não autenticado) - pode ser temporário
        // Só limpar se for erro 500 ou outro erro crítico
        if (res.status !== 401 && res.status !== 403) {
          setGroups([]);
          setActiveGroup((currentActiveGroup) => {
            if (!user.is_master && currentActiveGroup) {
              if (typeof window !== 'undefined') {
                localStorage.removeItem('active-group');
                localStorage.removeItem('selected-group-ids');
              }
              return null;
            }
            return currentActiveGroup;
          });
        }
      }
    } catch (error: any) {
      // Log detalhado do erro capturado
      const errorDetails = {
        message: error?.message || 'Erro desconhecido',
        name: error?.name || 'Error',
        stack: error?.stack ? error.stack.substring(0, 500) : 'N/A',
        userId: user?.id || 'N/A',
        userEmail: user?.email || 'N/A',
        errorString: String(error),
        errorType: typeof error
      };
      console.error('[SEGURANÇA Header] Erro ao carregar grupos:', JSON.stringify(errorDetails, null, 2));
      
      // Se for um erro de rede, não limpar grupos (pode ser temporário)
      if (error?.message?.includes('fetch') || error?.message?.includes('network') || error?.name === 'TypeError') {
        console.warn('[SEGURANÇA Header] Erro de rede detectado, mantendo grupos existentes');
        setIsLoadingGroups(false);
        return;
      }
      // SEGURANÇA: Em caso de erro de rede ou outro erro, limpar grupos para evitar mostrar dados incorretos
      setGroups([]);
      setActiveGroup((currentActiveGroup) => {
        if (!user.is_master && currentActiveGroup) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('active-group');
            localStorage.removeItem('selected-group-ids');
          }
          return null;
        }
        return currentActiveGroup;
      });
    } finally {
      setIsLoadingGroups(false);
    }
  }, [user?.id, user?.is_master, setDeveloper, setActiveGroup]);

  useEffect(() => {
    // SEGURANÇA: Carregar grupos quando o componente monta ou quando o usuário muda
    // Limpar grupos anteriores para evitar mostrar grupos do dev anterior
    if (user?.id) {
      setGroups([]); // Limpar grupos anteriores antes de carregar novos
      loadGroups();
    }
  }, [user?.id, loadGroups]); // Recarregar grupos sempre que o usuário mudar

  async function handleLogout() {
    try {
      // Limpar localStorage ao fazer logout para evitar vazamento de dados entre devs
      if (typeof window !== 'undefined') {
        localStorage.removeItem('active-group');
        localStorage.removeItem('selected-group-ids');
      }
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      router.push('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }

  function toggleGroupSelection(groupId: string) {
    if (user.is_master) {
      // Master: seleção múltipla com checkboxes
      if (selectedGroupIds.includes(groupId)) {
        setSelectedGroupIds(selectedGroupIds.filter(id => id !== groupId));
      } else {
        setSelectedGroupIds([...selectedGroupIds, groupId]);
      }
    } else {
      // Outros usuários: seleção única (comportamento antigo)
      const group = groups.find(g => g.id === groupId);
      if (group) {
        setActiveGroup(group);
        setShowGroupDropdown(false);
      }
    }
  }

  function toggleAllGroups() {
    if (user.is_master) {
      if (selectedGroupIds.length === groups.length) {
        // Desmarcar todos
        setSelectedGroupIds([]);
        setActiveGroup(null);
      } else {
        // Marcar todos
        setSelectedGroupIds(groups.map(g => g.id));
        setActiveGroup(null);
      }
    }
  }

  const selectedGroupsText = useMemo(() => {
    if (!user.is_master) {
      // Para desenvolvedor ou admin, mostrar nome do grupo ativo ou "Selecionar grupo" se não houver
      if (activeGroup) {
        return activeGroup.name;
      }
      // Se não tem grupo ativo mas tem grupos disponíveis, mostrar "Selecionar grupo"
      if (groups.length > 0) {
        return 'Selecionar grupo';
      }
      return 'Grupo';
    }
    
    if (selectedGroupIds.length === 0) {
      return 'Todos';
    }
    
    if (selectedGroupIds.length === 1) {
      const group = groups.find(g => g.id === selectedGroupIds[0]);
      return group?.name || 'Grupo';
    }
    
    return `${selectedGroupIds.length} grupos`;
  }, [user.is_master, activeGroup?.name, groups.length, selectedGroupIds, groups]);

  function isActiveNav(href: string) {
    if (href === '/dashboard') {
      return pathname === '/dashboard' || pathname.startsWith('/tela');
    }
    if (href === '/dev') {
      return pathname.startsWith('/dev');
    }
    if (href === '/whatsapp') {
      return pathname.startsWith('/whatsapp') || pathname.startsWith('/alertas');
    }
    if (href === '/assistente-ia/evolucao') {
      return pathname.startsWith('/assistente-ia');
    }
    return pathname.startsWith(href);
  }

  function handleMobileMenuToggle() {
    setShowMobileMenu(!showMobileMenu);
  }

  function handleMobileNavClick() {
    setShowMobileMenu(false);
  }

  return (
    <>
      <style>{`
        @keyframes initialSpin {
          0% {
            transform: rotate(0deg);
          }
          20% {
            transform: rotate(360deg);
          }
          50% {
            transform: rotate(600deg);
          }
          75% {
            transform: rotate(700deg);
          }
          100% {
            transform: rotate(720deg);
          }
        }
      `}</style>
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40">
        <div className="h-full px-4 flex items-center">
          {/* Mobile: Menu à esquerda */}
          <div className="lg:hidden">
            <button
              onClick={handleMobileMenuToggle}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {/* Esquerda - Logo e Seletor (largura fixa) - Desktop */}
          <div className="hidden lg:flex items-center gap-4 w-80 flex-shrink-0">
            {/* Logo */}
            <div className="flex items-center gap-2">
              {isLoadingGroups ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                  <div className="w-24 h-6 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : (
                <>
                  {user.is_master ? (
                    <>
                      <AnimatedLogo size={32} scrollY={scrollY} isInitialSpin={isInitialSpin} />
                      <BrandName size="text-xl" />
                    </>
                  ) : brandLogo ? (
                    <img
                      src={brandLogo}
                      alt={brandName}
                      className="h-9 w-auto max-w-[150px] object-contain"
                    />
                  ) : (
                    <>
                      <div className="p-1.5 rounded-lg" style={{ backgroundColor: primaryColorValue }}>
                        <Zap size={20} className="text-white" />
                      </div>
                      <span className="text-xl font-bold truncate max-w-[150px]" style={{ color: primaryColorValue }}>
                        {brandName}
                      </span>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Seletor de Grupo - Desktop */}
            {!isDevArea && !(user.is_master && isAdminArea) && (
              <div className="relative" ref={groupDropdownRefDesktop}>
                <button
                  onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <span className="text-sm font-medium text-gray-700 max-w-[150px] truncate">
                    {selectedGroupsText}
                  </span>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${showGroupDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showGroupDropdown && groups.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 max-h-96 overflow-y-auto">
                    {/* Opção "Todos" apenas para Master */}
                    {user.is_master && (
                      <button
                        onClick={toggleAllGroups}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 flex items-center gap-2 ${
                          selectedGroupIds.length === groups.length ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroupIds.length === groups.length}
                          onChange={toggleAllGroups}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span>Todos os Grupos</span>
                      </button>
                    )}
                    {groups.map((group) => (
                      <button
                        key={group.id}
                        onClick={() => toggleGroupSelection(group.id)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                          user.is_master 
                            ? (selectedGroupIds.includes(group.id) ? 'bg-blue-50 text-blue-600' : 'text-gray-700')
                            : (activeGroup?.id === group.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700')
                        }`}
                      >
                        {user.is_master && (
                          <input
                            type="checkbox"
                            checked={selectedGroupIds.includes(group.id)}
                            onChange={() => toggleGroupSelection(group.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <span>{group.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile: Logo + Grupo centralizado */}
          <div className="flex-1 flex items-center justify-center lg:hidden">
            <div className="flex items-center gap-2">
              {isLoadingGroups ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-lg animate-pulse"></div>
                  <div className="w-24 h-6 bg-gray-200 rounded animate-pulse"></div>
                </div>
              ) : (
                <>
                  {user.is_master ? (
                    <>
                      <AnimatedLogo size={28} scrollY={scrollY} isInitialSpin={isInitialSpin} />
                      <BrandName size="text-lg" />
                    </>
                  ) : brandLogo ? (
                    <img
                      src={brandLogo}
                      alt={brandName}
                      className="h-8 w-auto max-w-[120px] object-contain"
                    />
                  ) : (
                    <span className="text-lg font-bold truncate max-w-[120px]">{brandName}</span>
                  )}
                </>
              )}
              
              {/* Seletor de Grupo - Mobile */}
              {!isDevArea && !(user.is_master && isAdminArea) && (
                <div className="relative" ref={groupDropdownRefMobile}>
                  <button
                    onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                    className="flex items-center gap-1 px-2 py-1.5 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <span className="text-sm font-medium text-gray-700 max-w-[100px] truncate">
                      {selectedGroupsText}
                    </span>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${showGroupDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showGroupDropdown && groups.length > 0 && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 max-h-96 overflow-y-auto">
                      {/* Opção "Todos" apenas para Master */}
                      {user.is_master && (
                        <button
                          onClick={toggleAllGroups}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors border-b border-gray-100 flex items-center gap-2 ${
                            selectedGroupIds.length === groups.length ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedGroupIds.length === groups.length}
                            onChange={toggleAllGroups}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span>Todos os Grupos</span>
                        </button>
                      )}
                      {groups.map((group) => (
                        <button
                          key={group.id}
                          onClick={() => toggleGroupSelection(group.id)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                            user.is_master 
                              ? (selectedGroupIds.includes(group.id) ? 'bg-blue-50 text-blue-600' : 'text-gray-700')
                              : (activeGroup?.id === group.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700')
                          }`}
                        >
                          {user.is_master && (
                            <input
                              type="checkbox"
                              checked={selectedGroupIds.includes(group.id)}
                              onChange={() => toggleGroupSelection(group.id)}
                              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          <span>{group.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Centro - Menus (centralizado) - Desktop */}
          <div className="hidden lg:flex flex-1 items-center justify-center">
            <nav className="flex items-center gap-1">
              {getNavItems(user).map((item) => {
                const isActive = isActiveNav(item.href);
                const isAdmin = item.href === '/admin';
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                      isActive
                        ? isAdmin 
                          ? 'text-blue-600 bg-blue-50'
                          : 'nav-active'
                        : isAdmin
                          ? 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                          : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Direita - Avatar (largura fixa) */}
          <div className="flex items-center justify-end w-80 flex-shrink-0 lg:w-80">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors"
              >
                <User size={20} className="text-blue-600" />
              </button>

              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="font-medium text-gray-800">{user?.full_name || 'Usuário'}</p>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                    </div>

                    <button
                      onClick={() => { setShowUserMenu(false); router.push('/perfil'); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      <User size={18} />
                      Meus Dados
                    </button>

                    <button
                      onClick={() => { setShowUserMenu(false); router.push('/trocar-senha'); }}
                      className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50"
                    >
                      <Key size={18} />
                      Trocar Senha
                    </button>

                    <div className="border-t border-gray-100 mt-2 pt-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50"
                      >
                        <LogOut size={18} />
                        Sair
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {showMobileMenu && (
        <div className="lg:hidden fixed top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-40">
          <nav className="flex flex-col p-2">
            {getNavItems(user).map((item) => {
              const isActive = isActiveNav(item.href);
              const isAdmin = item.href === '/admin';
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleMobileNavClick}
                  className={`px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                    isActive
                      ? isAdmin 
                        ? 'text-blue-600 bg-blue-50'
                        : 'nav-active'
                      : isAdmin
                        ? 'text-gray-600 hover:text-blue-600 hover:bg-blue-50'
                        : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}
