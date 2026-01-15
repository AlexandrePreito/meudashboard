'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import {
  Building2,
  Users,
  Monitor,
  Bell,
  MessageSquare,
  Sparkles,
  Zap,
  AlertCircle,
  ArrowRight,
  Loader2
} from 'lucide-react';

interface DashboardData {
  developer: {
    id: string;
    name: string;
    email: string;
    logo_url?: string;
    status: string;
  };
  plan: {
    name: string;
    max_groups: number;
    max_users: number;
    max_screens: number;
    max_alerts: number;
    max_whatsapp_per_day: number;
    max_ai_per_day: number;
    max_executions_per_day: number;
  } | null;
  stats: {
    groups: { used: number; limit: number };
    users: { used: number; limit: number };
    screens: { used: number; limit: number };
    alerts: { used: number; limit: number };
  };
  usage_today: {
    whatsapp: { used: number; limit: number };
    ai: { used: number; limit: number };
    executions: { used: number; limit: number };
  };
  groups: Array<{
    id: string;
    name: string;
    status: string;
    logo_url?: string;
    quotas: any;
    usage_today: {
      whatsapp: number;
      ai: number;
      executions: number;
    };
  }>;
}

function ProgressBar({ used, limit, color = 'blue' }: { used: number; limit: number; color?: string }) {
  const percentage = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isWarning = percentage >= 80;
  const isDanger = percentage >= 95;
  
  const barColor = isDanger ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : `bg-${color}-500`;
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium">{used.toLocaleString()}</span>
        <span className="text-gray-500">/ {limit.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${isDanger ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : 'bg-blue-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, used, limit, color }: { 
  icon: any; 
  label: string; 
  used: number; 
  limit: number;
  color: string;
}) {
  const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg bg-${color}-100 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 text-${color}-600`} />
        </div>
        <span className="text-gray-600 font-medium">{label}</span>
      </div>
      <ProgressBar used={used} limit={limit} color={color} />
      <p className="text-xs text-gray-500 mt-2">{percentage}% utilizado</p>
    </div>
  );
}

function UsageCard({ icon: Icon, label, used, limit, color, daily = false }: { 
  icon: any; 
  label: string; 
  used: number; 
  limit: number;
  color: string;
  daily?: boolean;
}) {
  const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;
  const isWarning = percentage >= 80;
  const isDanger = percentage >= 95;
  
  return (
    <div className={`bg-white rounded-xl border p-5 ${isDanger ? 'border-red-300 bg-red-50' : isWarning ? 'border-yellow-300 bg-yellow-50' : 'border-gray-200'}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${isDanger ? 'text-red-600' : isWarning ? 'text-yellow-600' : `text-${color}-600`}`} />
          <span className="font-medium text-gray-900">{label}</span>
        </div>
        {daily && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Hoje</span>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${isDanger ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-gray-900'}`}>
          {used.toLocaleString()}
        </span>
        <span className="text-gray-500">/ {limit.toLocaleString()}</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden mt-2">
        <div 
          className={`h-full transition-all duration-500 ${isDanger ? 'bg-red-500' : isWarning ? 'bg-yellow-500' : `bg-${color}-500`}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export default function DevDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      const res = await fetch('/api/dev/dashboard');
      
      if (res.status === 403) {
        router.push('/dashboard');
        return;
      }
      
      if (!res.ok) {
        throw new Error('Erro ao carregar dashboard');
      }
      
      const result = await res.json();
      setData(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </MainLayout>
    );
  }

  if (error || !data) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar</h2>
          <p className="text-gray-600 mb-4">{error || 'Não foi possível carregar o dashboard'}</p>
          <button
            onClick={loadDashboard}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {data.developer.name}
          </h1>
          <p className="text-gray-500 mt-1">
            Plano: {data.plan?.name || 'Sem plano'}
          </p>
        </div>

        {/* Uso Diário */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-3">Consumo de Hoje</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <UsageCard
              icon={MessageSquare}
              label="WhatsApp"
              used={data.usage_today.whatsapp.used}
              limit={data.usage_today.whatsapp.limit}
              color="green"
              daily
            />
            <UsageCard
              icon={Sparkles}
              label="Créditos IA"
              used={data.usage_today.ai.used}
              limit={data.usage_today.ai.limit}
              color="purple"
              daily
            />
            <UsageCard
              icon={Zap}
              label="Execuções de Alerta"
              used={data.usage_today.executions.used}
              limit={data.usage_today.executions.limit}
              color="orange"
              daily
            />
          </div>
        </div>

        {/* Recursos Fixos */}
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-3">Recursos do Plano</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Building2}
              label="Grupos"
              used={data.stats.groups.used}
              limit={data.stats.groups.limit}
              color="blue"
            />
            <StatCard
              icon={Users}
              label="Usuários"
              used={data.stats.users.used}
              limit={data.stats.users.limit}
              color="indigo"
            />
            <StatCard
              icon={Monitor}
              label="Telas"
              used={data.stats.screens.used}
              limit={data.stats.screens.limit}
              color="cyan"
            />
            <StatCard
              icon={Bell}
              label="Alertas"
              used={data.stats.alerts.used}
              limit={data.stats.alerts.limit}
              color="amber"
            />
          </div>
        </div>

        {/* Lista de Grupos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-gray-900">Seus Grupos</h2>
            <button
              onClick={() => router.push('/dev/groups')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
            >
              Ver todos
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          
          {data.groups.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-gray-900 font-medium mb-1">Nenhum grupo ainda</h3>
              <p className="text-gray-500 text-sm mb-4">Crie seu primeiro grupo para começar</p>
              <button
                onClick={() => router.push('/dev/groups/new')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Criar Grupo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.groups.slice(0, 6).map((group) => (
                <div
                  key={group.id}
                  onClick={() => router.push(`/dev/groups/${group.id}`)}
                  className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 mb-4">
                    {group.logo_url ? (
                      <div className="w-16 h-16 rounded-lg bg-gray-50 border border-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                        <img src={group.logo_url} alt={group.name} className="max-w-full max-h-full object-contain p-1" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{group.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full inline-block ${
                        group.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {group.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">WhatsApp hoje</span>
                      <span className="font-medium">{group.usage_today.whatsapp} / {group.quotas.whatsapp_per_day || '∞'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">IA hoje</span>
                      <span className="font-medium">{group.usage_today.ai} / {group.quotas.ai_per_day || '∞'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
