'use client';

import { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Building2, Users, MonitorPlay, RefreshCw, MessageCircle, Bell } from 'lucide-react';

export default function DeveloperPlanPage() {
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/user/groups')
      .then(res => res.json())
      .then(data => {
        if (data.developer) {
          setPlan({
            max_powerbi_screens: data.developer.max_powerbi_screens || 10,
            max_users: data.developer.max_users || 50,
            max_daily_refreshes: data.developer.max_daily_refreshes || 20,
            max_companies: data.developer.max_companies || 5,
            max_chat_messages_per_day: data.developer.max_chat_messages_per_day || 1000,
            max_alerts: data.developer.max_alerts || 20
          });
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao carregar plano:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">Carregando...</div>
        </div>
      </MainLayout>
    );
  }

  if (!plan) {
    return (
      <MainLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">Plano não encontrado</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  const items = [
    {
      icon: MonitorPlay,
      label: 'Telas Power BI',
      value: plan.max_powerbi_screens,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: Users,
      label: 'Usuários Total',
      value: plan.max_users,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50'
    },
    {
      icon: RefreshCw,
      label: 'Atualizações/Dia',
      value: plan.max_daily_refreshes,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      icon: Building2,
      label: 'Grupos',
      value: plan.max_companies,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: MessageCircle,
      label: 'Mensagens Chat/Dia',
      value: plan.max_chat_messages_per_day,
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    },
    {
      icon: Bell,
      label: 'Alertas',
      value: plan.max_alerts,
      color: 'text-red-600',
      bgColor: 'bg-red-50'
    }
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Meu Plano</h1>
          <p className="text-gray-500 mt-1">
            Limites disponíveis para sua conta de desenvolvedor
          </p>
        </div>

        {/* Grid de cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div 
              key={item.label} 
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${item.bgColor}`}>
                  <item.icon className={`w-6 h-6 ${item.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600 mb-1">{item.label}</p>
                  <p className="text-3xl font-bold text-gray-900">{item.value.toLocaleString('pt-BR')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Nota informativa */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 <strong>Nota:</strong> Para aumentar seus limites, entre em contato com o administrador do sistema.
          </p>
        </div>
      </div>
    </MainLayout>
  );
}
