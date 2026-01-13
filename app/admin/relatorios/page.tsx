'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import {
  BarChart3,
  Loader2,
  MessageSquare,
  Brain,
  Bell,
  Calendar,
  TrendingUp,
  Download,
  Filter,
  Building2,
  Code
} from 'lucide-react';

interface DailyUsage {
  date: string;
  whatsapp: number;
  ai: number;
  alerts: number;
}

interface DeveloperUsage {
  id: string;
  name: string;
  whatsapp: number;
  ai: number;
  alerts: number;
}

interface GroupUsage {
  id: string;
  name: string;
  developer_name: string;
  whatsapp: number;
  ai: number;
  alerts: number;
}

export default function AdminRelatoriosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');
  const [dailyUsage, setDailyUsage] = useState<DailyUsage[]>([]);
  const [developerUsage, setDeveloperUsage] = useState<DeveloperUsage[]>([]);
  const [groupUsage, setGroupUsage] = useState<GroupUsage[]>([]);
  const [totals, setTotals] = useState({ whatsapp: 0, ai: 0, alerts: 0 });

  useEffect(() => {
    loadData();
  }, [period]);

  async function loadData() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/reports?days=${period}`);
      
      if (res.status === 403) {
        router.push('/dashboard');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setDailyUsage(data.dailyUsage || []);
        setDeveloperUsage(data.developerUsage || []);
        setGroupUsage(data.groupUsage || []);
        setTotals(data.totals || { whatsapp: 0, ai: 0, alerts: 0 });
      }
    } catch (error) {
      console.error('Erro ao carregar relatorios:', error);
    } finally {
      setLoading(false);
    }
  }

  const maxDaily = Math.max(...dailyUsage.map(d => d.whatsapp + d.ai + d.alerts), 1);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatorios de Consumo</h1>
            <p className="text-gray-500 mt-1">Visao global do consumo do sistema</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="7">Ultimos 7 dias</option>
              <option value="15">Ultimos 15 dias</option>
              <option value="30">Ultimos 30 dias</option>
              <option value="60">Ultimos 60 dias</option>
              <option value="90">Ultimos 90 dias</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Cards de Totais */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <MessageSquare className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">WhatsApp</p>
                    <p className="text-2xl font-bold text-gray-900">{totals.whatsapp.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Brain className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Creditos IA</p>
                    <p className="text-2xl font-bold text-gray-900">{totals.ai.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Bell className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Alertas</p>
                    <p className="text-2xl font-bold text-gray-900">{totals.alerts.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Grafico de Consumo Diario */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Consumo Diario
              </h2>
              {dailyUsage.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum dado no periodo</p>
              ) : (
                <div className="space-y-2">
                  {dailyUsage.slice(-15).map((day) => (
                    <div key={day.date} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-20">
                        {new Date(day.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </span>
                      <div className="flex-1 flex gap-1 h-6">
                        {day.whatsapp > 0 && (
                          <div
                            className="bg-green-500 rounded-sm"
                            style={{ width: `${(day.whatsapp / maxDaily) * 100}%` }}
                            title={`WhatsApp: ${day.whatsapp}`}
                          />
                        )}
                        {day.ai > 0 && (
                          <div
                            className="bg-purple-500 rounded-sm"
                            style={{ width: `${(day.ai / maxDaily) * 100}%` }}
                            title={`IA: ${day.ai}`}
                          />
                        )}
                        {day.alerts > 0 && (
                          <div
                            className="bg-amber-500 rounded-sm"
                            style={{ width: `${(day.alerts / maxDaily) * 100}%` }}
                            title={`Alertas: ${day.alerts}`}
                          />
                        )}
                      </div>
                      <span className="text-xs text-gray-700 w-16 text-right">
                        {day.whatsapp + day.ai + day.alerts}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-sm" />
                      <span className="text-xs text-gray-600">WhatsApp</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded-sm" />
                      <span className="text-xs text-gray-600">IA</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-amber-500 rounded-sm" />
                      <span className="text-xs text-gray-600">Alertas</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Consumo por Desenvolvedor */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Code className="w-5 h-5 text-purple-600" />
                Consumo por Desenvolvedor
              </h2>
              {developerUsage.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum dado no periodo</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Desenvolvedor</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">WhatsApp</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">IA</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Alertas</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {developerUsage.map((dev) => (
                        <tr key={dev.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Code className="w-4 h-4 text-purple-500" />
                              <span className="font-medium text-gray-900">{dev.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-900">{dev.whatsapp.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center text-gray-900">{dev.ai.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center text-gray-900">{dev.alerts.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center font-medium text-gray-900">
                            {(dev.whatsapp + dev.ai + dev.alerts).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Consumo por Grupo */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Consumo por Grupo
              </h2>
              {groupUsage.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum dado no periodo</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Grupo</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Desenvolvedor</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">WhatsApp</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">IA</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Alertas</th>
                        <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {groupUsage.map((group) => (
                        <tr key={group.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900">{group.name}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <Code className="w-3 h-3 text-purple-500" />
                              <span className="text-sm text-gray-600">{group.developer_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-900">{group.whatsapp.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center text-gray-900">{group.ai.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center text-gray-900">{group.alerts.toLocaleString()}</td>
                          <td className="px-4 py-3 text-center font-medium text-gray-900">
                            {(group.whatsapp + group.ai + group.alerts).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
