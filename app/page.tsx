'use client';

import MainLayout from '@/components/layout/MainLayout';
import { BarChart3, Users, Bell, MessageSquare } from 'lucide-react';

const stats = [
  { title: 'Dashboards Ativos', value: '12', icon: BarChart3, color: 'blue', change: '+12%' },
  { title: 'Usuários', value: '48', icon: Users, color: 'purple', change: '+5%' },
  { title: 'Alertas Hoje', value: '5', icon: Bell, color: 'orange', change: '+3' },
  { title: 'Consultas IA', value: '156', icon: MessageSquare, color: 'cyan', change: '+28%' },
];

const colorClasses: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600' },
  cyan: { bg: 'bg-cyan-100', text: 'text-cyan-600' },
};

export default function HomePage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bem-vindo ao MeuDashboard</h1>
          <p className="text-gray-500">Seu sistema de Business Intelligence</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const colors = colorClasses[stat.color];
            return (
              <div
                key={stat.title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${colors.bg}`}>
                    <Icon size={24} className={colors.text} />
                  </div>
                  <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">
                    {stat.change}
                  </span>
                </div>
                <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
                <p className="text-gray-500 text-sm">{stat.title}</p>
              </div>
            );
          })}
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Área de Dashboards</h2>
          <div className="h-64 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-200">
            <div className="text-center">
              <BarChart3 size={48} className="mx-auto text-gray-300 mb-2" />
              <p className="text-gray-400">Selecione uma tela no menu lateral</p>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
