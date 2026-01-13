'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import {
  Users,
  Building2,
  Code,
  Crown,
  MessageSquare,
  Sparkles,
  Bell,
  TrendingUp,
  Activity,
  Loader2,
  ArrowUpRight,
  Server
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalDevelopers: number;
  totalGroups: number;
  totalUsers: number;
  totalPlans: number;
  todayWhatsapp: number;
  todayAI: number;
  todayAlerts: number;
  monthWhatsapp: number;
  monthAI: number;
  monthAlerts: number;
  topDevelopers: {
    id: string;
    name: string;
    groups_count: number;
    users_count: number;
  }[];
  recentGroups: {
    id: string;
    name: string;
    developer_name: string;
    created_at: string;
  }[];
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalDevelopers: 0,
    totalGroups: 0,
    totalUsers: 0,
    totalPlans: 0,
    todayWhatsapp: 0,
    todayAI: 0,
    todayAlerts: 0,
    monthWhatsapp: 0,
    monthAI: 0,
    monthAlerts: 0,
    topDevelopers: [],
    recentGroups: []
  });

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/stats');
      
      if (res.status === 403) {
        router.push('/dashboard');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Erro ao carregar estatisticas:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Painel Administrativo</h1>
          <p className="text-gray-500 mt-1">Visao geral do sistema</p>
        </div>

        {/* Cards Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/admin/desenvolvedores" className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                  <Code className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Desenvolvedores</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalDevelopers}</p>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-400" />
            </div>
          </Link>

          <Link href="/admin/grupos" className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Grupos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalGroups}</p>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-400" />
            </div>
          </Link>

          <Link href="/admin/usuarios" className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Usuarios</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-400" />
            </div>
          </Link>

          <Link href="/admin/planos" className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Crown className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Planos Ativos</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalPlans}</p>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-gray-400" />
            </div>
          </Link>
        </div>

        {/* Consumo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Consumo Hoje */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Consumo Hoje
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <MessageSquare className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.todayWhatsapp.toLocaleString()}</p>
                <p className="text-xs text-gray-500">WhatsApp</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Sparkles className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.todayAI.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Creditos IA</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <Bell className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.todayAlerts.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Alertas</p>
              </div>
            </div>
          </div>

          {/* Consumo Mes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Consumo Este Mes
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <MessageSquare className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.monthWhatsapp.toLocaleString()}</p>
                <p className="text-xs text-gray-500">WhatsApp</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Sparkles className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.monthAI.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Creditos IA</p>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <Bell className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{stats.monthAlerts.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Alertas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Top Desenvolvedores e Grupos Recentes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Desenvolvedores */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Top Desenvolvedores</h3>
              <Link href="/admin/desenvolvedores" className="text-sm text-blue-600 hover:underline">
                Ver todos
              </Link>
            </div>
            {stats.topDevelopers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhum desenvolvedor cadastrado</p>
            ) : (
              <div className="space-y-3">
                {stats.topDevelopers.map((dev, idx) => (
                  <div key={dev.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900">{dev.name}</p>
                        <p className="text-xs text-gray-500">{dev.groups_count} grupos • {dev.users_count} usuarios</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grupos Recentes */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Grupos Recentes</h3>
              <Link href="/admin/grupos" className="text-sm text-blue-600 hover:underline">
                Ver todos
              </Link>
            </div>
            {stats.recentGroups.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhum grupo cadastrado</p>
            ) : (
              <div className="space-y-3">
                {stats.recentGroups.map((group) => (
                  <div key={group.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{group.name}</p>
                      <p className="text-xs text-gray-500">Dev: {group.developer_name}</p>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(group.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
