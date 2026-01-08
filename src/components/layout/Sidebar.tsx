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
  Webhook,
  LayoutDashboard,
  Bell,
  Plus,
  History,
  ArrowUpDown,
  Crown,
  Puzzle
} from 'lucide-react';
import { useMenu } from '@/contexts/MenuContext';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

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
  'default': Monitor
};

export default function Sidebar() {
  const pathname = usePathname();
  const { isCollapsed, setIsCollapsed, activeGroup, user } = useMenu();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(false);

  // Verifica se é usuário comum
  const isRegularUser = !user?.is_master && user?.role === 'user';

  // User comum sempre vê as telas no sidebar, independente da página
  const showScreens = isRegularUser || pathname === '/dashboard' || pathname.startsWith('/tela') || pathname.startsWith('/powerbi');

  const showPowerBIMenu = pathname.startsWith('/powerbi') && !isRegularUser;
  const showConfigMenu = pathname.startsWith('/configuracoes');
  const showWhatsAppMenu = pathname.startsWith('/whatsapp') || pathname.startsWith('/alertas');

  // Verifica se usuário pode ver menu de configurações (master ou admin)
  const canSeeConfig = user?.is_master || user?.role === 'admin';

  const powerBIMenuItems = [
    { href: '/powerbi', icon: Activity, label: 'Dashboard' },
    { href: '/powerbi/conexoes', icon: LinkIcon, label: 'Conexões' },
    { href: '/powerbi/relatorios', icon: FileText, label: 'Relatórios' },
    { href: '/powerbi/telas', icon: Layers, label: 'Telas' },
    { href: '/powerbi/contextos', icon: Brain, label: 'Contextos IA' },
    { href: '/powerbi/ordem-atualizacao', icon: ArrowUpDown, label: 'Ordem Atualização' },
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
    { href: '/whatsapp', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/whatsapp/instancias', icon: Smartphone, label: 'Instâncias' },
    { href: '/whatsapp/numeros', icon: User, label: 'Números Autorizados' },
    { href: '/whatsapp/grupos', icon: UsersRound, label: 'Grupos Autorizados' },
    { href: '/whatsapp/mensagens', icon: MessageSquare, label: 'Mensagens' },
    { href: '/alertas', icon: Bell, label: 'Alertas' },
    { href: '/alertas/historico', icon: History, label: 'Histórico' },
    { href: '/whatsapp/webhook', icon: Webhook, label: 'Webhook' },
  ];

  useEffect(() => {
    if (activeGroup?.id) {
      loadScreens(activeGroup.id);
    } else {
      setScreens([]);
    }
  }, [activeGroup?.id]);

  async function loadScreens(groupId: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/powerbi/screens?group_id=${groupId}`, {
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        const activeScreens = (data.screens || [])
          .filter((s: Screen) => s.is_active)
          .sort((a: Screen, b: Screen) => {
            if (a.is_first && !b.is_first) return -1;
            if (!a.is_first && b.is_first) return 1;
            return a.title.localeCompare(b.title);
          });
        setScreens(activeScreens);
      }
    } catch (error) {
      console.error('Erro ao carregar telas:', error);
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
          {/* Menu de Configurações (master e admin) */}
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
                {whatsappMenuItems.map((item) => {
                  const Icon = item.icon;
                  let isActive = pathname === item.href;
                  
                  // Lógica especial para /alertas: marca como ativo em /alertas/novo, /alertas/[id], etc.
                  // Mas não marca quando estiver em /alertas/historico (que tem seu próprio item)
                  if (item.href === '/alertas' && pathname.startsWith('/alertas/') && !pathname.startsWith('/alertas/historico')) {
                    isActive = true;
                  }
                  
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
                  {powerBIMenuItems.map((item) => {
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
          {showScreens && (
            <>
              {!isCollapsed && (
                <div className="px-4 pb-2 mb-2 border-b border-gray-100">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Telas
                  </h3>
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
                const Icon = ICON_MAP[screen.icon || 'default'] || Monitor;
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
