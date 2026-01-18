'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronLeft,
  ChevronRight,
  Monitor,
  BarChart3,
  FileText,
  PieChart,
  TrendingUp,
  Activity,
  Link as LinkIcon,
  Layers,
  Server,
  Brain,
  Settings,
  User,
  Users,
  Building2,
  Smartphone,
  UsersRound,
  MessageSquare,
  MessageCircle,
  Webhook,
  LayoutDashboard,
  Bell,
  Plus,
  History,
  ArrowUpDown,
  Crown,
  Puzzle,
  Code2,
  Shield,
  Code,
  DollarSign,
  ShoppingCart,
  Package,
  Truck,
  Factory,
  CreditCard
} from 'lucide-react';
import { useMenu } from '@/contexts/MenuContext';
import { usePlanPermissions } from '@/hooks/usePlanPermissions';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

const adminMenuItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/desenvolvedores', icon: Code, label: 'Desenvolvedores' },
  { href: '/admin/grupos', icon: Building2, label: 'Grupos' },
  { href: '/admin/usuarios', icon: Users, label: 'Usuarios' },
  { href: '/admin/relatorios', icon: BarChart3, label: 'Relatorios' },
];

const devMenuItems = [
  { href: '/dev', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dev/groups', icon: Building2, label: 'Grupos' },
  { href: '/dev/usuarios', icon: Users, label: 'Usuários' },
  { href: '/dev/quotas', icon: ArrowUpDown, label: 'Distribuir Cotas' },
  { href: '/dev/relatorios', icon: BarChart3, label: 'Relatórios' },
  { href: '/dev/perfil', icon: Settings, label: 'Configurações' },
  { href: '/dev/plano', icon: CreditCard, label: 'Meu Plano' },
];

interface Screen {
  id: string;
  title: string;
  icon?: string;
  is_active: boolean;
  is_first?: boolean;
}

const ICON_MAP: Record<string, any> = {
  'Monitor': Monitor,
  'BarChart3': BarChart3,
  'FileText': FileText,
  'PieChart': PieChart,
  'TrendingUp': TrendingUp,
  'Activity': Activity,
  'DollarSign': DollarSign,
  'Users': Users,
  'ShoppingCart': ShoppingCart,
  'Package': Package,
  'Truck': Truck,
  'Factory': Factory,
  'default': Monitor
};

// Função helper para obter o componente de ícone
function getIconComponent(iconName?: string | null) {
  if (!iconName || iconName.trim() === '') {
    return Monitor;
  }
  
  const normalized = iconName.trim();
  // Tentar match exato primeiro
  if (ICON_MAP[normalized]) {
    return ICON_MAP[normalized];
  }
  
  // Tentar com primeira letra maiúscula (para nomes como "monitor" -> "Monitor")
  const capitalized = normalized.charAt(0).toUpperCase() + normalized.slice(1);
  if (ICON_MAP[capitalized]) {
    return ICON_MAP[capitalized];
  }
  
  // Fallback para Monitor
  return Monitor;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, setIsCollapsed, activeGroup, user } = useMenu();
  // Módulos removidos - sempre disponível
  // const { canUseAI, canUseAlerts, canUseWhatsApp, isStarterPlan } = usePlanPermissions();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(false);

  // Verifica se é usuário comum
  const isRegularUser = !user?.is_master && !user?.is_developer && user?.role === 'user';

  // Verificar se é admin (não master, não dev)
  const isAdmin = !user?.is_master && !user?.is_developer && user?.role === 'admin';

  // User comum sempre vê as telas no sidebar, independente da página
  const showScreens = isRegularUser || pathname === '/dashboard' || pathname.startsWith('/tela') || pathname.startsWith('/powerbi');

  const showPowerBIMenu = pathname.startsWith('/powerbi') && !isRegularUser;
  const showConfigMenu = pathname.startsWith('/configuracoes');
  const showWhatsAppMenu = pathname.startsWith('/whatsapp') || pathname.startsWith('/alertas');
  const showAdminMenu = pathname.startsWith('/admin');
  const showDevMenu = pathname.startsWith('/dev');
  const showAdministradorMenu = pathname.startsWith('/administrador/');

  // Verifica se usuário pode ver menu de configurações (apenas master, não admin)
  const canSeeConfig = user?.is_master;

  const powerBIMenuItems = [
    { href: '/powerbi', icon: Activity, label: 'Dashboard' },
    { href: '/powerbi/conexoes', icon: LinkIcon, label: 'Conexões', hideForAdmin: true },
    { href: '/powerbi/relatorios', icon: FileText, label: 'Relatórios', hideForAdmin: true },
    { href: '/powerbi/telas', icon: Monitor, label: 'Telas' },
    { href: '/powerbi/contextos', icon: Brain, label: 'Contextos IA', requiresPermission: 'ai', hideForAdmin: true },
    { href: '/powerbi/ordem-atualizacao', icon: ArrowUpDown, label: 'Ordem Atualização', hideForAdmin: true },
  ];

  // Itens de configuração - filtrados por perfil
  const configMenuItems = user?.is_master
    ? [
        { href: '/configuracoes', icon: Users, label: 'Usuários' },
        { href: '/configuracoes/grupos', icon: Building2, label: 'Grupos' },
        { href: '/configuracoes/planos', icon: Crown, label: 'Planos' },
        { href: '/configuracoes/modulos', icon: Puzzle, label: 'Módulos' },
        { href: '/configuracoes/logs', icon: FileText, label: 'Logs' },
      ]
    : user?.role === 'admin'
    ? [
        { href: '/configuracoes', icon: Users, label: 'Usuários' },
        { href: '/configuracoes/grupos', icon: Building2, label: 'Personalização' },
        { href: '/configuracoes/logs', icon: FileText, label: 'Logs' },
      ]
    : [
        { href: '/configuracoes', icon: User, label: 'Meu Perfil' },
        { href: '/configuracoes/logs', icon: FileText, label: 'Minhas Atividades' },
      ];

  const whatsappMenuItems = [
    { href: '/whatsapp', icon: LayoutDashboard, label: 'Dashboard', requiresPermission: 'whatsapp' },
    { href: '/whatsapp/instancias', icon: Smartphone, label: 'Instâncias', requiresPermission: 'whatsapp', hideForAdmin: true },
    { href: '/whatsapp/numeros', icon: User, label: 'Números Autorizados', requiresPermission: 'whatsapp' },
    { href: '/whatsapp/grupos', icon: UsersRound, label: 'Grupos Autorizados', requiresPermission: 'whatsapp', hideForDeveloper: true, hideForAdmin: true },
    { href: '/whatsapp/mensagens', icon: MessageSquare, label: 'Mensagens', requiresPermission: 'whatsapp' },
    { href: '/alertas', icon: Bell, label: 'Alertas', requiresPermission: 'alerts' },
    { href: '/alertas/historico', icon: History, label: 'Histórico', requiresPermission: 'alerts' },
    { href: '/whatsapp/webhook', icon: Webhook, label: 'Webhook', requiresPermission: 'whatsapp', hideForDeveloper: true, hideForAdmin: true },
  ];

  useEffect(() => {
    if (activeGroup?.id && user) {
      loadScreens(activeGroup.id);
    } else {
      setScreens([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeGroup?.id, user?.id, user?.role, user?.is_master, user?.is_developer]);

  async function loadScreens(groupId: string) {
    setLoading(true);
    try {
      // Para usuários comuns (não master, não developer, não admin), sempre usar only_mine=true
      // Para garantir que vejam apenas as telas às quais têm acesso
      const needsFilter = !user?.is_master && !user?.is_developer && user?.role !== 'admin';
      const url = needsFilter
        ? `/api/powerbi/screens?group_id=${groupId}&only_mine=true`
        : `/api/powerbi/screens?group_id=${groupId}`;
      
      const res = await fetch(url, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        const activeScreens = (data.screens || [])
          .filter((s: Screen) => s.is_active)
          .map((s: Screen) => {
            // Debug: log para verificar ícones recebidos
            console.log('Screen recebida:', s.title, 'icon:', s.icon, 'tipo:', typeof s.icon);
            return {
              ...s,
              icon: s.icon || 'Monitor' // Garantir que sempre temos um ícone padrão
            };
          })
          .sort((a: Screen, b: Screen) => {
            if (a.is_first && !b.is_first) return -1;
            if (!a.is_first && b.is_first) return 1;
            return a.title.localeCompare(b.title);
          });
        console.log('Telas processadas:', activeScreens.map((s: any) => ({ title: s.title, icon: s.icon })));
        setScreens(activeScreens);
      } else {
        // Se der erro, definir telas vazias para não mostrar nada
        setScreens([]);
      }
    } catch (error) {
      console.error('Erro ao carregar telas:', error);
      setScreens([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      <aside className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 transition-all duration-300 ${
        isCollapsed 
          ? '-translate-x-full lg:translate-x-0 w-64 lg:w-16' 
          : 'translate-x-0 w-64'
      } z-30 lg:z-40`}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="flex flex-col h-full overflow-y-auto py-4">
          {/* Menu Principal para ADMIN */}
          {isAdmin && !showConfigMenu && !showPowerBIMenu && !showWhatsAppMenu && !showAdministradorMenu && !showAdminMenu && !showDevMenu && !pathname.startsWith('/tela') && !pathname.startsWith('/dashboard') && (
            <>
              {!isCollapsed && (
                <div className="px-4 pt-4 pb-2">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Menu Principal
                  </h3>
                </div>
              )}
              <nav className="px-2 pb-4 border-b border-gray-100 mb-2">
                <Link
                  href="/administrador"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 ${
                    pathname.startsWith('/administrador')
                      ? 'nav-active'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  title="Administrador"
                >
                  <Building2 size={20} />
                  {!isCollapsed && <span className="font-medium">Administrador</span>}
                </Link>
                <Link
                  href="/powerbi"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 ${
                    pathname.startsWith('/powerbi')
                      ? 'nav-active'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  title="Power BI"
                >
                  <BarChart3 size={20} />
                  {!isCollapsed && <span className="font-medium">Power BI</span>}
                </Link>
                <Link
                  href="/whatsapp"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 ${
                    pathname.startsWith('/whatsapp') || pathname.startsWith('/alertas')
                      ? 'nav-active'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  title="WhatsApp"
                >
                  <MessageSquare size={20} />
                  {!isCollapsed && <span className="font-medium">WhatsApp</span>}
                </Link>
                <Link
                  href="/dashboard"
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 ${
                    pathname === '/dashboard'
                      ? 'nav-active'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  title="Dashboard"
                >
                  <LayoutDashboard size={20} />
                  {!isCollapsed && <span className="font-medium">Dashboard</span>}
                </Link>
              </nav>
            </>
          )}

          {/* Menu de Configurações (apenas master) */}
          {showConfigMenu && canSeeConfig && (
            <>
              {!isCollapsed && (
                <div className="px-4 pt-4 pb-2">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Configurações
                  </h3>
                </div>
              )}
              <nav className="px-2 pb-4 border-b border-gray-100 mb-2">
                {configMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 ${
                        isActive
                          ? 'nav-active'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      title={item.label}
                    >
                      <Icon size={20} />
                      {!isCollapsed && <span className="font-medium">{item.label}</span>}
                    </Link>
                  );
                })}
              </nav>
            </>
          )}

          {/* Menu de Administrador (Grupo) */}
          {showAdministradorMenu && (
            <>
              {!isCollapsed && (
                <div className="px-3 mb-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    ADMINISTRADOR
                  </p>
                </div>
              )}
              <Link
                href={pathname.split('/').slice(0, 3).join('/')}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  pathname === pathname.split('/').slice(0, 3).join('/') && !pathname.includes('/usuarios') && !pathname.includes('/logs')
                    ? 'nav-active' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Building2 className="h-5 w-5" />
                {!isCollapsed && <span>Administrador</span>}
              </Link>
              <Link
                href={`${pathname.split('/').slice(0, 3).join('/')}/usuarios`}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  pathname.includes('/usuarios') 
                    ? 'nav-active' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Users className="h-5 w-5" />
                {!isCollapsed && <span>Usuários</span>}
              </Link>
              <Link
                href={`${pathname.split('/').slice(0, 3).join('/')}/logs`}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  pathname.includes('/logs') 
                    ? 'nav-active' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FileText className="h-5 w-5" />
                {!isCollapsed && <span>Logs</span>}
              </Link>
            </>
          )}

          {/* Menu de Admin */}
          {showAdminMenu && user?.is_master && (
            <>
              {!isCollapsed && (
                <div className="px-4 pt-4 pb-2">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Administracao
                  </h3>
                </div>
              )}
              <nav className="px-2 pb-4 border-b border-gray-100 mb-2">
                {adminMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href ||
                    (item.href !== '/admin' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 ${
                        isActive
                          ? 'nav-active'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      title={item.label}
                    >
                      <Icon size={20} />
                      {!isCollapsed && <span className="font-medium">{item.label}</span>}
                    </Link>
                  );
                })}
              </nav>
            </>
          )}

          {/* Menu de Desenvolvedor */}
          {showDevMenu && (
            <>
              {!isCollapsed && (
                <div className="px-4 pt-4 pb-2">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Desenvolvedor
                  </h3>
                </div>
              )}
              <nav className="px-2 pb-4 border-b border-gray-100 mb-2">
                {devMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || 
                    (item.href !== '/dev' && pathname.startsWith(item.href));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 ${
                        isActive
                          ? 'nav-active'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      title={item.label}
                    >
                      <Icon size={20} />
                      {!isCollapsed && <span className="font-medium">{item.label}</span>}
                    </Link>
                  );
                })}
              </nav>
            </>
          )}

          {showWhatsAppMenu && (
            <>
              {!isCollapsed && (
                <div className="px-4 pt-4 pb-2">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    WhatsApp
                  </h3>
                </div>
              )}
              <nav className="px-2 pb-4 border-b border-gray-100 mb-2">
                {whatsappMenuItems
                  .filter(item => {
                    // Ocultar para developer se marcado
                    if ((item as any).hideForDeveloper && user?.is_developer) return false;
                    // Ocultar para admin se marcado
                    if ((item as any).hideForAdmin && isAdmin) return false;
                    return true;
                  })
                  .map((item) => {
                  const Icon = item.icon;
                  let isActive = pathname === item.href;
                  
                  // Lógica especial para /alertas: marca como ativo em /alertas/novo, /alertas/[id], etc.
                  // Mas não marca quando estiver em /alertas/historico (que tem seu próprio item)
                  if (item.href === '/alertas' && pathname.startsWith('/alertas/') && !pathname.startsWith('/alertas/historico')) {
                    isActive = true;
                  }
                  
                  // Módulos removidos - sempre disponível
                  // Verificação de permissão removida
                  
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 ${
                        isActive
                          ? 'nav-active'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      title={item.label}
                    >
                      <Icon size={20} />
                      {!isCollapsed && <span className="font-medium">{item.label}</span>}
                    </Link>
                  );
                })}
              </nav>
            </>
          )}

          {showPowerBIMenu && (
            <>
              {!isCollapsed && (
                <div className="px-4 pt-4 pb-2">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Power BI
                  </h3>
                </div>
              )}
              <nav className="px-2 pb-4 border-b border-gray-100 mb-2">
                  {powerBIMenuItems
                    .filter(item => {
                      // Ocultar para developer se marcado
                      if ((item as any).hideForDeveloper && user?.is_developer) return false;
                      // Ocultar para admin se marcado
                      if ((item as any).hideForAdmin && isAdmin) return false;
                      return true;
                    })
                    .map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    
                    // Módulos removidos - sempre disponível
                    // Verificação de permissão removida
                    
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 ${
                          isActive
                            ? 'nav-active'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                        title={item.label}
                      >
                        <Icon size={20} />
                        {!isCollapsed && <span className="font-medium">{item.label}</span>}
                      </Link>
                    );
                  })}
                </nav>
            </>
          )}
          {showScreens && (
            <>
              {!isCollapsed && (
                <div className="px-4 pb-2 mb-2 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Telas
                  </h3>
                  {(user?.is_developer || user?.is_master) && activeGroup?.id && (
                    <Link
                      href={`/dev/groups/${activeGroup.id}`}
                      className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Nova Tela"
                    >
                      <Plus size={16} />
                    </Link>
                  )}
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size={24} />
                </div>
              ) : screens.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  {!isCollapsed && (
                    <p className="text-sm text-gray-400">
                      {activeGroup ? 'Nenhuma tela disponível' : 'Selecione um grupo'}
                    </p>
                  )}
                </div>
              ) : (
                <nav className="px-2 space-y-1">
                  {screens.map((screen) => {
                    const Icon = getIconComponent(screen.icon);
                    const href = `/tela/${screen.id}`;
                    const isActive = pathname === href;
                    
                    return (
                      <Link
                        key={screen.id}
                        href={href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          isActive 
                            ? 'nav-active' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                        title={isCollapsed ? screen.title : undefined}
                      >
                        <Icon size={20} />
                        {!isCollapsed && (
                          <span className="text-sm font-medium truncate">{screen.title}</span>
                        )}
                      </Link>
                    );
                  })}
                </nav>
              )}
            </>
          )}

          {/* Menu de conta para usuários comuns - sempre visível */}
          {isRegularUser && (
            <>
              {!isCollapsed && (
                <div className="px-4 pt-4 pb-2 border-t border-gray-100 mt-2">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Minha Conta
                  </h3>
                </div>
              )}
              <nav className="px-2 pb-4">
                {configMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 ${
                        isActive
                          ? 'nav-active'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      title={item.label}
                    >
                      <Icon size={20} />
                      {!isCollapsed && <span className="font-medium">{item.label}</span>}
                    </Link>
                  );
                })}
              </nav>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
