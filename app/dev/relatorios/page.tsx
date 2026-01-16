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
  Download,
  X,
  Clock,
  MessageSquare
} from 'lucide-react';

interface AccessData {
  accessByDay: Array<{ date: string; count: number }>;
  userSessions: Array<{ 
    id: string;
    userId: string; 
    userName: string; 
    accessDate: string;
    module: string;
    actionType: string;
    description: string | null;
    entityType: string | null;
    metadata: any;
  }>;
  accessByGroup: Array<{ 
    groupId: string; 
    groupName: string; 
    count: number;
    lastAccess: string;
  }>;
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
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const itemsPerPage = 30;

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
      setCurrentPage(1); // Resetar página quando dados mudarem

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
                    <p className="text-2xl font-bold text-gray-900">{new Set(data.userSessions.map(s => s.userId)).size}</p>
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
                <div className="h-64 relative">
                  <svg className="w-full h-full" viewBox="0 0 1000 250" preserveAspectRatio="none">
                    {/* Linhas de grid horizontais */}
                    {[0, 25, 50, 75, 100].map((y) => (
                      <line
                        key={y}
                        x1="0"
                        y1={250 - (y * 2.5)}
                        x2="1000"
                        y2={250 - (y * 2.5)}
                        stroke="#e5e7eb"
                        strokeWidth="1"
                      />
                    ))}
                    
                    {/* Linha do gráfico */}
                    <polyline
                      points={data.accessByDay.map((day, i) => {
                        const x = data.accessByDay.length > 1 ? (i / (data.accessByDay.length - 1)) * 1000 : 500;
                        const maxCount = getMaxCount(data.accessByDay);
                        const y = 250 - ((day.count / maxCount) * 230);
                        return `${x},${y}`;
                      }).join(' ')}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    
                    {/* Área preenchida */}
                    <polygon
                      points={`0,250 ${data.accessByDay.map((day, i) => {
                        const x = data.accessByDay.length > 1 ? (i / (data.accessByDay.length - 1)) * 1000 : 500;
                        const maxCount = getMaxCount(data.accessByDay);
                        const y = 250 - ((day.count / maxCount) * 230);
                        return `${x},${y}`;
                      }).join(' ')} 1000,250`}
                      fill="url(#gradient)"
                      opacity="0.2"
                    />
                    
                    {/* Rótulos de texto */}
                    {data.accessByDay.map((day, i) => {
                      const x = data.accessByDay.length > 1 ? (i / (data.accessByDay.length - 1)) * 1000 : 500;
                      const maxCount = getMaxCount(data.accessByDay);
                      const y = 250 - ((day.count / maxCount) * 230);
                      return (
                        <g key={i}>
                          <text
                            x={x}
                            y={y - 8}
                            fontSize="11"
                            fill="#3b82f6"
                            textAnchor="middle"
                            fontWeight="600"
                          >
                            {day.count}
                          </text>
                          <title>{formatDate(day.date)}: {day.count} acessos</title>
                        </g>
                      );
                    })}
                    
                    {/* Gradiente */}
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* Labels do eixo X */}
                  <div className="flex justify-between mt-2 px-2">
                    {data.accessByDay.filter((_, i) => i % Math.ceil(data.accessByDay.length / 7) === 0).map((day) => (
                      <span key={day.date} className="text-xs text-gray-500">
                        {formatDate(day.date)}
                      </span>
                    ))}
                  </div>
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
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {group.groupName}
                              </p>
                              <p className="text-xs text-gray-500">
                                Último acesso: {new Date(group.lastAccess).toLocaleString('pt-BR')}
                              </p>
                            </div>
                            <span className="text-sm font-semibold text-gray-900 ml-2">
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

              {/* Sessões de Usuários */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Últimas Sessões</h2>
                  </div>
                  <span className="text-sm text-gray-500">
                    {data.userSessions.length} registros
                  </span>
                </div>

                {data.userSessions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhum dado disponível</p>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Usuário</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Data/Hora</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Módulo</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {data.userSessions
                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                            .map((session) => (
                              <tr 
                                key={session.id} 
                                onClick={() => setSelectedSession(session)}
                                className="hover:bg-gray-50 cursor-pointer"
                              >
                                <td className="px-3 py-2 text-gray-900">{session.userName}</td>
                                <td className="px-3 py-2 text-gray-600">
                                  {new Date(session.accessDate).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </td>
                                <td className="px-3 py-2">
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                    {session.module}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-gray-600">{session.actionType}</td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Paginação */}
                    {data.userSessions.length > itemsPerPage && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <div className="text-sm text-gray-500">
                          Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, data.userSessions.length)} de {data.userSessions.length}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            Anterior
                          </button>
                          <button
                            onClick={() => setCurrentPage(p => Math.min(Math.ceil(data.userSessions.length / itemsPerPage), p + 1))}
                            disabled={currentPage >= Math.ceil(data.userSessions.length / itemsPerPage)}
                            className="px-3 py-1 border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                          >
                            Próxima
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </>
        ) : null}
      </div>

      {/* Sidebar de Detalhes */}
      {selectedSession && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSelectedSession(null)}
          />
          
          {/* Sidebar */}
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-white shadow-2xl z-50 flex flex-col">
            {/* Header com cor do developer */}
            <div className="px-4 h-16 flex items-center justify-between text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
              <div className="flex items-center gap-2">
                <span className="font-semibold">Detalhes da Sessão</span>
              </div>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-2 rounded-lg transition-colors"
                style={{ 
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Usuário */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Users size={16} />
                  Usuário
                </h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900">{selectedSession.userName}</p>
                </div>
              </div>

              {/* Data e Hora */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar size={16} />
                  Data e Hora
                </h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-sm font-medium">
                      {new Date(selectedSession.accessDate).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Página Acessada */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Página Acessada</h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="inline-flex px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                    {selectedSession.module || 'dashboard'}
                  </span>
                </div>
              </div>

              {/* Ação */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Ação</h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="inline-block px-2 py-1 rounded text-xs bg-gray-200 text-gray-700 font-medium">
                    {selectedSession.actionType || 'page_view'}
                  </span>
                </div>
              </div>

              {/* Tempo da Sessão */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Tempo da Sessão</h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700">
                    {(() => {
                      // Calcular tempo baseado em logs próximos do mesmo usuário
                      const sessionTime = (data?.userSessions || [])
                        .filter(s => s.userId === selectedSession.userId)
                        .sort((a, b) => new Date(a.accessDate).getTime() - new Date(b.accessDate).getTime());
                      
                      const currentIndex = sessionTime.findIndex(s => s.id === selectedSession.id);
                      if (currentIndex < sessionTime.length - 1) {
                        const nextSession = sessionTime[currentIndex + 1];
                        const diff = new Date(nextSession.accessDate).getTime() - new Date(selectedSession.accessDate).getTime();
                        const minutes = Math.floor(diff / 60000);
                        const seconds = Math.floor((diff % 60000) / 1000);
                        if (minutes > 0) {
                          return `${minutes} min ${seconds} seg`;
                        }
                        return `${seconds} seg`;
                      }
                      return 'Sessão ativa';
                    })()}
                  </p>
                </div>
              </div>

              {/* Tempo no Sistema */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Tempo no Sistema</h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-700">
                    {(() => {
                      // Calcular tempo total no sistema (primeiro acesso até último)
                      const userSessions = (data?.userSessions || [])
                        .filter(s => s.userId === selectedSession.userId)
                        .sort((a, b) => new Date(a.accessDate).getTime() - new Date(b.accessDate).getTime());
                      
                      if (userSessions.length > 1) {
                        const firstAccess = new Date(userSessions[0].accessDate);
                        const lastAccess = new Date(userSessions[userSessions.length - 1].accessDate);
                        const diff = lastAccess.getTime() - firstAccess.getTime();
                        const hours = Math.floor(diff / 3600000);
                        const minutes = Math.floor((diff % 3600000) / 60000);
                        if (hours > 0) {
                          return `${hours}h ${minutes}min`;
                        }
                        return `${minutes}min`;
                      }
                      return 'Primeira sessão';
                    })()}
                  </p>
                </div>
              </div>

              {/* Descrição */}
              {selectedSession.description && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <MessageSquare size={16} />
                    Descrição
                  </h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                      {selectedSession.description}
                    </p>
                  </div>
                </div>
              )}

              {/* Tipo de Entidade */}
              {selectedSession.entityType && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Tipo de Entidade</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-900">{selectedSession.entityType}</p>
                  </div>
                </div>
              )}

              {/* Metadata */}
              {selectedSession.metadata && Object.keys(selectedSession.metadata).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Informações Adicionais</h3>
                  <div className="bg-gray-50 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                    <pre>{JSON.stringify(selectedSession.metadata, null, 2)}</pre>
                  </div>
                </div>
              )}

              {/* ID da Sessão */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">ID da Sessão</h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-mono text-gray-600 break-all">{selectedSession.id}</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </MainLayout>
  );
}
