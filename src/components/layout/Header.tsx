'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Bell, LogOut, ChevronDown, Building2, User, Zap, Menu, X
} from 'lucide-react';
import { useMenu } from '@/contexts/MenuContext';

interface CompanyGroup {
  id: string;
  name: string;
  slug: string;
}

interface HeaderProps {
  user: {
    id: string;
    email: string;
    full_name?: string;
    is_master?: boolean;
  };
}

const mainNavItems = [
  { href: '/', label: 'Dashboards' },
  { href: '/powerbi', label: 'Power BI' },
  { href: '/whatsapp', label: 'WhatsApp' },
  { href: '/configuracoes', label: 'Configurações' },
];

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { activeGroup, setActiveGroup, setIsCollapsed } = useMenu();
  const [groups, setGroups] = useState<CompanyGroup[]>([]);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const groupDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(event.target as Node)) {
        setShowGroupDropdown(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function loadGroups() {
    try {
      const res = await fetch('/api/user/groups', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
        if (data.groups?.length > 0 && !activeGroup) {
          setActiveGroup(data.groups[0]);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
    }
  }

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      router.push('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }

  function selectGroup(group: CompanyGroup) {
    setActiveGroup(group);
    setShowGroupDropdown(false);
  }

  function isActiveNav(href: string) {
    if (href === '/') {
      return pathname === '/' || pathname.startsWith('/tela');
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
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4 lg:gap-8">
          <button
            onClick={handleMobileMenuToggle}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
          >
            {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
              <Zap size={20} className="text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
              MeuDashboard
            </span>
          </div>

          <nav className="hidden lg:flex items-center gap-1">
            {mainNavItems.map((item) => {
              const isActive = isActiveNav(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2 lg:gap-4">
          <div className="relative" ref={groupDropdownRef}>
            <button
              onClick={() => setShowGroupDropdown(!showGroupDropdown)}
              className="flex items-center gap-2 px-2 lg:px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Building2 size={18} className="text-gray-500" />
              <span className="text-sm font-medium text-gray-700 hidden sm:inline max-w-[120px] truncate">
                {activeGroup?.name || 'Grupo'}
              </span>
              <ChevronDown size={16} className={`text-gray-400 transition-transform ${showGroupDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showGroupDropdown && groups.length > 0 && (
              <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
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

          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors relative hidden sm:block">
            <Bell size={20} className="text-gray-500" />
          </button>

          <div className="relative" ref={userDropdownRef}>
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2 px-2 lg:px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center">
                <User size={16} className="text-white" />
              </div>
              <div className="text-left hidden md:block">
                <div className="text-sm font-medium text-gray-700">{user.full_name || 'Usuário'}</div>
                <div className="text-xs text-gray-500">{user.email}</div>
              </div>
              <ChevronDown size={16} className="text-gray-400 hidden sm:block" />
            </button>

            {showUserDropdown && (
              <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <LogOut size={16} />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {showMobileMenu && (
        <div className="lg:hidden fixed top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-40">
          <nav className="flex flex-col p-2">
            {mainNavItems.map((item) => {
              const isActive = isActiveNav(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleMobileNavClick}
                  className={`px-4 py-3 rounded-lg transition-colors text-sm font-medium ${
                    isActive
                      ? 'bg-blue-50 text-blue-600'
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
