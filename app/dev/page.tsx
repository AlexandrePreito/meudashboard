'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import MainLayout from '@/components/layout/MainLayout';
import {
  FolderPlus,
  Users,
  LayoutDashboard,
  Database,
  Building2,
  ChevronRight,
  Loader2,
  Sparkles,
  Plus,
} from 'lucide-react';

interface DashboardStats {
  developer: {
    name: string;
    plan: string;
    isFree: boolean;
    createdAt: string;
  };
  stats: {
    groups: number;
    users: number;
    screens: number;
    connections: number;
    reports: number;
  };
  limits: {
    maxGroups: number;
    maxUsers: number;
    maxScreens: number;
  };
  recentGroups: Array<{
    id: string;
    name: string;
    slug: string;
    logo_url?: string | null;
    created_at: string;
    status: string;
    users_count: number;
  }>;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatDate(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function DevPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardStats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/dev/dashboard-stats', { credentials: 'include' })
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

  const { developer, stats, limits, recentGroups } = data;
  const greeting = getGreeting();

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header compacto */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {greeting}, {developer.name}! 👋
          </h1>
          <div className="flex items-center gap-2 mt-1.5">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium ${
                developer.isFree ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
              }`}
            >
              Plano {developer.plan}
            </span>
            <span className="text-sm text-slate-500">
              {stats.groups} de {limits.maxGroups} grupos
            </span>
          </div>
        </div>

        {/* Cards de métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={<FolderPlus className="w-5 h-5" />}
            value={stats.groups}
            label="Grupos"
            limit={limits.maxGroups}
            color="blue"
          />
          <MetricCard
            icon={<Users className="w-5 h-5" />}
            value={stats.users}
            label="Usuários"
            limit={limits.maxUsers}
            color="indigo"
          />
          <MetricCard
            icon={<LayoutDashboard className="w-5 h-5" />}
            value={stats.screens}
            label="Telas"
            limit={limits.maxScreens}
            color="violet"
          />
          <MetricCard
            icon={<Database className="w-5 h-5" />}
            value={stats.connections}
            label="Conexões"
            color="cyan"
          />
        </div>

        {/* Ações rápidas + Grupos recentes */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Ações Rápidas</h2>
            <div className="space-y-2">
            <QuickAction
              href="/dev/groups"
              icon={<Plus className="w-5 h-5" />}
              label="Novo Grupo"
              color="blue"
            />
            <QuickAction
              href="/dev/usuarios"
              icon={<Plus className="w-5 h-5" />}
              label="Novo Usuário"
              color="indigo"
            />
            <QuickAction
              href="/powerbi/telas"
              icon={<Plus className="w-5 h-5" />}
              label="Nova Tela"
              color="violet"
            />
            </div>
          </div>

          {/* Grupos recentes */}
          <div className="lg:col-span-2">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Grupos Recentes</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {recentGroups.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Building2 className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>Nenhum grupo ainda</p>
                <Link
                  href="/dev/groups"
                  className="inline-flex items-center gap-1.5 mt-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Criar primeiro grupo
                </Link>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {recentGroups.map((g) => (
                  <li key={g.id}>
                    <Link
                      href={`/dev/groups/${g.id}`}
                      className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {g.logo_url ? (
                          <img
                            src={g.logo_url}
                            alt={g.name}
                            className="w-10 h-10 rounded-lg object-contain bg-white border border-gray-100"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{g.name}</p>
                          <p className="text-xs text-gray-500">
                            {g.users_count} usuários · {formatDate(g.created_at)}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          g.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {g.status === 'active' ? 'Ativo' : g.status}
                      </span>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            </div>
          </div>
        </div>

        {/* Alerta upgrade (Free) — usa developer.isFree da API (fonte única de verdade) */}
        {developer.isFree && (
          <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Faça upgrade e desbloqueie</h3>
                  <p className="text-slate-500 text-sm mt-0.5">
                    WhatsApp, Alertas e IA disponíveis no plano Pro
                  </p>
                </div>
              </div>
              <a
                href="https://wa.me/5562982289559?text=Olá!%20Tenho%20interesse%20em%20fazer%20upgrade%20do%20meu%20plano%20no%20MeuDashboard."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-xl transition-colors text-sm"
              >
                <Sparkles className="w-4 h-4" />
                Fazer upgrade
              </a>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

const colorClasses: Record<string, { bg: string; icon: string; bar: string }> = {
  blue: { bg: 'bg-blue-100', icon: 'text-blue-600', bar: 'bg-blue-500' },
  indigo: { bg: 'bg-indigo-100', icon: 'text-indigo-600', bar: 'bg-indigo-500' },
  violet: { bg: 'bg-violet-100', icon: 'text-violet-600', bar: 'bg-violet-500' },
  cyan: { bg: 'bg-cyan-100', icon: 'text-cyan-600', bar: 'bg-cyan-500' },
};

function MetricCard({
  icon,
  value,
  label,
  limit,
  color = 'blue',
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  limit?: number;
  color?: keyof typeof colorClasses;
}) {
  const percent = limit ? Math.min(100, (value / limit) * 100) : 0;
  const c = colorClasses[color] || colorClasses.blue;
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`w-9 h-9 rounded-lg ${c.bg} flex items-center justify-center ${c.icon}`}>
          {icon}
        </div>
        {limit !== undefined && (
          <span className="text-xs text-slate-500">/ {limit}</span>
        )}
      </div>
      <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
      {limit !== undefined && (
        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${c.bar} rounded-full transition-all duration-500`}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}

const quickActionColors: Record<string, { bg: string; hover: string; icon: string }> = {
  blue: { bg: 'bg-blue-50', hover: 'group-hover:bg-blue-100', icon: 'text-blue-600' },
  indigo: { bg: 'bg-indigo-50', hover: 'group-hover:bg-indigo-100', icon: 'text-indigo-600' },
  violet: { bg: 'bg-violet-50', hover: 'group-hover:bg-violet-100', icon: 'text-violet-600' },
};

function QuickAction({
  href,
  icon,
  label,
  color = 'blue',
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  color?: keyof typeof quickActionColors;
}) {
  const c = quickActionColors[color] || quickActionColors.blue;
  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-white hover:border-blue-200 hover:shadow-sm transition-all group"
    >
      <div className={`w-9 h-9 rounded-lg ${c.bg} ${c.hover} flex items-center justify-center ${c.icon}`}>
        {icon}
      </div>
      <span className="font-medium text-slate-700 group-hover:text-slate-900 text-sm">{label}</span>
    </Link>
  );
}
