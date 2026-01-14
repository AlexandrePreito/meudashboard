'use client';

import { useState, useEffect, useRef } from 'react';
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

  // Admin: apenas master
  if (user.is_master) {
    items.push({ href: '/admin', label: 'Admin' });
  }

  // Desenvolvedor: apenas desenvolvedores
  if (user.is_developer) {
    items.push({ href: '/dev', label: 'Desenvolvedor' });
  }

  // Dashboards: master, dev e admin
  if (user.is_master || user.is_developer || user.role === 'admin') {
    items.push({ href: '/dashboard', label: 'Dashboards' });
  }

  // Power BI: master, dev e admin
  if (user.is_master || user.is_developer || user.role === 'admin') {
    items.push({ href: '/powerbi', label: 'Power BI' });
  }

  // WhatsApp: master, dev e admin
  if (user.is_master || user.is_developer || user.role === 'admin') {
    items.push({ href: '/whatsapp', label: 'WhatsApp' });
  }

  // Configurações: master e admin (dev gerencia usuários em /dev/groups/[id])
  if (user.is_master || user.role === 'admin') {
    items.push({ href: '/configuracoes', label: 'Configurações' });
  }

  return items;
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeGroup, setActiveGroup, setIsCollapsed, developer, setDeveloper } = useMenu();
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
    loadGroups();
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
  const getLogo = () => {
    // Se nao tem grupo selecionado ou estamos na area dev, usa do developer
    if (!activeGroup || pathname?.startsWith('/dev')) {
      return developer?.logo_url || null;
    }
    
    // Se o grupo usa logo do developer, retorna logo do developer
    if (activeGroup.use_developer_logo !== false) {
      return developer?.logo_url || activeGroup.logo_url || null;
    }
    
    // Caso contrario, usa logo do proprio grupo
    return activeGroup.logo_url || null;
  };

  const getBrandName = () => {
    // Se nao tem grupo selecionado ou estamos na area dev, usa nome do developer
    if (!activeGroup || pathname?.startsWith('/dev')) {
      return developer?.name || 'MeuDashboard';
    }
    
    // Se o grupo usa logo do developer, mostra nome do developer
    if (activeGroup.use_developer_logo !== false) {
      return developer?.name || activeGroup.name || 'MeuDashboard';
    }
    
    // Caso contrario, usa nome do grupo
    return activeGroup.name || 'MeuDashboard';
  };

  const getPrimaryColor = () => {
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
  };

  const brandLogo = getLogo();
  const brandName = getBrandName();

  useEffect(() => {
    const color = getPrimaryColor();
    setPrimaryColor(color);
  }, [activeGroup?.primary_color, activeGroup?.use_developer_colors, developer?.primary_color, pathname, user.is_master, user.is_developer, setPrimaryColor]);

  async function loadGroups() {
    setIsLoadingGroups(true);
    try {
      const res = await fetch('/api/user/groups', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const freshGroups = data.groups || [];
        setGroups(freshGroups);
        
        // Setar developer se existir
        if (data.developer) {
          setDeveloper(data.developer);
        }
        
        if (freshGroups.length > 0) {
          if (activeGroup) {
            // Atualiza o activeGroup com dados frescos do servidor (inclui cor atualizada)
            const updatedGroup = freshGroups.find((g: CompanyGroup) => g.id === activeGroup.id);
            if (updatedGroup) {
              // Só atualiza se houver diferença (evita loop)
              if (JSON.stringify(updatedGroup) !== JSON.stringify(activeGroup)) {
                console.log('Atualizando grupo com dados frescos:', updatedGroup.name, 'cor:', updatedGroup.primary_color);
                setActiveGroup(updatedGroup);
              }
            } else {
              // Grupo antigo não existe mais, seleciona o primeiro
              setActiveGroup(freshGroups[0]);
            }
          } else {
            // Não tinha grupo selecionado, seleciona o primeiro
            setActiveGroup(freshGroups[0]);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
    } finally {
      setIsLoadingGroups(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      router.push('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }

  function selectGroup(group: CompanyGroup) {
    console.log('Selecionando grupo:', group.name);
    setActiveGroup(group);
    setShowGroupDropdown(false);
  }

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
                      <div className="p-1.5 rounded-lg" style={{ backgroundColor: getPrimaryColor() }}>
                        <Zap size={20} className="text-white" />
                      </div>
                      <span className="text-xl font-bold truncate max-w-[150px]" style={{ color: getPrimaryColor() }}>
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
                    {activeGroup?.name || 'Grupo'}
                  </span>
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${showGroupDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showGroupDropdown && groups.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                    {groups.map((group) => (
                      <button
                        key={group.id}
                        onClick={() => selectGroup(group)}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                          activeGroup?.id === group.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                        }`}
                      >
                        {group.name}
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
                      {activeGroup?.name || 'Grupo'}
                    </span>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${showGroupDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {showGroupDropdown && groups.length > 0 && (
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                      {groups.map((group) => (
                        <button
                          key={group.id}
                          onClick={() => selectGroup(group)}
                          className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                            activeGroup?.id === group.id ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                          }`}
                        >
                          {group.name}
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
