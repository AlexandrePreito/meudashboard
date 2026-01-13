'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import {
  BarChart3,
  Users,
  Building2,
  Calendar,
  Filter,
  Loader2,
  TrendingUp,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  Download
} from 'lucide-react';

interface AccessData {
  accessByDay: Array<{ date: string; count: number }>;
  accessByUser: Array<{ userId: string; userName: string; count: number }>;
  accessByGroup: Array<{ groupId: string; groupName: string; count: number }>;
  totalAccess: number;
}

interface Group {
  id: string;
  name: string;
}

type PeriodType = 'today' | '7days' | '30days' | 'month' | 'custom';

export default function DevRelatoriosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AccessData | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [error, setError] = useState('');

  // Filtros
  const [periodType, setPeriodType] = useState<PeriodType>('30days');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('all');

  // Dados comparativos
  const [previousPeriodTotal, setPreviousPeriodTotal] = useState(0);

  useEffect(() => {
    loadGroups();
  }, []);

  useEffect(() => {
    loadData();
  }, [periodType, selectedMonth, startDate, endDate, selectedGroup]);

  async function loadGroups() {
    try {
      const res = await fetch('/api/dev/groups');
      if (res.ok) {
        const result = await res.json();
        setGroups(result.groups || []);
      }
    } catch (err) {
      console.error('Erro ao carregar grupos:', err);
    }
  }

  function getDateRange(): { start: string; end: string } {
    const today = new Date();
    let start: Date;
    let end: Date = today;

    switch (periodType) {
      case 'today':
        start = today;
        break;
      case '7days':
        start = new Date(today);
        start.setDate(start.getDate() - 6);
        break;
      case '30days':
        start = new Date(today);
        start.setDate(start.getDate() - 29);
        break;
      case 'month':
        if (selectedMonth) {
          const [year, month] = selectedMonth.split('-').map(Number);
          start = new Date(year, month - 1, 1);
          end = new Date(year, month, 0); // Último dia do mês
        } else {
          start = new Date(today.getFullYear(), today.getMonth(), 1);
          end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }
        break;
      case 'custom':
        start = startDate ? new Date(startDate) : new Date(today.setDate(today.getDate() - 29));
        end = endDate ? new Date(endDate) : new Date();
        break;
      default:
        start = new Date(today);
        start.setDate(start.getDate() - 29);
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }

  async function loadData() {
    try {
      setLoading(true);
      setError('');

      const { start, end } = getDateRange();

      const params = new URLSearchParams({
        start_date: start,
        end_date: end,
      });

      if (selectedGroup !== 'all') {
        params.append('group_id', selectedGroup);
      }

      const res = await fetch(`/api/dev/access-logs?${params}`);

      if (res.status === 403) {
        router.push('/dashboard');
        return;
      }

      if (!res.ok) {
        throw new Error('Erro ao carregar dados');
      }

      const result = await res.json();
      setData(result);

      // Calcular período anterior para comparação
      const daysDiff = Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - daysDiff);
      const prevEnd = new Date(start);
      prevEnd.setDate(prevEnd.getDate() - 1);

      const prevParams = new URLSearchParams({
        start_date: prevStart.toISOString().split('T')[0],
        end_date: prevEnd.toISOString().split('T')[0],
      });
      if (selectedGroup !== 'all') {
        prevParams.append('group_id', selectedGroup);
      }

      const prevRes = await fetch(`/api/dev/access-logs?${prevParams}`);
      if (prevRes.ok) {
        const prevResult = await prevRes.json();
        setPreviousPeriodTotal(prevResult.totalAccess || 0);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function getPercentageChange() {
    if (!data || previousPeriodTotal === 0) return null;
    const change = ((data.totalAccess - previousPeriodTotal) / previousPeriodTotal) * 100;
    return change;
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }

  function getMaxCount(items: Array<{ count: number }>) {
    return Math.max(...items.map(i => i.count), 1);
  }

  // Gerar lista de meses para o select
  function getMonthOptions() {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
    }
    return options;
  }

  const percentageChange = getPercentageChange();

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Relatórios de Acessos</h1>
            <p className="text-gray-500 mt-1">
              Acompanhe a frequência de acessos dos seus grupos e usuários
            </p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="font-medium text-gray-700">Filtros</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Período */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as PeriodType)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Hoje</option>
                <option value="7days">Últimos 7 dias</option>
                <option value="30days">Últimos 30 dias</option>
                <option value="month">Mês específico</option>
                <option value="custom">Período personalizado</option>
              </select>
            </div>

            {/* Mês específico */}
            {periodType === 'month' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {getMonthOptions().map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Datas customizadas */}
            {periodType === 'custom' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {/* Grupo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grupo</label>
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os grupos</option>
                {groups.map(group => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        ) : data ? (
          <>
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total de Acessos */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Eye className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total de Acessos</p>
                      <p className="text-2xl font-bold text-gray-900">{data.totalAccess.toLocaleString()}</p>
                    </div>
                  </div>
                  {percentageChange !== null && (
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
                      percentageChange >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {percentageChange >= 0 ? (
                        <ArrowUpRight className="w-4 h-4" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4" />
                      )}
                      {Math.abs(percentageChange).toFixed(1)}%
                    </div>
                  )}
                </div>
              </div>

              {/* Grupos Ativos */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Grupos com Acessos</p>
                    <p className="text-2xl font-bold text-gray-900">{data.accessByGroup.length}</p>
                  </div>
                </div>
              </div>

              {/* Usuários Ativos */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <Users className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Usuários Ativos</p>
                    <p className="text-2xl font-bold text-gray-900">{data.accessByUser.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfico de Acessos por Dia */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-semibold text-gray-900">Acessos por Dia</h2>
              </div>

              {data.accessByDay.length === 0 ? (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  Nenhum acesso no período selecionado
                </div>
              ) : (
                <div className="h-64 flex items-end gap-1">
                  {data.accessByDay.map((day, index) => {
                    const maxCount = getMaxCount(data.accessByDay);
                    const height = (day.count / maxCount) * 100;
                    return (
                      <div
                        key={day.date}
                        className="flex-1 flex flex-col items-center gap-1 group"
                      >
                        <div className="relative w-full flex justify-center">
                          <div
                            className="w-full max-w-8 bg-blue-500 rounded-t hover:bg-blue-600 transition-colors cursor-pointer"
                            style={{ height: `${Math.max(height, 2)}%`, minHeight: '4px' }}
                            title={`${day.date}: ${day.count} acessos`}
                          />
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                            {day.count} acessos
                          </div>
                        </div>
                        <span className="text-xs text-gray-500 transform -rotate-45 origin-top-left mt-1">
                          {formatDate(day.date)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Grid de Tabelas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Acessos por Grupo */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Building2 className="w-5 h-5 text-purple-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Acessos por Grupo</h2>
                </div>

                {data.accessByGroup.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhum dado disponível</p>
                ) : (
                  <div className="space-y-3">
                    {data.accessByGroup.map((group, index) => {
                      const maxCount = getMaxCount(data.accessByGroup);
                      const percentage = (group.count / maxCount) * 100;
                      return (
                        <div key={group.groupId} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900 truncate flex-1">
                              {group.groupName}
                            </span>
                            <span className="text-sm text-gray-600 ml-2">
                              {group.count.toLocaleString()}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Acessos por Usuário */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Top 10 Usuários</h2>
                </div>

                {data.accessByUser.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhum dado disponível</p>
                ) : (
                  <div className="space-y-3">
                    {data.accessByUser.map((user, index) => {
                      const maxCount = getMaxCount(data.accessByUser);
                      const percentage = (user.count / maxCount) * 100;
                      return (
                        <div key={user.userId} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                                {index + 1}
                              </span>
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {user.userName}
                              </span>
                            </div>
                            <span className="text-sm text-gray-600 ml-2">
                              {user.count.toLocaleString()}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden ml-7">
                            <div
                              className="h-full bg-green-500 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>
    </MainLayout>
  );
}
