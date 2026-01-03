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
  Loader2
} from 'lucide-react';
import { useMenu } from '@/contexts/MenuContext';

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
  const { isCollapsed, setIsCollapsed, activeGroup } = useMenu();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [loading, setLoading] = useState(false);

  const showScreens = pathname === '/' || pathname.startsWith('/tela');

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
                  <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
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
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
