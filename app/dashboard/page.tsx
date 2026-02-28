'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useMenu } from '@/contexts/MenuContext';
import {
  Building2,
  Users,
  LayoutDashboard,
  FileBarChart,
  ChevronRight,
} from 'lucide-react';

interface GroupStats {
  group: { id: string; name: string };
  stats: { users: number; screens: number; reports: number };
}

function DashboardContent() {
  const router = useRouter();
  const { activeGroup } = useMenu();
  const [screens, setScreens] = useState<any[]>([]);
  const [groupStats, setGroupStats] = useState<GroupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [attemptedLoad, setAttemptedLoad] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!attemptedLoad) {
        loadData();
        setAttemptedLoad(true);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [activeGroup?.id, attemptedLoad]);

  async function loadData() {
    try {
      let groupId = activeGroup?.id;
      let isViewer = false;

      const userRes = await fetch('/api/auth/me', { credentials: 'include' });
      if (userRes.ok) {
        const userData = await userRes.json();
        const u = userData.user || userData;
        isViewer = !u?.is_master && !u?.is_developer && u?.role === 'user';
        setUserRole(isViewer ? 'viewer' : 'other');

        if (!groupId) {
          const gids = userData.groupIds || u?.groupIds || u?.groupId;
          if (Array.isArray(gids) && gids.length > 0) {
            groupId = gids[0];
          } else if (typeof gids === 'string') {
            groupId = gids;
          }
        }
      }

      if (groupId) {
        const screensUrl = isViewer
          ? `/api/powerbi/screens?group_id=${groupId}&only_mine=true`
          : `/api/powerbi/screens?group_id=${groupId}`;

        const [statsRes, screensRes] = await Promise.all([
          isViewer ? Promise.resolve(null) : fetch(`/api/dashboard/group-stats?group_id=${groupId}`, { credentials: 'include' }),
          fetch(screensUrl, { credentials: 'include' }),
        ]);

        if (statsRes?.ok) {
          const statsData = await statsRes.json();
          setGroupStats(statsData);
        }

        if (screensRes.ok) {
          const screensData = await screensRes.json();
          const activeScreens = (screensData.screens || [])
            .filter((s: any) => s.is_active)
            .sort((a: any, b: any) => {
              if (a.is_first && !b.is_first) return -1;
              if (!a.is_first && b.is_first) return 1;
              return (a.display_order || 0) - (b.display_order || 0) || a.title.localeCompare(b.title);
            });
          setScreens(activeScreens);

          if (isViewer && activeScreens.length > 0) {
            router.replace(`/tela/${activeScreens[0].id}`);
            return;
          }
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size={32} />
          <p className="text-gray-600">Carregando dashboards...</p>
        </div>
      </div>
    );
  }

  if (!loading && userRole === 'viewer' && screens.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center max-w-md">
          <LayoutDashboard className="w-16 h-16 mx-auto text-gray-200 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum dashboard disponível</h3>
          <p className="text-gray-500 text-sm">
            Ainda não há dashboards liberados para você. Entre em contato com o administrador do seu grupo.
          </p>
        </div>
      </div>
    );
  }

  if (userRole === 'viewer' && screens.length > 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size={32} />
          <p className="text-gray-600">Abrindo dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Banner de resumo do grupo */}
      {groupStats && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-slate-50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-slate-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">
              {groupStats.group.name} · Visão Geral
            </h2>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{groupStats.stats.users}</p>
                <p className="text-xs text-gray-500">Usuários</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <LayoutDashboard className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{groupStats.stats.screens}</p>
                <p className="text-xs text-gray-500">Telas</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-100 rounded-lg">
              <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
                <FileBarChart className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{groupStats.stats.reports}</p>
                <p className="text-xs text-gray-500">Relatórios</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lista de telas */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Dashboards</h2>
        {screens.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <LayoutDashboard className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Nenhum dashboard disponível</h3>
            <p className="text-gray-500 text-sm">
              Não há dashboards configurados para visualização.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {screens.map((screen) => (
                <li key={screen.id}>
                  <Link
                    href={`/tela/${screen.id}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                        <LayoutDashboard className="w-5 h-5 text-slate-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{screen.title || 'Sem título'}</p>
                        {screen.report?.name && (
                          <p className="text-xs text-gray-500">{screen.report.name}</p>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <MainLayout>
      <DashboardContent />
    </MainLayout>
  );
}
