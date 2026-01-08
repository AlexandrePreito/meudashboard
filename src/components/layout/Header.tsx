'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LogOut, ChevronDown, User, Zap, Menu, X, Key
} from 'lucide-react';
import { useMenu } from '@/contexts/MenuContext';
import { useTheme } from '@/contexts/ThemeContext';

interface CompanyGroup {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string | null;
}

interface HeaderProps {
  user: {
    id: string;
    email: string;
    full_name?: string;
    is_master?: boolean;
    role?: string;
  };
}

// Menu dinâmico baseado no perfil do usuário
function getNavItems(user: HeaderProps['user']) {
  const items: { href: string; label: string }[] = [];

  // User comum: menu vazio no header (navegação fica no sidebar)
  if (!user.is_master && user.role === 'user') {
    return items;
  }

  // Dashboards: apenas master e admin
  if (user.is_master || user.role === 'admin') {
    items.push({ href: '/dashboard', label: 'Dashboards' });
  }

  // Power BI: apenas master e admin
  if (user.is_master || user.role === 'admin') {
    items.push({ href: '/powerbi', label: 'Power BI' });
  }

  // WhatsApp: apenas master e admin
  if (user.is_master || user.role === 'admin') {
    items.push({ href: '/whatsapp', label: 'WhatsApp' });
  }

  // Configurações: master e admin
  items.push({ href: '/configuracoes', label: 'Configurações' });

  return items;
}

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeGroup, setActiveGroup, setIsCollapsed } = useMenu();
  const [groups, setGroups] = useState<CompanyGroup[]>([]);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const groupDropdownRefDesktop = useRef<HTMLDivElement>(null);
  const groupDropdownRefMobile = useRef<HTMLDivElement>(null);
  const { setPrimaryColor } = useTheme();

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

  useEffect(() => {
    console.log('DEBUG - activeGroup color:', activeGroup?.primary_color);
    if (activeGroup?.primary_color) {
      setPrimaryColor(activeGroup.primary_color);
    }
  }, [activeGroup, setPrimaryColor]);

  async function loadGroups() {
    try {
      const res = await fetch('/api/user/groups', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const freshGroups = data.groups || [];
        setGroups(freshGroups);
        
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
      <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 sticky top-0 z-50">
        {/* Mobile: Menu à esquerda */}
        <div className="lg:hidden">
          <button
            onClick={handleMobileMenuToggle}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Desktop: Logo + Seletor de Grupo à esquerda */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center gap-2">
            {activeGroup?.logo_url ? (
              <img
                src={activeGroup.logo_url}
                alt={activeGroup.name}
                className="h-9 w-auto max-w-[150px] object-contain"
              />
            ) : (
              <>
                <div className="p-1.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                  <Zap size={20} className="text-white" />
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  MeuDashboard
                </span>
              </>
            )}
          </div>

          {/* Seletor de Grupo - Desktop */}
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
        </div>

        {/* Mobile: Logo + Grupo centralizado */}
        <div className="flex-1 flex items-center justify-center lg:hidden">
          <div className="flex items-center gap-2">
            {activeGroup?.logo_url ? (
              <img
                src={activeGroup.logo_url}
                alt={activeGroup.name}
                className="h-8 w-auto max-w-[120px] object-contain"
              />
            ) : (
              <div className="p-1.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                <Zap size={18} className="text-white" />
              </div>
            )}
            
            {/* Seletor de Grupo - Mobile */}
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
          </div>
        </div>

        {/* Desktop: Navigation - Centralizado */}
        <nav className="flex-1 flex items-center justify-center gap-6 hidden lg:flex">
          {getNavItems(user).map((item) => {
            const isActive = isActiveNav(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                  isActive
                    ? 'nav-active'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Menu - Sempre à direita */}
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
      </header>

      {showMobileMenu && (
        <div className="lg:hidden fixed top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-40">
          <nav className="flex flex-col p-2">
            {getNavItems(user).map((item) => {
              const isActive = isActiveNav(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleMobileNavClick}
                  className={`px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                    isActive
                      ? 'nav-active'
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
