'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, User, Menu, Key, Building2, ChevronDown, Search, Sparkles, BookOpen, ScrollText, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { useMenu, type CompanyGroup } from '@/contexts/MenuContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useRefreshContext } from '@/contexts/RefreshContext';
import { useFeatures } from '@/hooks/useFeatures';
import GuideSidebar from '@/components/ui/GuideSidebar';

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

export default function Header({ user }: HeaderProps) {
  const router = useRouter();
  const {
    activeGroup,
    setActiveGroup,
    setIsCollapsed,
    isCollapsed,
    developer,
    groups,
    selectedGroupIds,
    setSelectedGroupIds
  } = useMenu();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [groupSearch, setGroupSearch] = useState('');
  const userMenuRef = useRef<HTMLDivElement>(null);
  const groupDropdownRef = useRef<HTMLDivElement>(null);
  const { setPrimaryColor } = useTheme();
  const { isFree } = useFeatures();
  const { activeRefreshes, isRefreshing } = useRefreshContext();

  const selectedGroupsText = useMemo(() => {
    if (!user?.is_master) {
      if (activeGroup) return activeGroup.name;
      if (groups.length > 0) return 'Selecionar grupo';
      return 'Grupo';
    }
    if (selectedGroupIds.length === 0) return 'Todos';
    if (selectedGroupIds.length === 1) {
      const g = groups.find((x: CompanyGroup) => x.id === selectedGroupIds[0]);
      return g?.name || 'Grupo';
    }
    return `${selectedGroupIds.length} grupos`;
  }, [user?.is_master, activeGroup?.name, groups, selectedGroupIds]);

  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return groups;
    const q = groupSearch.toLowerCase();
    return groups.filter((g: CompanyGroup) => g.name.toLowerCase().includes(q));
  }, [groups, groupSearch]);

  const toggleGroupSelection = (groupId: string) => {
    if (user?.is_master) {
      let newIds: string[];
      if (selectedGroupIds.includes(groupId)) {
        newIds = selectedGroupIds.filter((id) => id !== groupId);
      } else {
        newIds = [...selectedGroupIds, groupId];
      }
      setSelectedGroupIds(newIds);

      // CRITICAL FIX: Setar activeGroup quando exatamente 1 grupo selecionado
      // Sem isso, todas as páginas que dependem de activeGroup ficam vazias para master
      if (newIds.length === 1) {
        const g = groups.find((x: CompanyGroup) => x.id === newIds[0]);
        if (g) setActiveGroup(g);
      } else {
        setActiveGroup(null);
      }
    } else {
      const g = groups.find((x: CompanyGroup) => x.id === groupId);
      if (g) {
        setActiveGroup(g);
        setShowGroupDropdown(false);
      }
    }
  };

  const toggleAllGroups = () => {
    if (!user?.is_master) return;
    if (selectedGroupIds.length === groups.length) {
      setSelectedGroupIds([]);
      setActiveGroup(null);
    } else {
      setSelectedGroupIds(groups.map((g: CompanyGroup) => g.id));
      setActiveGroup(null);
    }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (groupDropdownRef.current && !groupDropdownRef.current.contains(e.target as Node)) {
        setShowGroupDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const primaryColorValue = useMemo(() => {
    if (user.is_master) return '#3B82F6';
    if (user.is_developer) return developer?.primary_color || '#0ea5e9';
    if (activeGroup?.use_developer_colors !== false && developer?.primary_color) return developer.primary_color;
    if (activeGroup?.primary_color) return activeGroup.primary_color;
    return developer?.primary_color || '#0ea5e9';
  }, [user.is_master, user.is_developer, developer?.primary_color, activeGroup?.primary_color, activeGroup?.use_developer_colors]);

  const lastAppliedColorRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastAppliedColorRef.current !== primaryColorValue) {
      setPrimaryColor(primaryColorValue);
      lastAppliedColorRef.current = primaryColorValue;
    }
  }, [primaryColorValue, setPrimaryColor]);

  async function handleLogout() {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('active-group');
        localStorage.removeItem('selected-group-ids');
        sessionStorage.removeItem('user-features');
      }
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      router.push('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-40">
        <div className={`h-full flex items-center justify-between transition-all duration-300 px-4 ${isCollapsed ? 'lg:pl-[5.5rem]' : 'lg:pl-56'}`}>
          {/* Esquerda: seletor de grupo + hamburger (logo fica só no sidebar) */}
          <div className="flex items-center gap-3 min-w-0 flex-1 ml-4 lg:ml-6">
            {groups.length > 0 && (
              <div className="hidden sm:flex items-center relative flex-shrink-0" ref={groupDropdownRef}>
                <button
                  type="button"
                  onClick={() => setShowGroupDropdown(!showGroupDropdown)}
                  className="flex items-center gap-2 rounded-lg bg-gray-100 hover:bg-gray-200 px-3 py-2 text-left transition-all min-w-[120px] max-w-[180px]"
                >
                  <Building2 size={18} className="text-gray-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{selectedGroupsText}</span>
                  <ChevronDown size={16} className={`text-gray-500 flex-shrink-0 ml-auto ${showGroupDropdown ? 'rotate-180' : ''}`} />
                </button>
                {showGroupDropdown && (
                  <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl py-2 z-50 min-w-[200px] max-h-80 flex flex-col">
                  <div className="px-2 pb-2">
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Filtrar grupos..."
                        value={groupSearch}
                        onChange={(e) => setGroupSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-md text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-300"
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto flex-1 min-h-0">
                    {user?.is_master && (
                      <button
                        type="button"
                        onClick={toggleAllGroups}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 ${
                          selectedGroupIds.length === groups.length ? 'text-gray-900 bg-gray-100' : 'text-gray-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedGroupIds.length === groups.length}
                          onChange={toggleAllGroups}
                          className="rounded border-gray-400 bg-gray-50 text-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span>Todos os Grupos</span>
                      </button>
                    )}
                    {filteredGroups.map((g: CompanyGroup) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => toggleGroupSelection(g.id)}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-100 ${
                          user?.is_master
                            ? selectedGroupIds.includes(g.id)
                              ? 'text-gray-900 bg-gray-100'
                              : 'text-gray-600'
                            : activeGroup?.id === g.id
                              ? 'text-gray-900 bg-gray-100'
                              : 'text-gray-600'
                        }`}
                      >
                        {user?.is_master && (
                          <input
                            type="checkbox"
                            checked={selectedGroupIds.includes(g.id)}
                            onChange={() => toggleGroupSelection(g.id)}
                            className="rounded border-gray-400 bg-gray-50 text-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <span className="truncate">{g.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg flex-shrink-0"
              aria-label="Abrir menu"
            >
              <Menu size={24} />
            </button>
          </div>

          {/* Direita: indicador de refresh + ajuda (dev) + upgrade (free) + avatar + dropdown */}
          <div className="flex items-center gap-3 justify-end flex-shrink-0" ref={userMenuRef}>
            {activeRefreshes.length > 0 && (
              <div className="relative">
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isRefreshing
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : activeRefreshes.some(r => r.status === 'error')
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-green-50 text-green-700 border border-green-200'
                  }`}
                  title={activeRefreshes.map(r => `${r.screenName}: ${r.status}`).join('\n')}
                >
                  {isRefreshing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Atualizando{activeRefreshes.length > 1 ? ` (${activeRefreshes.length})` : ''}</span>
                    </>
                  ) : activeRefreshes.some(r => r.status === 'error') ? (
                    <>
                      <XCircle size={14} />
                      <span>Erro na atualização</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle size={14} />
                      <span>Atualizado</span>
                    </>
                  )}
                </div>
              </div>
            )}
            {user?.is_developer && (
              <button
                onClick={() => setShowGuide(true)}
                className="flex items-center gap-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-all"
                title="Primeiros Passos"
              >
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Ajuda</span>
              </button>
            )}
            {user?.is_developer && (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                  isFree
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {isFree ? 'Free' : 'Pro'}
              </span>
            )}
            {isFree && user?.is_developer && (
              <a
                href="https://wa.me/5562982289559?text=Olá!%20Tenho%20interesse%20em%20fazer%20upgrade%20do%20meu%20plano%20no%20MeuDashboard."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm hover:shadow-md transition-all"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Fazer upgrade
              </a>
            )}
            <button
              type="button"
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 hover:bg-blue-200 transition-colors"
            >
              <User size={20} className="text-blue-600" />
            </button>
            {showUserMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  aria-hidden
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 top-12 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2">
                    <p className="font-medium text-gray-800">{user?.full_name || 'Usuário'}</p>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                  </div>
                  <div className="border-t border-gray-100 my-1" />
                  <Link
                    href="/perfil"
                    className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <User size={18} />
                    Perfil
                  </Link>
                  <Link
                    href="/trocar-senha"
                    className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <Key size={18} />
                    Trocar Senha
                  </Link>
                  <Link
                    href="/meus-logs"
                    className="flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50"
                    onClick={() => setShowUserMenu(false)}
                  >
                    <ScrollText size={18} />
                    Meus Logs
                  </Link>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50"
                  >
                    <LogOut size={18} />
                    Sair
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <GuideSidebar isOpen={showGuide} onClose={() => setShowGuide(false)} />
    </>
  );
}
