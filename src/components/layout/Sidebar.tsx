'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Monitor,
  Layers,
  BarChart3,
  FileText,
  PieChart,
  TrendingUp,
  Activity,
  Link as LinkIcon,
  Building2,
  User,
  Users,
  UsersRound,
  Smartphone,
  MessageSquare,
  Bell,
  ArrowUpDown,
  Code,
  CreditCard,
  Sparkles,
  Brain,
  AlertCircle,
  Settings,
  Key,
  Webhook,
  Plus,
  Share2,
  DollarSign,
  ShoppingCart,
  Package,
  Truck,
  Factory,
  Lock,
  ScrollText
} from 'lucide-react';
import { useMenu } from '@/contexts/MenuContext';
import { useFeatures } from '@/hooks/useFeatures';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface CompanyGroup {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  primary_color?: string | null;
  use_developer_logo?: boolean;
  use_developer_colors?: boolean;
}

interface Screen {
  id: string;
  title: string;
  icon?: string;
  is_active: boolean;
  is_first?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  Monitor,
  BarChart3,
  FileText,
  PieChart,
  TrendingUp,
  Activity,
  DollarSign,
  Users,
  ShoppingCart,
  Package,
  Truck,
  Factory,
  default: Monitor
};

function getIconComponent(iconName?: string | null) {
  if (!iconName?.trim()) return Monitor;
  const normalized = iconName.trim();
  if (ICON_MAP[normalized]) return ICON_MAP[normalized];
  const cap = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  return ICON_MAP[cap] || Monitor;
}

export default function Sidebar() {
  const pathname = usePathname();
  const {
    isCollapsed,
    setIsCollapsed,
    activeGroup,
    selectedGroupIds,
    user,
    developer
  } = useMenu();
  const { hasWhatsapp, hasAlerts, hasAI, allowPowerbiConnections, allowWhatsappInstances } = useFeatures();

  // Fallback: para master, activeGroup pode ser null mesmo com grupo selecionado
  const effectiveGroupId = activeGroup?.id || (selectedGroupIds?.length === 1 ? selectedGroupIds[0] : null);
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(false);
  const [sectionOpen, setSectionOpen] = useState<Record<string, boolean>>({});
  const isSectionOpen = (key: string) => sectionOpen[key] === true;
  const toggleSection = (key: string) => setSectionOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  const isMaster = !!user?.is_master;
  const isDeveloper = !!user?.is_developer && !user?.is_master;
  const isAdmin = !user?.is_master && !user?.is_developer && user?.role === 'admin';
  const isRegularUser =
    !user?.is_master &&
    !user?.is_developer &&
    (user?.role === 'user' || user?.role === 'viewer' || user?.role === 'operator');

  const primaryColorValue = useMemo(() => {
    if (user?.is_master) return '#3B82F6';
    if (user?.is_developer) return developer?.primary_color || '#0ea5e9';
    if (activeGroup?.use_developer_colors !== false && developer?.primary_color) return developer.primary_color;
    return activeGroup?.primary_color || developer?.primary_color || '#0ea5e9';
  }, [user?.is_master, user?.is_developer, developer?.primary_color, activeGroup?.primary_color, activeGroup?.use_developer_colors]);

  // Logo/nome no sidebar: única logo do sistema (dev/grupo ou MeuDashboard)
  const sidebarLogo = useMemo(() => {
    if (user?.is_master) return null;
    if (activeGroup) {
      if (activeGroup.use_developer_logo === false) {
        return activeGroup.logo_url || developer?.logo_url || null;
      }
      return developer?.logo_url || activeGroup.logo_url || null;
    }
    return developer?.logo_url || null;
  }, [user?.is_master, developer?.logo_url, activeGroup?.logo_url, activeGroup?.use_developer_logo]);

  const sidebarName = useMemo(() => {
    if (user?.is_master) return 'MeuDashboard';
    if (user?.is_developer) return developer?.name || 'MeuDashboard';
    if (activeGroup) {
      if (activeGroup.use_developer_logo !== false) {
        return developer?.name || activeGroup.name || 'MeuDashboard';
      }
      return activeGroup.name || 'MeuDashboard';
    }
    return developer?.name || 'MeuDashboard';
  }, [user?.is_master, user?.is_developer, developer?.name, activeGroup?.name, activeGroup?.use_developer_logo]);

  const canAccessAssistenteIA = useCallback(() => {
    if (user?.role === 'viewer' || user?.role === 'operator') return false;
    if (user?.is_master) return true;
    if (user?.is_developer) return true;
    if (user?.role === 'admin') return !!activeGroup?.id;
    return false;
  }, [user?.role, user?.is_master, user?.is_developer, activeGroup?.id]);

  useEffect(() => {
    if (effectiveGroupId && user) {
      loadScreens(effectiveGroupId);
    } else {
      setScreens([]);
    }
  }, [effectiveGroupId, user?.id, user?.role, user?.is_master, user?.is_developer]);

  async function loadScreens(groupId: string) {
    setLoading(true);
    try {
      const needsFilter = !user?.is_master && !user?.is_developer && user?.role !== 'admin';
      const url = needsFilter
        ? `/api/powerbi/screens?group_id=${groupId}&only_mine=true`
        : `/api/powerbi/screens?group_id=${groupId}`;
      const res = await fetch(url, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        const list = (data.screens || [])
          .filter((s: Screen) => s.is_active)
          .map((s: Screen) => ({ ...s, icon: s.icon || 'Monitor' }))
          .sort((a: Screen, b: Screen) => {
            if (a.is_first && !b.is_first) return -1;
            if (!a.is_first && b.is_first) return 1;
            return a.title.localeCompare(b.title);
          });
        setScreens(list);
      } else {
        setScreens([]);
      }
    } catch {
      setScreens([]);
    } finally {
      setLoading(false);
    }
  }

  const SectionTitle = ({ children }: { children: React.ReactNode }) =>
    !isCollapsed ? (
      <h3 className="px-3 pt-5 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">{children}</h3>
    ) : null;

  const Separator = () => <div className="border-t border-gray-100 my-2" />;

  type IconComp = React.ComponentType<{ size?: number; className?: string }>;
  const CollapsibleSection = ({
    sectionId,
    Icon,
    title,
    locked = false,
    children
  }: {
    sectionId: string;
    Icon: IconComp;
    title: string;
    locked?: boolean;
    children: React.ReactNode;
  }) => {
    const open = isSectionOpen(sectionId);
    if (isCollapsed) return <>{children}</>;
    return (
      <>
        <button
          type="button"
          onClick={() => toggleSection(sectionId)}
          className={`flex items-center gap-2 w-full px-3 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wider rounded-lg transition-colors ${locked ? 'text-gray-400 hover:text-gray-500 hover:bg-gray-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
        >
          <Icon size={16} className={`flex-shrink-0 ${locked ? 'text-gray-400' : 'text-gray-400'}`} />
          <span className="flex-1 text-left truncate">{title}</span>
          {locked && <Lock size={12} className="text-gray-400 flex-shrink-0" />}
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
        {open && <div className={locked ? 'opacity-60' : ''}>{children}</div>}
      </>
    );
  };

  const isScreenActive = (href: string) => pathname === href;
  const isItemActive = (href: string, alertasException?: boolean) => {
    if (alertasException && href === '/alertas') {
      return pathname === '/alertas' || (pathname.startsWith('/alertas/') && !pathname.startsWith('/alertas/historico'));
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  const activeCollapsedSectionId = useMemo(() => {
    if (pathname.startsWith('/tela/')) return 'telas';
    if (pathname.startsWith('/assistente-ia')) return isMaster ? 'assistenteia_master' : isDeveloper ? 'assistenteia_dev' : 'assistenteia_admin';
    if (pathname.startsWith('/powerbi')) return isMaster ? 'powerbi_master' : 'powerbi_dev';
    if (pathname.startsWith('/whatsapp') || pathname === '/alertas' || pathname.startsWith('/alertas/')) return isMaster ? 'whatsapp_master' : isDeveloper ? 'whatsapp_dev' : 'whatsapp';
    if (pathname.startsWith('/admin') || pathname.startsWith('/configuracoes/logs')) return 'admin';
    if (pathname.startsWith('/administrador/')) return 'gerenciar';
    if (pathname.startsWith('/dev/groups') || pathname.startsWith('/dev/usuarios') || pathname.startsWith('/dev/quotas') || pathname.startsWith('/dev/recursos')) return 'meusgrupos';
    if (pathname.startsWith('/dev/perfil')) return 'minhaconta_dev';
    if (pathname === '/perfil' || pathname === '/trocar-senha' || pathname === '/meus-logs') return isRegularUser ? 'minhaconta_viewer' : isAdmin ? 'minhaconta_admin' : 'minhaconta_dev';
    return null;
  }, [pathname, isMaster, isDeveloper, isAdmin, isRegularUser]);

  if (!user) return null;

  const iconSize = isCollapsed ? 16 : 18;

  const linkCls = (active: boolean) =>
    `flex items-center justify-center w-full rounded-md py-2 transition-all duration-150 ${active ? 'bg-gray-100 text-gray-900 border-l-2' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`;
  const sectionIconBtn = (sectionId: string, Icon: React.ComponentType<{ size?: number }>, title: string) => (
    <button type="button" onClick={() => setIsCollapsed(false)} title={title} className="flex items-center justify-center w-full rounded-md py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all">
      <Icon size={iconSize} />
    </button>
  );

  return (
    <>
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-[45] lg:hidden"
          onClick={() => setIsCollapsed(true)}
          aria-hidden
        />
      )}
      <aside
        className={`fixed left-0 top-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 z-50 flex flex-col overflow-visible ${
          isCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-[5.5rem]' : 'translate-x-0 w-56'
        }`}
      >
        {/* Botão expandir/recolher — fora do scroll, sobre o menu */}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute right-0 top-6 z-[60] w-6 h-6 translate-x-1/2 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-600 hover:text-gray-900 shadow-md transition-colors shrink-0"
          aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div
          className="flex-1 min-h-0 flex flex-col overflow-y-auto py-4 relative"
          style={{ scrollbarColor: '#d1d5db transparent' }}
        >
          {/* Logo — única logo: MeuDashboard (master) ou dev/grupo (logo ou ✻ + nome) */}
          <Link
            href="/"
            className={`flex items-center gap-2 text-gray-900 hover:opacity-90 transition-opacity mb-3 ${isCollapsed ? 'justify-center px-0' : 'px-3'}`}
            title={isCollapsed ? (user?.is_master ? 'MeuDashboard' : sidebarName) : undefined}
          >
            {user?.is_master ? (
              <>
                <svg
                  viewBox="0 0 100 100"
                  width={isCollapsed ? 26 : 28}
                  height={isCollapsed ? 26 : 28}
                  className="flex-shrink-0"
                >
                  <defs>
                    <linearGradient id="logoGradSidebar" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#06b6d4" />
                      <stop offset="50%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                  <g fill="url(#logoGradSidebar)">
                    <rect x="45" y="10" width="10" height="80" rx="5" />
                    <rect x="45" y="10" width="10" height="80" rx="5" transform="rotate(60 50 50)" />
                    <rect x="45" y="10" width="10" height="80" rx="5" transform="rotate(120 50 50)" />
                  </g>
                </svg>
                {!isCollapsed && (
                  <span className="font-bold truncate" style={{ fontFamily: "'Orbitron', 'Exo 2', sans-serif", letterSpacing: '0.02em', color: '#2563eb', fontSize: '1rem' }}>
                    <span className="text-[1.2em]">M</span>eu<span className="text-[1.2em]">D</span>ashboard
                  </span>
                )}
              </>
            ) : (
              <>
                {sidebarLogo ? (
                  <img
                    src={sidebarLogo}
                    alt={sidebarName}
                    className={`flex-shrink-0 object-contain ${isCollapsed ? 'w-7 h-7 rounded-lg' : 'w-7 h-7 rounded-lg'}`}
                  />
                ) : (
                  <svg
                    viewBox="0 0 100 100"
                    width={isCollapsed ? 26 : 28}
                    height={isCollapsed ? 26 : 28}
                    className="flex-shrink-0"
                  >
                    <defs>
                      <linearGradient id="logoGradSidebar" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="50%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                    <g fill="url(#logoGradSidebar)">
                      <rect x="45" y="10" width="10" height="80" rx="5" />
                      <rect x="45" y="10" width="10" height="80" rx="5" transform="rotate(60 50 50)" />
                      <rect x="45" y="10" width="10" height="80" rx="5" transform="rotate(120 50 50)" />
                    </g>
                  </svg>
                )}
                {!isCollapsed && (
                  <span className="font-bold truncate" style={{ color: primaryColorValue, fontSize: '1rem' }}>
                    {sidebarName}
                  </span>
                )}
              </>
            )}
          </Link>

          <Separator />

          {/* Retraído: ícones dos grupos; no grupo da página atual, mostra também as telas do grupo com a selecionada em destaque */}
          {isCollapsed ? (
            <nav className="px-2 space-y-0.5 flex flex-col">
              {/* Telas */}
              {activeCollapsedSectionId === 'telas' ? (
                <div className="flex flex-col">
                  <button type="button" onClick={() => setIsCollapsed(false)} title="Telas" className="flex items-center justify-center w-full rounded-md py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all">
                    <Layers size={iconSize} />
                  </button>
                  {!loading && screens.map((screen) => {
                    const Icon = getIconComponent(screen.icon);
                    const href = `/tela/${screen.id}`;
                    const active = isScreenActive(href);
                    return (
                      <Link key={screen.id} href={href} title={screen.title} className={linkCls(active)} style={active ? { borderLeftColor: primaryColorValue } : {}}>
                        <Icon size={iconSize} />
                      </Link>
                    );
                  })}
                  {(isDeveloper || isMaster) && effectiveGroupId && (
                    <Link href={`/dev/groups/${effectiveGroupId}`} title="Nova tela" className={linkCls(false)}><Plus size={iconSize} /></Link>
                  )}
                </div>
              ) : (
                sectionIconBtn('telas', Layers, 'Telas')
              )}

              {isRegularUser && (
                activeCollapsedSectionId === 'minhaconta_viewer' ? (
                  <div className="flex flex-col">
                    <button type="button" onClick={() => setIsCollapsed(false)} title="Minha conta" className="flex items-center justify-center w-full rounded-md py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"><User size={iconSize} /></button>
                    <Link href="/perfil" title="Perfil" className={linkCls(isItemActive('/perfil'))} style={isItemActive('/perfil') ? { borderLeftColor: primaryColorValue } : {}}><User size={iconSize} /></Link>
                    <Link href="/trocar-senha" title="Trocar Senha" className={linkCls(isItemActive('/trocar-senha'))} style={isItemActive('/trocar-senha') ? { borderLeftColor: primaryColorValue } : {}}><Key size={iconSize} /></Link>
                    <Link href="/meus-logs" title="Meus Logs" className={linkCls(isItemActive('/meus-logs'))} style={isItemActive('/meus-logs') ? { borderLeftColor: primaryColorValue } : {}}><ScrollText size={iconSize} /></Link>
                  </div>
                ) : sectionIconBtn('minhaconta_viewer', User, 'Minha conta')
              )}

              {isAdmin && (
                <>
                  {activeCollapsedSectionId === 'gerenciar' ? (
                    <div className="flex flex-col">
                      <button type="button" onClick={() => setIsCollapsed(false)} title="Gerenciar" className="flex items-center justify-center w-full rounded-md py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"><Settings size={iconSize} /></button>
                      {activeGroup?.id && (
                        <>
                          <Link href={`/administrador/${activeGroup.id}/usuarios`} title="Usuários & Telas" className={linkCls(pathname.includes('/usuarios'))} style={pathname.includes('/usuarios') ? { borderLeftColor: primaryColorValue } : {}}><Users size={iconSize} /></Link>
                          <Link href={`/administrador/${activeGroup.id}/logs`} title="Logs" className={linkCls(pathname.includes('/logs'))} style={pathname.includes('/logs') ? { borderLeftColor: primaryColorValue } : {}}><FileText size={iconSize} /></Link>
                        </>
                      )}
                    </div>
                  ) : sectionIconBtn('gerenciar', Settings, 'Gerenciar')}
                  {activeCollapsedSectionId === 'whatsapp' ? (
                    <div className="flex flex-col">
                      <button type="button" onClick={() => setIsCollapsed(false)} title="WhatsApp" className="flex items-center justify-center w-full rounded-md py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"><MessageSquare size={iconSize} /></button>
                      <Link href="/whatsapp/numeros" title="Números" className={linkCls(isItemActive('/whatsapp/numeros'))} style={isItemActive('/whatsapp/numeros') ? { borderLeftColor: primaryColorValue } : {}}><User size={iconSize} /></Link>
                      <Link href="/whatsapp/mensagens" title="Mensagens" className={linkCls(isItemActive('/whatsapp/mensagens'))} style={isItemActive('/whatsapp/mensagens') ? { borderLeftColor: primaryColorValue } : {}}><MessageSquare size={iconSize} /></Link>
                      <Link href="/alertas" title="Alertas" className={linkCls(isItemActive('/alertas', true))} style={isItemActive('/alertas', true) ? { borderLeftColor: primaryColorValue } : {}}><Bell size={iconSize} /></Link>
                    </div>
                  ) : sectionIconBtn('whatsapp', MessageSquare, 'WhatsApp')}
                  {canAccessAssistenteIA() && (activeCollapsedSectionId === 'assistenteia_admin' ? (
                    <div className="flex flex-col">
                      <button type="button" onClick={() => setIsCollapsed(false)} title="Assistente IA" className="flex items-center justify-center w-full rounded-md py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"><Brain size={iconSize} /></button>
                      <Link href="/assistente-ia/pendentes" title="Pendentes" className={linkCls(isItemActive('/assistente-ia/pendentes'))} style={isItemActive('/assistente-ia/pendentes') ? { borderLeftColor: primaryColorValue } : {}}><AlertCircle size={iconSize} /></Link>
                      <Link href="/assistente-ia/treinar" title="Treinar IA" className={linkCls(isItemActive('/assistente-ia/treinar'))} style={isItemActive('/assistente-ia/treinar') ? { borderLeftColor: primaryColorValue } : {}}><Sparkles size={iconSize} /></Link>
                      <Link href="/assistente-ia/modelo" title="Modelo" className={linkCls(pathname.startsWith('/assistente-ia/modelo') || pathname.startsWith('/assistente-ia/contextos'))} style={pathname.startsWith('/assistente-ia/modelo') || pathname.startsWith('/assistente-ia/contextos') ? { borderLeftColor: primaryColorValue } : {}}><Brain size={iconSize} /></Link>
                    </div>
                  ) : sectionIconBtn('assistenteia_admin', Brain, 'Assistente IA'))}
                  {activeCollapsedSectionId === 'minhaconta_admin' ? (
                    <div className="flex flex-col">
                      <button type="button" onClick={() => setIsCollapsed(false)} title="Minha conta" className="flex items-center justify-center w-full rounded-md py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"><User size={iconSize} /></button>
                      <Link href="/perfil" title="Perfil" className={linkCls(isItemActive('/perfil'))} style={isItemActive('/perfil') ? { borderLeftColor: primaryColorValue } : {}}><User size={iconSize} /></Link>
                      <Link href="/trocar-senha" title="Trocar Senha" className={linkCls(isItemActive('/trocar-senha'))} style={isItemActive('/trocar-senha') ? { borderLeftColor: primaryColorValue } : {}}><Key size={iconSize} /></Link>
                      <Link href="/meus-logs" title="Meus Logs" className={linkCls(isItemActive('/meus-logs'))} style={isItemActive('/meus-logs') ? { borderLeftColor: primaryColorValue } : {}}><ScrollText size={iconSize} /></Link>
                    </div>
                  ) : sectionIconBtn('minhaconta_admin', User, 'Minha conta')}
                </>
              )}

              {isDeveloper && (
                <>
                  {activeCollapsedSectionId === 'meusgrupos' ? (
                    <div className="flex flex-col">
                      <button type="button" onClick={() => setIsCollapsed(false)} title="Meus grupos" className="flex items-center justify-center w-full rounded-md py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"><Building2 size={iconSize} /></button>
                      <Link href="/dev/groups" title="Grupos" className={linkCls(isItemActive('/dev/groups'))} style={isItemActive('/dev/groups') ? { borderLeftColor: primaryColorValue } : {}}><Building2 size={iconSize} /></Link>
                      <Link href="/dev/usuarios" title="Usuários & Telas" className={linkCls(isItemActive('/dev/usuarios'))} style={isItemActive('/dev/usuarios') ? { borderLeftColor: primaryColorValue } : {}}><Users size={iconSize} /></Link>
                      <Link href="/dev/quotas" title="Cotas" className={linkCls(isItemActive('/dev/quotas'))} style={isItemActive('/dev/quotas') ? { borderLeftColor: primaryColorValue } : {}}><ArrowUpDown size={iconSize} /></Link>
                      <Link href="/dev/recursos" title="Recursos Compartilhados" className={linkCls(isItemActive('/dev/recursos'))} style={isItemActive('/dev/recursos') ? { borderLeftColor: primaryColorValue } : {}}><Share2 size={iconSize} /></Link>
                    </div>
                  ) : sectionIconBtn('meusgrupos', Building2, 'Meus grupos')}
                  {(activeCollapsedSectionId === 'powerbi_dev' || activeCollapsedSectionId === 'powerbi_master') ? (
                    <div className="flex flex-col">
                      <button type="button" onClick={() => setIsCollapsed(false)} title="Power BI" className="flex items-center justify-center w-full rounded-md py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"><BarChart3 size={iconSize} /></button>
                      {(activeCollapsedSectionId === 'powerbi_master' || allowPowerbiConnections) && (
                        <Link href="/powerbi/conexoes" title="Conexões" className={linkCls(isItemActive('/powerbi/conexoes'))} style={isItemActive('/powerbi/conexoes') ? { borderLeftColor: primaryColorValue } : {}}><LinkIcon size={iconSize} /></Link>
                      )}
                      <Link href="/powerbi/relatorios" title="Relatórios" className={linkCls(isItemActive('/powerbi/relatorios'))} style={isItemActive('/powerbi/relatorios') ? { borderLeftColor: primaryColorValue } : {}}><FileText size={iconSize} /></Link>
                      <Link href="/powerbi/telas" title="Telas" className={linkCls(isItemActive('/powerbi/telas'))} style={isItemActive('/powerbi/telas') ? { borderLeftColor: primaryColorValue } : {}}><Monitor size={iconSize} /></Link>
                      <Link href="/powerbi/ordem-atualizacao" title="Atualizações" className={linkCls(isItemActive('/powerbi/ordem-atualizacao'))} style={isItemActive('/powerbi/ordem-atualizacao') ? { borderLeftColor: primaryColorValue } : {}}><ArrowUpDown size={iconSize} /></Link>
                    </div>
                  ) : sectionIconBtn('powerbi_dev', BarChart3, 'Power BI')}
                  {activeCollapsedSectionId === 'whatsapp_dev' ? (
                    <div className="flex flex-col">
                      <button type="button" onClick={() => setIsCollapsed(false)} title="WhatsApp" className="flex items-center justify-center w-full rounded-md py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"><MessageSquare size={iconSize} /></button>
                      {allowWhatsappInstances && (
                        <Link href="/whatsapp/instancias" title="Instâncias" className={linkCls(isItemActive('/whatsapp/instancias'))} style={isItemActive('/whatsapp/instancias') ? { borderLeftColor: primaryColorValue } : {}}><Smartphone size={iconSize} /></Link>
                      )}
                      <Link href="/whatsapp/numeros" title="Números" className={linkCls(isItemActive('/whatsapp/numeros'))} style={isItemActive('/whatsapp/numeros') ? { borderLeftColor: primaryColorValue } : {}}><User size={iconSize} /></Link>
                      <Link href="/whatsapp/mensagens" title="Mensagens" className={linkCls(isItemActive('/whatsapp/mensagens'))} style={isItemActive('/whatsapp/mensagens') ? { borderLeftColor: primaryColorValue } : {}}><MessageSquare size={iconSize} /></Link>
                      <Link href="/alertas" title="Alertas" className={linkCls(isItemActive('/alertas', true))} style={isItemActive('/alertas', true) ? { borderLeftColor: primaryColorValue } : {}}><Bell size={iconSize} /></Link>
                    </div>
                  ) : sectionIconBtn('whatsapp_dev', MessageSquare, 'WhatsApp')}
                  {activeCollapsedSectionId === 'assistenteia_dev' ? (
                    <div className="flex flex-col">
                      <button type="button" onClick={() => setIsCollapsed(false)} title="Assistente IA" className="flex items-center justify-center w-full rounded-md py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"><Brain size={iconSize} /></button>
                      <Link href="/assistente-ia/pendentes" title="Pendentes" className={linkCls(isItemActive('/assistente-ia/pendentes'))} style={isItemActive('/assistente-ia/pendentes') ? { borderLeftColor: primaryColorValue } : {}}><AlertCircle size={iconSize} /></Link>
                      <Link href="/assistente-ia/treinar" title="Treinar IA" className={linkCls(isItemActive('/assistente-ia/treinar'))} style={isItemActive('/assistente-ia/treinar') ? { borderLeftColor: primaryColorValue } : {}}><Sparkles size={iconSize} /></Link>
                      <Link href="/assistente-ia/modelo" title="Modelo" className={linkCls(pathname.startsWith('/assistente-ia/modelo') || pathname.startsWith('/assistente-ia/contextos'))} style={pathname.startsWith('/assistente-ia/modelo') || pathname.startsWith('/assistente-ia/contextos') ? { borderLeftColor: primaryColorValue } : {}}><Brain size={iconSize} /></Link>
                    </div>
                  ) : sectionIconBtn('assistenteia_dev', Brain, 'Assistente IA')}
                  {activeCollapsedSectionId === 'minhaconta_dev' ? (
                    <div className="flex flex-col">
                      <button type="button" onClick={() => setIsCollapsed(false)} title="Minha conta" className="flex items-center justify-center w-full rounded-md py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"><User size={iconSize} /></button>
                      <Link href="/dev/perfil" title="Configurações" className={linkCls(isItemActive('/dev/perfil'))} style={isItemActive('/dev/perfil') ? { borderLeftColor: primaryColorValue } : {}}><Settings size={iconSize} /></Link>
                    </div>
                  ) : sectionIconBtn('minhaconta_dev', User, 'Minha conta')}
                </>
              )}

              {isMaster && (
                <>
                  {activeCollapsedSectionId === 'admin' ? (
                    <div className="flex flex-col">
                      <button type="button" onClick={() => setIsCollapsed(false)} title="Admin" className="flex items-center justify-center w-full rounded-md py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"><Settings size={iconSize} /></button>
                      <Link href="/admin/desenvolvedores" title="Desenvolvedores" className={linkCls(isItemActive('/admin/desenvolvedores'))} style={isItemActive('/admin/desenvolvedores') ? { borderLeftColor: primaryColorValue } : {}}><Code size={iconSize} /></Link>
                      <Link href="/admin/grupos" title="Grupos" className={linkCls(isItemActive('/admin/grupos'))} style={isItemActive('/admin/grupos') ? { borderLeftColor: primaryColorValue } : {}}><Building2 size={iconSize} /></Link>
                      <Link href="/admin/usuarios" title="Usuários" className={linkCls(isItemActive('/admin/usuarios'))} style={isItemActive('/admin/usuarios') ? { borderLeftColor: primaryColorValue } : {}}><Users size={iconSize} /></Link>
                      <Link href="/configuracoes/logs" title="Logs" className={linkCls(isItemActive('/configuracoes/logs'))} style={isItemActive('/configuracoes/logs') ? { borderLeftColor: primaryColorValue } : {}}><FileText size={iconSize} /></Link>
                    </div>
                  ) : sectionIconBtn('admin', Settings, 'Admin')}
                  {(activeCollapsedSectionId === 'powerbi_master') ? (
                    <div className="flex flex-col">
                      <button type="button" onClick={() => setIsCollapsed(false)} title="Power BI" className="flex items-center justify-center w-full rounded-md py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"><BarChart3 size={iconSize} /></button>
                      <Link href="/powerbi/conexoes" title="Conexões" className={linkCls(isItemActive('/powerbi/conexoes'))} style={isItemActive('/powerbi/conexoes') ? { borderLeftColor: primaryColorValue } : {}}><LinkIcon size={iconSize} /></Link>
                      <Link href="/powerbi/relatorios" title="Relatórios" className={linkCls(isItemActive('/powerbi/relatorios'))} style={isItemActive('/powerbi/relatorios') ? { borderLeftColor: primaryColorValue } : {}}><FileText size={iconSize} /></Link>
                      <Link href="/powerbi/telas" title="Telas" className={linkCls(isItemActive('/powerbi/telas'))} style={isItemActive('/powerbi/telas') ? { borderLeftColor: primaryColorValue } : {}}><Monitor size={iconSize} /></Link>
                      <Link href="/powerbi/ordem-atualizacao" title="Atualizações" className={linkCls(isItemActive('/powerbi/ordem-atualizacao'))} style={isItemActive('/powerbi/ordem-atualizacao') ? { borderLeftColor: primaryColorValue } : {}}><ArrowUpDown size={iconSize} /></Link>
                    </div>
                  ) : sectionIconBtn('powerbi_master', BarChart3, 'Power BI')}
                  {activeCollapsedSectionId === 'whatsapp_master' ? (
                    <div className="flex flex-col">
                      <button type="button" onClick={() => setIsCollapsed(false)} title="WhatsApp" className="flex items-center justify-center w-full rounded-md py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"><MessageSquare size={iconSize} /></button>
                      <Link href="/whatsapp/instancias" title="Instâncias" className={linkCls(isItemActive('/whatsapp/instancias'))} style={isItemActive('/whatsapp/instancias') ? { borderLeftColor: primaryColorValue } : {}}><Smartphone size={iconSize} /></Link>
                      <Link href="/whatsapp/numeros" title="Números" className={linkCls(isItemActive('/whatsapp/numeros'))} style={isItemActive('/whatsapp/numeros') ? { borderLeftColor: primaryColorValue } : {}}><User size={iconSize} /></Link>
                      <Link href="/whatsapp/grupos" title="Grupos" className={linkCls(isItemActive('/whatsapp/grupos'))} style={isItemActive('/whatsapp/grupos') ? { borderLeftColor: primaryColorValue } : {}}><UsersRound size={iconSize} /></Link>
                      <Link href="/whatsapp/mensagens" title="Mensagens" className={linkCls(isItemActive('/whatsapp/mensagens'))} style={isItemActive('/whatsapp/mensagens') ? { borderLeftColor: primaryColorValue } : {}}><MessageSquare size={iconSize} /></Link>
                      <Link href="/alertas" title="Alertas" className={linkCls(isItemActive('/alertas', true))} style={isItemActive('/alertas', true) ? { borderLeftColor: primaryColorValue } : {}}><Bell size={iconSize} /></Link>
                      <Link href="/whatsapp/webhook" title="Webhook" className={linkCls(isItemActive('/whatsapp/webhook'))} style={isItemActive('/whatsapp/webhook') ? { borderLeftColor: primaryColorValue } : {}}><Webhook size={iconSize} /></Link>
                    </div>
                  ) : sectionIconBtn('whatsapp_master', MessageSquare, 'WhatsApp')}
                  {activeCollapsedSectionId === 'assistenteia_master' ? (
                    <div className="flex flex-col">
                      <button type="button" onClick={() => setIsCollapsed(false)} title="Assistente IA" className="flex items-center justify-center w-full rounded-md py-2 text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"><Brain size={iconSize} /></button>
                      <Link href="/assistente-ia/pendentes" title="Pendentes" className={linkCls(isItemActive('/assistente-ia/pendentes'))} style={isItemActive('/assistente-ia/pendentes') ? { borderLeftColor: primaryColorValue } : {}}><AlertCircle size={iconSize} /></Link>
                      <Link href="/assistente-ia/treinar" title="Treinar IA" className={linkCls(isItemActive('/assistente-ia/treinar'))} style={isItemActive('/assistente-ia/treinar') ? { borderLeftColor: primaryColorValue } : {}}><Sparkles size={iconSize} /></Link>
                      <Link href="/assistente-ia/modelo" title="Modelo" className={linkCls(pathname.startsWith('/assistente-ia/modelo') || pathname.startsWith('/assistente-ia/contextos'))} style={pathname.startsWith('/assistente-ia/modelo') || pathname.startsWith('/assistente-ia/contextos') ? { borderLeftColor: primaryColorValue } : {}}><Brain size={iconSize} /></Link>
                    </div>
                  ) : sectionIconBtn('assistenteia_master', Brain, 'Assistente IA')}
                </>
              )}
            </nav>
          ) : (
          <>
          {/* 2. TELAS — todos os perfis */}
          <CollapsibleSection sectionId="telas" Icon={Layers} title="Telas">
          {loading ? (
            <div className="flex justify-center py-6">
              <LoadingSpinner size={20} />
            </div>
          ) : screens.length === 0 ? (
            !isCollapsed && (
              <p className="px-3 py-2 text-xs text-gray-500">
                {effectiveGroupId ? 'Nenhuma tela disponível' : 'Selecione um grupo'}
              </p>
            )
          ) : (
            <nav className="px-2 space-y-0.5">
              {screens.map((screen) => {
                const Icon = getIconComponent(screen.icon);
                const href = `/tela/${screen.id}`;
                const active = isScreenActive(href);
                return (
                  <Link
                    key={screen.id}
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${
                      active ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    style={active ? { borderLeftColor: primaryColorValue } : {}}
                    title={isCollapsed ? screen.title : undefined}
                  >
                    <Icon size={iconSize} className="flex-shrink-0" />
                    {!isCollapsed && <span className="text-sm truncate">{screen.title}</span>}
                  </Link>
                );
              })}
              {(isDeveloper || isMaster) && effectiveGroupId && (
                <Link
                  href={`/dev/groups/${effectiveGroupId}`}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all"
                  title={isCollapsed ? 'Nova tela' : undefined}
                >
                  <Plus size={iconSize} />
                  {!isCollapsed && <span className="text-sm">Nova tela</span>}
                </Link>
              )}
            </nav>
          )}
          </CollapsibleSection>

          {/* VIEWER: só Minha Conta */}
          {isRegularUser && (
            <>
              <Separator />
              <CollapsibleSection sectionId="minhaconta_viewer" Icon={User} title="Minha conta">
              <nav className="px-2 space-y-0.5">
                <Link
                  href="/perfil"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${
                    isItemActive('/perfil') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  style={isItemActive('/perfil') ? { borderLeftColor: primaryColorValue } : {}}
                  title={isCollapsed ? 'Perfil' : undefined}
                >
                  <User size={iconSize} />
                  {!isCollapsed && <span className="text-sm">Perfil</span>}
                </Link>
                <Link
                  href="/trocar-senha"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${
                    isItemActive('/trocar-senha') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  style={isItemActive('/trocar-senha') ? { borderLeftColor: primaryColorValue } : {}}
                  title={isCollapsed ? 'Trocar Senha' : undefined}
                >
                  <Key size={iconSize} />
                  {!isCollapsed && <span className="text-sm">Trocar Senha</span>}
                </Link>
                <Link
                  href="/meus-logs"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${
                    isItemActive('/meus-logs') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  style={isItemActive('/meus-logs') ? { borderLeftColor: primaryColorValue } : {}}
                  title={isCollapsed ? 'Meus Logs' : undefined}
                >
                  <ScrollText size={iconSize} />
                  {!isCollapsed && <span className="text-sm">Meus Logs</span>}
                </Link>
              </nav>
              </CollapsibleSection>
            </>
          )}

          {/* ADMIN DE GRUPO */}
          {isAdmin && (
            <>
              <Separator />
              <CollapsibleSection sectionId="gerenciar" Icon={Users} title="Gerenciar">
              <nav className="px-2 space-y-0.5">
                {activeGroup?.id && (
                  <>
                    <Link
                      href={`/administrador/${activeGroup.id}/usuarios`}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${
                        pathname.includes('/usuarios') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                      style={pathname.includes('/usuarios') ? { borderLeftColor: primaryColorValue } : {}}
                    >
                      <Users size={iconSize} />
                      {!isCollapsed && <span className="text-sm">Usuários & Telas</span>}
                    </Link>
                    <Link
                      href={`/administrador/${activeGroup.id}/logs`}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${
                        pathname.includes('/logs') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                      }`}
                      style={pathname.includes('/logs') ? { borderLeftColor: primaryColorValue } : {}}
                    >
                      <FileText size={iconSize} />
                      {!isCollapsed && <span className="text-sm">Logs</span>}
                    </Link>
                  </>
                )}
              </nav>
              </CollapsibleSection>
              <Separator />
              <CollapsibleSection sectionId="whatsapp" Icon={MessageSquare} title="WhatsApp" locked={!hasWhatsapp}>
              <nav className="px-2 space-y-0.5">
                <Link
                  href="/whatsapp/numeros"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${
                    isItemActive('/whatsapp/numeros') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  style={isItemActive('/whatsapp/numeros') ? { borderLeftColor: primaryColorValue } : {}}
                >
                  <User size={iconSize} />
                  {!isCollapsed && <span className="text-sm">Números</span>}
                </Link>
                <Link
                  href="/whatsapp/mensagens"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${
                    isItemActive('/whatsapp/mensagens') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  style={isItemActive('/whatsapp/mensagens') ? { borderLeftColor: primaryColorValue } : {}}
                >
                  <MessageSquare size={iconSize} />
                  {!isCollapsed && <span className="text-sm">Mensagens</span>}
                </Link>
                <Link
                  href="/alertas"
                  className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${
                    isItemActive('/alertas', true) ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  }`}
                  style={isItemActive('/alertas', true) ? { borderLeftColor: primaryColorValue } : {}}
                >
                  <Bell size={iconSize} />
                  {!isCollapsed && <span className="text-sm">Alertas</span>}
                </Link>
              </nav>
              </CollapsibleSection>
              {canAccessAssistenteIA() && (
                <>
                  <Separator />
                  <CollapsibleSection sectionId="assistenteia" Icon={Brain} title="Assistente IA" locked={!hasAI}>
                  <nav className="px-2 space-y-0.5">
                    <Link href="/assistente-ia/pendentes" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/assistente-ia/pendentes') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/assistente-ia/pendentes') ? { borderLeftColor: primaryColorValue } : {}}><AlertCircle size={iconSize} />{!isCollapsed && <span className="text-sm">Pendentes</span>}</Link>
                    <Link href="/assistente-ia/treinar" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/assistente-ia/treinar') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/assistente-ia/treinar') ? { borderLeftColor: primaryColorValue } : {}}><Sparkles size={iconSize} />{!isCollapsed && <span className="text-sm">Treinar IA</span>}</Link>
                    <Link href="/assistente-ia/modelo" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${pathname.startsWith('/assistente-ia/modelo') || pathname.startsWith('/assistente-ia/contextos') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={pathname.startsWith('/assistente-ia/modelo') || pathname.startsWith('/assistente-ia/contextos') ? { borderLeftColor: primaryColorValue } : {}}><Brain size={iconSize} />{!isCollapsed && <span className="text-sm">Modelo</span>}</Link>
                  </nav>
                  </CollapsibleSection>
                </>
              )}
              <Separator />
              <CollapsibleSection sectionId="minhaconta_admin" Icon={User} title="Minha conta">
              <nav className="px-2 space-y-0.5">
                <Link href="/perfil" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/perfil') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/perfil') ? { borderLeftColor: primaryColorValue } : {}}><User size={iconSize} />{!isCollapsed && <span className="text-sm">Perfil</span>}</Link>
                <Link href="/trocar-senha" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/trocar-senha') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/trocar-senha') ? { borderLeftColor: primaryColorValue } : {}}><Key size={iconSize} />{!isCollapsed && <span className="text-sm">Trocar Senha</span>}</Link>
                <Link href="/meus-logs" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/meus-logs') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/meus-logs') ? { borderLeftColor: primaryColorValue } : {}}><ScrollText size={iconSize} />{!isCollapsed && <span className="text-sm">Meus Logs</span>}</Link>
              </nav>
              </CollapsibleSection>
            </>
          )}

          {/* DEVELOPER */}
          {isDeveloper && (
            <>
              <Separator />
              <CollapsibleSection sectionId="meusgrupos" Icon={Building2} title="Meus grupos">
              <nav className="px-2 space-y-0.5">
                <Link href="/dev/groups" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/dev/groups') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/dev/groups') ? { borderLeftColor: primaryColorValue } : {}}><Building2 size={iconSize} />{!isCollapsed && <span className="text-sm">Grupos</span>}</Link>
                <Link href="/dev/usuarios" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/dev/usuarios') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/dev/usuarios') ? { borderLeftColor: primaryColorValue } : {}}><Users size={iconSize} />{!isCollapsed && <span className="text-sm">Usuários & Telas</span>}</Link>
                <Link href="/dev/quotas" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/dev/quotas') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/dev/quotas') ? { borderLeftColor: primaryColorValue } : {}}><ArrowUpDown size={iconSize} />{!isCollapsed && <span className="text-sm">Cotas</span>}</Link>
                <Link href="/dev/recursos" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/dev/recursos') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/dev/recursos') ? { borderLeftColor: primaryColorValue } : {}}><Share2 size={iconSize} />{!isCollapsed && <span className="text-sm">Recursos</span>}</Link>
              </nav>
              </CollapsibleSection>
              <Separator />
              <CollapsibleSection sectionId="powerbi_dev" Icon={BarChart3} title="Power BI">
              <nav className="px-2 space-y-0.5">
                {allowPowerbiConnections && (
                  <Link href="/powerbi/conexoes" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/powerbi/conexoes') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/powerbi/conexoes') ? { borderLeftColor: primaryColorValue } : {}}><LinkIcon size={iconSize} />{!isCollapsed && <span className="text-sm">Conexões</span>}</Link>
                )}
                <Link href="/powerbi/relatorios" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/powerbi/relatorios') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/powerbi/relatorios') ? { borderLeftColor: primaryColorValue } : {}}><FileText size={iconSize} />{!isCollapsed && <span className="text-sm">Relatórios</span>}</Link>
                <Link href="/powerbi/telas" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/powerbi/telas') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/powerbi/telas') ? { borderLeftColor: primaryColorValue } : {}}><Monitor size={iconSize} />{!isCollapsed && <span className="text-sm">Telas</span>}</Link>
                <Link href="/powerbi/ordem-atualizacao" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/powerbi/ordem-atualizacao') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/powerbi/ordem-atualizacao') ? { borderLeftColor: primaryColorValue } : {}}><ArrowUpDown size={iconSize} />{!isCollapsed && <span className="text-sm">Atualizações</span>}</Link>
              </nav>
              </CollapsibleSection>
              <Separator />
              <CollapsibleSection sectionId="whatsapp_dev" Icon={MessageSquare} title="WhatsApp" locked={!hasWhatsapp}>
              <nav className="px-2 space-y-0.5">
                {allowWhatsappInstances && (
                  <Link href="/whatsapp/instancias" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/whatsapp/instancias') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/whatsapp/instancias') ? { borderLeftColor: primaryColorValue } : {}}><Smartphone size={iconSize} />{!isCollapsed && <span className="text-sm">Instâncias</span>}</Link>
                )}
                <Link href="/whatsapp/numeros" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/whatsapp/numeros') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/whatsapp/numeros') ? { borderLeftColor: primaryColorValue } : {}}><User size={iconSize} />{!isCollapsed && <span className="text-sm">Números</span>}</Link>
                <Link href="/whatsapp/mensagens" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/whatsapp/mensagens') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/whatsapp/mensagens') ? { borderLeftColor: primaryColorValue } : {}}><MessageSquare size={iconSize} />{!isCollapsed && <span className="text-sm">Mensagens</span>}</Link>
                <Link href="/alertas" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/alertas', true) ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/alertas', true) ? { borderLeftColor: primaryColorValue } : {}}><Bell size={iconSize} />{!isCollapsed && <span className="text-sm">Alertas</span>}</Link>
              </nav>
              </CollapsibleSection>
              <Separator />
              <CollapsibleSection sectionId="assistenteia_dev" Icon={Brain} title="Assistente IA" locked={!hasAI}>
              <nav className="px-2 space-y-0.5">
                <Link href="/assistente-ia/pendentes" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/assistente-ia/pendentes') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/assistente-ia/pendentes') ? { borderLeftColor: primaryColorValue } : {}}><AlertCircle size={iconSize} />{!isCollapsed && <span className="text-sm">Pendentes</span>}</Link>
                <Link href="/assistente-ia/treinar" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/assistente-ia/treinar') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/assistente-ia/treinar') ? { borderLeftColor: primaryColorValue } : {}}><Sparkles size={iconSize} />{!isCollapsed && <span className="text-sm">Treinar IA</span>}</Link>
                <Link href="/assistente-ia/modelo" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${pathname.startsWith('/assistente-ia/modelo') || pathname.startsWith('/assistente-ia/contextos') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={pathname.startsWith('/assistente-ia/modelo') || pathname.startsWith('/assistente-ia/contextos') ? { borderLeftColor: primaryColorValue } : {}}><Brain size={iconSize} />{!isCollapsed && <span className="text-sm">Modelo</span>}</Link>
              </nav>
              </CollapsibleSection>
              <Separator />
              <CollapsibleSection sectionId="minhaconta_dev" Icon={User} title="Minha conta">
              <nav className="px-2 space-y-0.5">
                <Link href="/dev/perfil" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/dev/perfil') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/dev/perfil') ? { borderLeftColor: primaryColorValue } : {}}><Settings size={iconSize} />{!isCollapsed && <span className="text-sm">Configurações</span>}</Link>
              </nav>
              </CollapsibleSection>
            </>
          )}

          {/* MASTER */}
          {isMaster && (
            <>
              <Separator />
              <CollapsibleSection sectionId="admin" Icon={Code} title="Admin">
              <nav className="px-2 space-y-0.5">
                <Link href="/admin/desenvolvedores" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/admin/desenvolvedores') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/admin/desenvolvedores') ? { borderLeftColor: primaryColorValue } : {}}><Code size={iconSize} />{!isCollapsed && <span className="text-sm">Desenvolvedores</span>}</Link>
                <Link href="/admin/grupos" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/admin/grupos') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/admin/grupos') ? { borderLeftColor: primaryColorValue } : {}}><Building2 size={iconSize} />{!isCollapsed && <span className="text-sm">Grupos</span>}</Link>
                <Link href="/admin/usuarios" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/admin/usuarios') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/admin/usuarios') ? { borderLeftColor: primaryColorValue } : {}}><Users size={iconSize} />{!isCollapsed && <span className="text-sm">Usuários</span>}</Link>
                <Link href="/configuracoes/logs" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/configuracoes/logs') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/configuracoes/logs') ? { borderLeftColor: primaryColorValue } : {}}><FileText size={iconSize} />{!isCollapsed && <span className="text-sm">Logs</span>}</Link>
              </nav>
              </CollapsibleSection>
              <Separator />
              <CollapsibleSection sectionId="powerbi_master" Icon={BarChart3} title="Power BI">
              <nav className="px-2 space-y-0.5">
                <Link href="/powerbi/conexoes" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/powerbi/conexoes') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/powerbi/conexoes') ? { borderLeftColor: primaryColorValue } : {}}><LinkIcon size={iconSize} />{!isCollapsed && <span className="text-sm">Conexões</span>}</Link>
                <Link href="/powerbi/relatorios" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/powerbi/relatorios') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/powerbi/relatorios') ? { borderLeftColor: primaryColorValue } : {}}><FileText size={iconSize} />{!isCollapsed && <span className="text-sm">Relatórios</span>}</Link>
                <Link href="/powerbi/telas" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/powerbi/telas') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/powerbi/telas') ? { borderLeftColor: primaryColorValue } : {}}><Monitor size={iconSize} />{!isCollapsed && <span className="text-sm">Telas</span>}</Link>
                <Link href="/powerbi/ordem-atualizacao" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/powerbi/ordem-atualizacao') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/powerbi/ordem-atualizacao') ? { borderLeftColor: primaryColorValue } : {}}><ArrowUpDown size={iconSize} />{!isCollapsed && <span className="text-sm">Atualizações</span>}</Link>
              </nav>
              </CollapsibleSection>
              <Separator />
              <CollapsibleSection sectionId="whatsapp_master" Icon={MessageSquare} title="WhatsApp">
              <nav className="px-2 space-y-0.5">
                <Link href="/whatsapp/instancias" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/whatsapp/instancias') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/whatsapp/instancias') ? { borderLeftColor: primaryColorValue } : {}}><Smartphone size={iconSize} />{!isCollapsed && <span className="text-sm">Instâncias</span>}</Link>
                <Link href="/whatsapp/numeros" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/whatsapp/numeros') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/whatsapp/numeros') ? { borderLeftColor: primaryColorValue } : {}}><User size={iconSize} />{!isCollapsed && <span className="text-sm">Números</span>}</Link>
                <Link href="/whatsapp/grupos" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/whatsapp/grupos') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/whatsapp/grupos') ? { borderLeftColor: primaryColorValue } : {}}><UsersRound size={iconSize} />{!isCollapsed && <span className="text-sm">Grupos</span>}</Link>
                <Link href="/whatsapp/mensagens" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/whatsapp/mensagens') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/whatsapp/mensagens') ? { borderLeftColor: primaryColorValue } : {}}><MessageSquare size={iconSize} />{!isCollapsed && <span className="text-sm">Mensagens</span>}</Link>
                <Link href="/alertas" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/alertas', true) ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/alertas', true) ? { borderLeftColor: primaryColorValue } : {}}><Bell size={iconSize} />{!isCollapsed && <span className="text-sm">Alertas</span>}</Link>
                <Link href="/whatsapp/webhook" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/whatsapp/webhook') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/whatsapp/webhook') ? { borderLeftColor: primaryColorValue } : {}}><Webhook size={iconSize} />{!isCollapsed && <span className="text-sm">Webhook</span>}</Link>
              </nav>
              </CollapsibleSection>
              <Separator />
              <CollapsibleSection sectionId="assistenteia_master" Icon={Brain} title="Assistente IA">
              <nav className="px-2 space-y-0.5">
                <Link href="/assistente-ia/pendentes" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/assistente-ia/pendentes') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/assistente-ia/pendentes') ? { borderLeftColor: primaryColorValue } : {}}><AlertCircle size={iconSize} />{!isCollapsed && <span className="text-sm">Pendentes</span>}</Link>
                <Link href="/assistente-ia/treinar" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${isItemActive('/assistente-ia/treinar') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={isItemActive('/assistente-ia/treinar') ? { borderLeftColor: primaryColorValue } : {}}><Sparkles size={iconSize} />{!isCollapsed && <span className="text-sm">Treinar IA</span>}</Link>
                <Link href="/assistente-ia/modelo" className={`flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-150 ${pathname.startsWith('/assistente-ia/modelo') || pathname.startsWith('/assistente-ia/contextos') ? 'text-gray-900 bg-gray-100 border-l-2' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`} style={pathname.startsWith('/assistente-ia/modelo') || pathname.startsWith('/assistente-ia/contextos') ? { borderLeftColor: primaryColorValue } : {}}><Brain size={iconSize} />{!isCollapsed && <span className="text-sm">Modelo</span>}</Link>
              </nav>
              </CollapsibleSection>
            </>
          )}
          </>
          )}
        </div>
      </aside>
    </>
  );
}
