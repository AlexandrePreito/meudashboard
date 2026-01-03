'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  BarChart3,
  MessageSquare,
  Bell,
  Users,
  Building2,
  Settings,
  ChevronLeft,
  ChevronRight,
  Monitor,
  FileText,
  Database,
  Link as LinkIcon,
  Layers
} from 'lucide-react';
import { useMenu } from '@/contexts/MenuContext';

interface Screen {
  id: string;
  title: string;
  icon?: string;
  is_active: boolean;
  is_first?: boolean;
}

interface SidebarProps {
  user: {
    id: string;
    is_master?: boolean;
  };
}

const ICON_MAP: Record<string, any> = {
  'LayoutDashboard': LayoutDashboard,
  'BarChart3': BarChart3,
  'Monitor': Monitor,
  'FileText': FileText,
  'Database': Database,
  'default': Monitor
};

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const { isCollapsed, setIsCollapsed, activeGroup } = useMenu();
  const [screens, setScreens] = useState<Screen[]>([]);

  useEffect(() => {
    if (activeGroup?.id) {
      loadScreens(activeGroup.id);
    } else {
      setScreens([]);
    }
  }, [activeGroup?.id]);

  async function loadScreens(groupId: string) {
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
    }
  }

  const mainMenuItems = [
    { href: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { href: '/chat', icon: MessageSquare, label: 'Chat IA' },
    { href: '/alertas', icon: Bell, label: 'Alertas' },
  ];

  const powerbiMenuItems = user.is_master ? [
    { href: '/powerbi/conexoes', icon: LinkIcon, label: 'Conexões' },
    { href: '/powerbi/relatorios', icon: FileText, label: 'Relatórios' },
    { href: '/powerbi/telas', icon: Layers, label: 'Telas' },
  ] : [];

  const adminMenuItems = user.is_master ? [
    { href: '/admin/usuarios', icon: Users, label: 'Usuários' },
    { href: '/admin/grupos', icon: Building2, label: 'Grupos' },
    { href: '/admin/config', icon: Settings, label: 'Configurações' },
  ] : [];

  return (
    <>
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      <aside className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-white border-r border-gray-200 z-40 transition-all duration-300 ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        <div className="flex flex-col h-full overflow-y-auto py-4">
          <nav className="px-2 space-y-1">
            {mainMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-blue-50 text-blue-600' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon size={20} />
                  {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {screens.length > 0 && (
            <>
              {!isCollapsed && (
                <div className="px-4 py-2 mt-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Telas Power BI
                  </h3>
                </div>
              )}
              <nav className="px-2 space-y-1">
                {screens.map((screen) => {
                  const Icon = ICON_MAP[screen.icon || 'default'] || Monitor;
                  const href = `/powerbi/tela/${screen.id}`;
                  const isActive = pathname === href;
                  return (
                    <Link
                      key={screen.id}
                      href={href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-600' 
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
            </>
          )}

          {powerbiMenuItems.length > 0 && (
            <>
              {!isCollapsed && (
                <div className="px-4 py-2 mt-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Power BI
                  </h3>
                </div>
              )}
              <nav className="px-2 space-y-1">
                {powerbiMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-600' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon size={20} />
                      {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                    </Link>
                  );
                })}
              </nav>
            </>
          )}

          {adminMenuItems.length > 0 && (
            <>
              {!isCollapsed && (
                <div className="px-4 py-2 mt-4">
                  <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Administração
                  </h3>
                </div>
              )}
              <nav className="px-2 space-y-1">
                {adminMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                        isActive 
                          ? 'bg-blue-50 text-blue-600' 
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <Icon size={20} />
                      {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
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
