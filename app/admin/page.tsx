'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import {
  Building2,
  FolderPlus,
  Users,
  LayoutDashboard,
  Lock,
  Loader2,
  ChevronRight,
  UserPlus,
} from 'lucide-react';

interface AdminDashboardStats {
  stats: {
    developers: number;
    groups: number;
    users: number;
    screens: number;
  };
  plans: Record<string, number>;
  newDevelopersLast7Days: number;
  recentDevelopers: Array<{
    id: string;
    name: string;
    logo_url?: string | null;
    plan_name: string;
    groups_count: number;
    created_at: string;
  }>;
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AdminDashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/dashboard-stats', { credentials: 'include' })
      .then((res) => {
        if (res.status === 401) {
          router.push('/login');
          return null;
        }
        if (res.status === 403) {
          router.push('/dashboard');
          return null;
        }
        return res.json();
      })
      .then((json) => {
        if (json && !json.error) setData(json);
        else if (json?.error) setError(json.error);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (error || !data) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">{error || 'Erro ao carregar dados'}</p>
        </div>
      </MainLayout>
    );
  }

  const { stats, plans, newDevelopersLast7Days, recentDevelopers } = data;
  const planEntries = Object.entries(plans);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header compacto */}
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <Lock className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Painel Master</h1>
              <p className="text-sm text-slate-500">Visão geral da plataforma</p>
            </div>
          </div>
        </div>

        {/* Cards de métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<Building2 className="w-5 h-5" />} value={stats.developers} label="Desenvolvedores" color="blue" />
          <StatCard icon={<FolderPlus className="w-5 h-5" />} value={stats.groups} label="Grupos" color="indigo" />
          <StatCard icon={<Users className="w-5 h-5" />} value={stats.users} label="Usuários" color="violet" />
          <StatCard icon={<LayoutDashboard className="w-5 h-5" />} value={stats.screens} label="Telas" color="cyan" />
        </div>

        {/* Planos + Novos cadastros */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Planos</h2>
            <ul className="space-y-2">
              {planEntries.length === 0 ? (
                <li className="text-sm text-gray-500">Nenhum dado</li>
              ) : (
                planEntries.map(([name, count]) => (
                  <li key={name} className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        name.toLowerCase() === 'free' ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                    />
                    <span className="text-sm text-gray-700">{count} {name}</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Novos Cadastros</h2>
            <p className="text-2xl font-bold text-gray-900">+{newDevelopersLast7Days}</p>
            <p className="text-sm text-gray-500 mt-1">developers nos últimos 7 dias</p>
          </div>
        </div>

        {/* Developers recentes */}
        <div>
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Desenvolvedores Recentes</h2>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <ul className="divide-y divide-gray-100">
              {recentDevelopers.length === 0 ? (
                <li className="p-8 text-center text-gray-500">
                  Nenhum desenvolvedor cadastrado
                </li>
              ) : (
                recentDevelopers.map((dev) => (
                  <li key={dev.id}>
                    <Link
                      href="/admin/desenvolvedores"
                      className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {dev.logo_url ? (
                          <img
                            src={dev.logo_url}
                            alt={dev.name}
                            className="w-10 h-10 rounded-xl object-contain bg-white border border-gray-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-slate-500" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900 flex items-center gap-2">
                            {dev.name}
                            {dev.plan_name && (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  dev.plan_name === 'Free'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {dev.plan_name}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500">
                            {dev.groups_count} grupos · {formatDate(dev.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>

        {/* Ações rápidas */}
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/desenvolvedores"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Gerenciar desenvolvedores
          </Link>
          <Link
            href="/admin/grupos"
            className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            Gerenciar grupos
          </Link>
        </div>
      </div>
    </MainLayout>
  );
}

const statColors: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-600',
  indigo: 'bg-indigo-100 text-indigo-600',
  violet: 'bg-violet-100 text-violet-600',
  cyan: 'bg-cyan-100 text-cyan-600',
};

function StatCard({
  icon,
  value,
  label,
  color = 'blue',
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  color?: keyof typeof statColors;
}) {
  const c = statColors[color] || statColors.blue;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className={`w-9 h-9 rounded-lg ${c} flex items-center justify-center`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
