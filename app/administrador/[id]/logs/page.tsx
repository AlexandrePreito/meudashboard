'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import {
  FileText,
  Search,
  Filter,
  RefreshCw,
  User,
  Clock,
  Activity,
  MessageSquare,
  BarChart3,
  Bell,
  Settings,
  LogIn,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  X
} from 'lucide-react';

interface Log {
  id: string;
  user_id: string;
  action_type: string;
  module: string;
  description: string | null;
  entity_type: string | null;
  ip_address: string | null;
  created_at: string;
  user: { id: string; full_name: string; email: string; avatar_url?: string } | null;
}

interface UsageSummary {
  user_id: string;
  usage_date: string;
  total_minutes_online: number;
  login_count: number;
  total_actions: number;
}

interface GroupUser {
  id: string;
  email: string;
  full_name: string;
}

const ACTION_LABELS: Record<string, string> = {
  login: 'Login',
  logout: 'Logout',
  create: 'Criação',
  update: 'Atualização',
  delete: 'Exclusão',
  view: 'Visualização',
  query: 'Consulta',
  alert: 'Alerta',
  message: 'Mensagem',
  refresh: 'Atualização',
  access: 'Acesso'
};

const MODULE_LABELS: Record<string, string> = {
  auth: 'Autenticação',
  powerbi: 'Power BI',
  whatsapp: 'WhatsApp',
  alertas: 'Alertas',
  chat_ia: 'Chat IA',
  config: 'Configurações',
  dashboard: 'Dashboard',
  screens: 'Telas'
};

const MODULE_ICONS: Record<string, any> = {
  auth: LogIn,
  powerbi: BarChart3,
  whatsapp: MessageSquare,
  alertas: Bell,
  chat_ia: MessageSquare,
  config: Settings,
  dashboard: Activity,
  screens: BarChart3
};

export default function AdminLogsPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [logs, setLogs] = useState<Log[]>([]);
  const [usageSummary, setUsageSummary] = useState<UsageSummary[]>([]);
  const [users, setUsers] = useState<GroupUser[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;
  
  // Filtros
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<'today' | 'month' | 'period' | 'all'>('month');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  // Inicializar datas no primeiro carregamento
  useEffect(() => {
    if (!groupId) return;
    
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Inicializar com "Este Mês" por padrão para mostrar mais logs
    if (!dateFrom && !dateTo) {
      setDateFrom(firstDayOfMonth.toISOString().split('T')[0]);
      setDateTo(today.toISOString().split('T')[0]);
    }
  }, [groupId]);

  // Aplicar filtro de data quando mudar
  useEffect(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    switch (dateFilter) {
      case 'today':
        const todayStr = today.toISOString().split('T')[0];
        setDateFrom(todayStr);
        setDateTo(todayStr);
        break;
      case 'month':
        setDateFrom(firstDayOfMonth.toISOString().split('T')[0]);
        setDateTo(today.toISOString().split('T')[0]);
        break;
      case 'period':
        // Mantém as datas selecionadas - não faz nada
        break;
      case 'all':
        setDateFrom('');
        setDateTo('');
        break;
    }
    setPage(1);
  }, [dateFilter]);

  async function loadData() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        group_id: groupId,
        page: page.toString(),
        limit: limit.toString()
      });

      if (selectedUserId) {
        params.append('user_id', selectedUserId);
      }

      if (dateFrom) {
        params.append('date_from', dateFrom);
      }

      if (dateTo) {
        params.append('date_to', dateTo);
      }

      const res = await fetch(`/api/admin-group/logs?${params}`);
      
      if (!res.ok) {
        throw new Error('Erro ao carregar logs');
      }

      const data = await res.json();
      console.log('📊 Logs carregados:', {
        logs: data.logs?.length || 0,
        total: data.total || 0,
        users: data.users?.length || 0,
        page: data.page,
        totalPages: data.totalPages
      });
      
      setLogs(data.logs || []);
      setUsageSummary(data.usage_summary || []);
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error('❌ Erro ao carregar logs:', err);
      setLogs([]);
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!groupId) return;
    
    // Aguardar um pouco para garantir que as datas foram inicializadas
    const timer = setTimeout(() => {
      loadData();
    }, 200);
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId, page, selectedUserId, dateFrom, dateTo]);

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatDuration(minutes: number) {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  }

  // Calcular tempo de sessão por usuário
  function getSessionTime(userId: string, date: string): number {
    const summary = usageSummary.find(
      u => u.user_id === userId && u.usage_date === date
    );
    return summary?.total_minutes_online || 0;
  }

  // Agrupar logs por usuário e data para mostrar tempo de sessão
  const logsByUserAndDate = logs.reduce((acc: any, log) => {
    const date = log.created_at.split('T')[0];
    const key = `${log.user_id}_${date}`;
    
    if (!acc[key]) {
      acc[key] = {
        user: log.user,
        date,
        logs: [],
        firstLog: log.created_at,
        lastLog: log.created_at
      };
    }
    
    acc[key].logs.push(log);
    
    if (new Date(log.created_at) < new Date(acc[key].firstLog)) {
      acc[key].firstLog = log.created_at;
    }
    if (new Date(log.created_at) > new Date(acc[key].lastLog)) {
      acc[key].lastLog = log.created_at;
    }
    
    return acc;
  }, {});

  const sessionGroups = Object.values(logsByUserAndDate).map((group: any) => {
    const sessionMinutes = getSessionTime(group.user?.id || '', group.date);
    const sessionDuration = sessionMinutes > 0 
      ? sessionMinutes 
      : Math.max(0, Math.floor((new Date(group.lastLog).getTime() - new Date(group.firstLog).getTime()) / 60000));
    
    return {
      ...group,
      sessionDuration
    };
  });

  function clearFilters() {
    setSelectedUserId('');
    setDateFilter('today');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Logs de Atividade</h1>
            <p className="text-gray-500 mt-1">{total} registros encontrados</p>
          </div>
          <button
            onClick={loadData}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Filtro de Usuário */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuário
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos os usuários</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name} ({user.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro de Data */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Período
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">Hoje</option>
                <option value="month">Este Mês</option>
                <option value="period">Período</option>
                <option value="all">Todos</option>
              </select>
            </div>

            {/* Data Início (apenas se período) */}
            {dateFilter === 'period' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Início
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Data Fim (apenas se período) */}
            {dateFilter === 'period' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Fim
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Botão Limpar Filtros */}
            {(selectedUserId || dateFilter !== 'today') && (
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Limpar filtros"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Lista de Logs */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-gray-500">Carregando logs...</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileText className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Nenhum log encontrado</p>
            <p className="text-sm text-gray-400 mt-1">
              {selectedUserId || dateFilter !== 'all' 
                ? 'Tente ajustar os filtros' 
                : 'Aguarde novas atividades'}
            </p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuário
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ação
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Módulo
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Descrição
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP
                      </th>
                      <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data/Hora
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {logs.map((log) => {
                      const ModuleIcon = MODULE_ICONS[log.module] || Activity;
                      return (
                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                <span className="text-blue-600 font-semibold text-xs">
                                  {log.user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 text-sm">
                                  {log.user?.full_name || 'Usuário desconhecido'}
                                </p>
                                <p className="text-xs text-gray-500">{log.user?.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {ACTION_LABELS[log.action_type] || log.action_type}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <ModuleIcon className="w-4 h-4 text-gray-500" />
                              <span className="text-sm text-gray-700">
                                {MODULE_LABELS[log.module] || log.module}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-700 max-w-md truncate">
                              {log.description || '-'}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm text-gray-500 font-mono">
                              {log.ip_address || '-'}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {formatDate(log.created_at)}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-6 py-4">
                <div className="text-sm text-gray-600">
                  Página {page} de {totalPages} ({total} registros)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Resumo de Sessões */}
            {sessionGroups.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Tempo de Sessão por Usuário
                </h2>
                <div className="space-y-3">
                  {sessionGroups.map((group: any, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-blue-600 font-semibold text-sm">
                            {group.user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {group.user?.full_name || 'Usuário desconhecido'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(group.date).toLocaleDateString('pt-BR')} • {group.logs.length} ações
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {formatDuration(group.sessionDuration)}
                        </p>
                        <p className="text-xs text-gray-500">Tempo online</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
