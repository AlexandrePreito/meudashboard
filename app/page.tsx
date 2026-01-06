'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Loader2, 
  BarChart3, 
  Users, 
  Building2, 
  MessageSquare, 
  Bell, 
  Send, 
  Monitor, 
  RefreshCw,
  Bot
} from 'lucide-react';

interface UsageData {
  // Limites do plano
  plan_name: string;
  max_ai_questions_per_day: number;
  max_ai_alerts_per_month: number;
  max_whatsapp_messages_per_month: number;
  max_powerbi_screens: number;
  max_users: number;
  max_companies: number;
  max_daily_refreshes: number;
  
  // Uso atual
  ai_questions_today: number;
  ai_alerts_this_month: number;
  whatsapp_messages_this_month: number;
  powerbi_screens_count: number;
  users_count: number;
  companies_count: number;
  refreshes_today: number;
}

interface ConsumptionCard {
  title: string;
  icon: any;
  color: string;
  used: number;
  limit: number;
}

export default function HomePage() {
  const [loading, setLoading] = useState(true);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsageData() {
      try {
        const res = await fetch('/api/usage/dashboard');
        if (!res.ok) {
          throw new Error('Erro ao carregar dados');
        }
        const data = await res.json();
        setUsageData(data);
      } catch (err: any) {
        console.error('Erro:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchUsageData();
  }, []);

  function getProgressColor(percentage: number): string {
    if (percentage < 50) return 'bg-green-500';
    if (percentage < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  }

  function formatLimit(limit: number): string {
    return limit >= 999999 ? '∞' : limit.toString();
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </MainLayout>
    );
  }

  if (error || !usageData) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-2">Erro ao carregar dados</p>
            <p className="text-gray-500 text-sm">{error || 'Dados não disponíveis'}</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const consumptionCards: ConsumptionCard[] = [
    {
      title: 'Perguntas IA Hoje',
      icon: Bot,
      color: 'blue',
      used: usageData.ai_questions_today,
      limit: usageData.max_ai_questions_per_day
    },
    {
      title: 'Alertas do Mês',
      icon: Bell,
      color: 'yellow',
      used: usageData.ai_alerts_this_month,
      limit: usageData.max_ai_alerts_per_month
    },
    {
      title: 'Mensagens WhatsApp',
      icon: MessageSquare,
      color: 'green',
      used: usageData.whatsapp_messages_this_month,
      limit: usageData.max_whatsapp_messages_per_month
    },
    {
      title: 'Telas Power BI',
      icon: Monitor,
      color: 'purple',
      used: usageData.powerbi_screens_count,
      limit: usageData.max_powerbi_screens
    },
    {
      title: 'Usuários',
      icon: Users,
      color: 'indigo',
      used: usageData.users_count,
      limit: usageData.max_users
    },
    {
      title: 'Atualizações Hoje',
      icon: RefreshCw,
      color: 'cyan',
      used: usageData.refreshes_today,
      limit: usageData.max_daily_refreshes
    }
  ];

  const colorClasses: Record<string, { bg: string; text: string; progress: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', progress: 'bg-blue-500' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', progress: 'bg-yellow-500' },
    green: { bg: 'bg-green-100', text: 'text-green-600', progress: 'bg-green-500' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', progress: 'bg-purple-500' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', progress: 'bg-indigo-500' },
    cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600', progress: 'bg-cyan-500' }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Visão geral do seu plano e consumo</p>
        </div>

        {/* Card do Plano */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">Plano Atual</p>
              <h2 className="text-2xl font-bold text-gray-900">{usageData.plan_name}</h2>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl">
              <BarChart3 size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        {/* Grid de Cards de Consumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {consumptionCards.map((card) => {
            const Icon = card.icon;
            const colors = colorClasses[card.color];
            const percentage = card.limit >= 999999 
              ? 0 
              : Math.min((card.used / card.limit) * 100, 100);
            const progressColor = getProgressColor(percentage);

            return (
              <div
                key={card.title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${colors.bg}`}>
                    <Icon size={24} className={colors.text} />
                  </div>
                </div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">{card.title}</h3>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-2xl font-bold text-gray-900">{card.used}</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-lg text-gray-600">{formatLimit(card.limit)}</span>
                </div>
                {card.limit < 999999 && (
                  <>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className={`${progressColor} h-2 rounded-full transition-all duration-300`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      {percentage.toFixed(1)}% utilizado
                    </p>
                  </>
                )}
                {card.limit >= 999999 && (
                  <p className="text-xs text-gray-500">Ilimitado</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}
