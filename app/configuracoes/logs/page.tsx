'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import { useMenu } from '@/contexts/MenuContext';
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
  Download
} from 'lucide-react';

interface Log {
  id: string;
  action_type: string;
  module: string;
  description: string | null;
  entity_type: string | null;
  ip_address: string | null;
  created_at: string;
  user: { id: string; full_name: string; email: string } | null;
}

interface UserSummary {
  user_id: string;
  full_name: string;
  email: string;
  group_name: string;
  days_active: number;
  total_actions: number;
  chat_queries: number;
  powerbi_views: number;
  login_count: number;
  total_minutes_online: number;
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
  message: 'Mensagem'
};

const MODULE_LABELS: Record<string, string> = {
  auth: 'Autenticação',
  powerbi: 'Power BI',
  whatsapp: 'WhatsApp',
  alertas: 'Alertas',
  chat_ia: 'Chat IA',
  config: 'Configurações'
};

const MODULE_ICONS: Record<string, any> = {
  auth: LogIn,
  powerbi: BarChart3,
  whatsapp: MessageSquare,
  alertas: Bell,
  chat_ia: MessageSquare,
  config: Settings
};

function LogsContent() {
  const { activeGroup } = useMenu();
  const [activeTab, setActiveTab] = useState<'logs' | 'usage'>('logs');
  const [logs, setLogs] = useState<Log[]>([]);
  const [summary, setSummary] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<{ id: string; full_name: string }[]>([]);
  
  // Paginação
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Filtros
  const [filters, setFilters] = useState({
    user_id: '',
    module: '',
    action_type: '',
    date_from: '',
    date_to: ''
  });
  const [currentUser, setCurrentUser] = useState<{ id?: string; is_master?: boolean; role?: string } | null>(null);

  // Verifica se é usuário comum (declarado antes do useEffect)
  const isRegularUser = !currentUser?.is_master && currentUser?.role === 'user';

  useEffect(() => {
    loadCurrentUser();
  }, []);

  async function loadCurrentUser() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser({
          id: data.user?.id,
          is_master: data.user?.is_master,
          role: data.user?.role
        });
        
        // Se for user comum, força filtro pelo próprio user_id
        if (!data.user?.is_master && data.user?.role === 'user') {
          setFilters(prev => ({ ...prev, user_id: data.user.id }));
        }
      }
    } catch (err) {
      console.error('Erro ao carregar usuário:', err);
    }
  }

  useEffect(() => {
    // Só carregar usuários se não for usuário comum e se currentUser já foi carregado
    if (currentUser && !isRegularUser) {
      loadUsers();
    }
  }, [currentUser]);

  useEffect(() => {
    // Só carregar logs depois que currentUser foi definido
    if (!currentUser) return;
    
    if (activeTab === 'logs') {
      loadLogs(activeGroup);
    } else {
      loadSummary();
    }
  }, [activeTab, page, filters, activeGroup, currentUser]);

  async function loadUsers() {
    // Usuários comuns não precisam carregar lista de usuários
    if (isRegularUser) {
      return;
    }
    
    try {
      const res = await fetch('/api/config/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    }
  }

  async function loadLogs(currentGroup?: { id: string; name: string } | null) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '30'
      });
      
      // Se for usuário comum, passar only_mine=true e NÃO passar group_id
      if (isRegularUser) {
        params.append('only_mine', 'true');
      } else {
        // Apenas para admins/masters/dev: permitir filtros e group_id
        if (filters.user_id) params.append('user_id', filters.user_id);
        if (currentGroup) params.append('group_id', currentGroup.id);
      }
      
      // Filtros que todos podem usar
      if (filters.module) params.append('module', filters.module);
      if (filters.action_type) params.append('action_type', filters.action_type);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const res = await fetch(`/api/config/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error('Erro ao carregar logs:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadSummary() {
    setLoading(true);
    try {
      const res = await fetch('/api/config/logs/summary');
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary || []);
      }
    } catch (err) {
      console.error('Erro ao carregar resumo:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatMinutes(minutes: number) {
    if (minutes < 60) return `${minutes}min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}min`;
  }

  function clearFilters() {
    setFilters({
      user_id: '',
      module: '',
      action_type: '',
      date_from: '',
      date_to: ''
    });
    setPage(1);
  }

  function getActionColor(action: string) {
    switch (action) {
      case 'login': return 'bg-green-100 text-green-700';
      case 'logout': return 'bg-gray-100 text-gray-700';
      case 'create': return 'bg-blue-100 text-blue-700';
      case 'update': return 'bg-yellow-100 text-yellow-700';
      case 'delete': return 'bg-red-100 text-red-700';
      case 'query': return 'bg-purple-100 text-purple-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isRegularUser ? 'Minhas Atividades' : 'Logs do Sistema'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {isRegularUser ? 'Histórico das suas ações no sistema' : 'Acompanhe as atividades e uso do sistema'}
            </p>
          </div>
          <Button onClick={() => activeTab === 'logs' ? loadLogs(activeGroup) : loadSummary()} icon={<RefreshCw size={18} />}>
            Atualizar
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200">
          <button
            onClick={() => { setActiveTab('logs'); setPage(1); }}
            className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
              activeTab === 'logs'
                ? 'nav-active border-b-2'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={activeTab === 'logs' ? { borderColor: 'var(--color-primary)' } : {}}
          >
            <FileText size={20} />
            {isRegularUser ? 'Minhas Atividades' : 'Atividades'}
          </button>
          {!isRegularUser && (
            <button
              onClick={() => setActiveTab('usage')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                activeTab === 'usage'
                  ? 'nav-active border-b-2'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={activeTab === 'usage' ? { borderColor: 'var(--color-primary)' } : {}}
            >
              <Activity size={20} />
              Uso por Usuário
            </button>
          )}
        </div>

        {/* Tab: Logs */}
        {activeTab === 'logs' && (
          <>
            {/* Filtros */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Filter size={18} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700">Filtros</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                {!isRegularUser && (
                  <select
                    value={filters.user_id}
                    onChange={(e) => { setFilters({ ...filters, user_id: e.target.value }); setPage(1); }}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Todos os usuários</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name}</option>
                    ))}
                  </select>
                )}
                
                <select
                  value={filters.module}
                  onChange={(e) => { setFilters({ ...filters, module: e.target.value }); setPage(1); }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Todos os módulos</option>
                  {Object.entries(MODULE_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                
                <select
                  value={filters.action_type}
                  onChange={(e) => { setFilters({ ...filters, action_type: e.target.value }); setPage(1); }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Todas as ações</option>
                  {Object.entries(ACTION_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => { setFilters({ ...filters, date_from: e.target.value }); setPage(1); }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Data início"
                />
                
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => { setFilters({ ...filters, date_to: e.target.value }); setPage(1); }}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  placeholder="Data fim"
                />
              </div>
              {(filters.user_id || filters.module || filters.action_type || filters.date_from || filters.date_to) && (
                <button
                  onClick={clearFilters}
                  className="mt-3 text-sm text-gray-500 hover:text-gray-700"
                >
                  Limpar filtros
                </button>
              )}
            </div>

            {/* Lista de Logs */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : logs.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum log encontrado</h3>
                <p className="text-gray-500">Ajuste os filtros ou aguarde novas atividades</p>
              </div>
            ) : (
              <>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <span className="text-sm text-gray-600">{total} registros encontrados</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {logs.map((log) => {
                      const ModuleIcon = MODULE_ICONS[log.module] || Activity;
                      return (
                        <div key={log.id} className="p-4 hover:bg-gray-50">
                          <div className="flex items-start gap-4">
                            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                              <ModuleIcon size={20} className="text-gray-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${getActionColor(log.action_type)}`}>
                                  {ACTION_LABELS[log.action_type] || log.action_type}
                                </span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500">{MODULE_LABELS[log.module] || log.module}</span>
                              </div>
                              <p className="text-sm text-gray-900">{log.description || '-'}</p>
                              <div className="flex items-center gap-4 mt-1">
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <User size={12} />
                                  {log.user?.full_name || 'Sistema'}
                                </span>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock size={12} />
                                  {formatDate(log.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Paginação */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">
                      Página {page} de {totalPages}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                        className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* Tab: Uso por Usuário */}
        {activeTab === 'usage' && (
          <>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : summary.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum dado de uso</h3>
                <p className="text-gray-500">Aguarde atividades dos usuários</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Usuário</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Dias Ativos</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Logins</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Ações</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Chat IA</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Power BI</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Tempo Online</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {summary.map((user) => (
                      <tr key={user.user_id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{user.full_name}</p>
                            <p className="text-sm text-gray-500">{user.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-medium text-gray-900">{user.days_active}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-medium text-gray-900">{user.login_count}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-medium text-gray-900">{user.total_actions}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-medium text-purple-600">{user.chat_queries}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-medium text-blue-600">{user.powerbi_views}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="font-medium text-green-600">{formatMinutes(user.total_minutes_online)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
  );
}

export default function LogsPage() {
  return (
    <MainLayout>
      <LogsContent />
    </MainLayout>
  );
}
