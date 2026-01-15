'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import { useMenu } from '@/contexts/MenuContext';
import { 
  Database, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Clock,
  Workflow,
  Activity,
  History,
  X,
  Plus,
  Monitor,
  BarChart3,
  FileText,
  PieChart,
  TrendingUp,
  Activity as ActivityIcon,
  DollarSign,
  Users,
  ShoppingCart,
  Package,
  Truck,
  Factory,
  Loader2
} from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Dataset {
  id: string;
  name: string;
  workspaceName: string;
  lastRefreshTime: string | null;
  lastRefreshStatus: string;
  isStale: boolean;
  hoursAgo: number | null;
}

interface Dataflow {
  id: string;
  name: string;
  workspaceName: string;
  lastRefreshTime: string | null;
  lastRefreshStatus: string;
  isStale: boolean;
  hoursAgo: number | null;
}

interface Summary {
  total: number;
  updated: number;
  failed: number;
  stale: number;
}

interface Screen {
  id: string;
  title: string;
  report_id: string;
  icon?: string;
  is_active: boolean;
  is_first: boolean;
}

interface Report {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
}

const ICONS = ['Monitor', 'BarChart3', 'FileText', 'PieChart', 'TrendingUp', 'Activity', 'DollarSign', 'Users', 'ShoppingCart', 'Package', 'Truck', 'Factory'];

const ICON_MAP: Record<string, any> = {
  Monitor,
  BarChart3,
  FileText,
  PieChart,
  TrendingUp,
  Activity: ActivityIcon,
  DollarSign,
  Users,
  ShoppingCart,
  Package,
  Truck,
  Factory,
};

function PowerBIDashboardContent() {
  const { activeGroup } = useMenu();
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [dataflows, setDataflows] = useState<Dataflow[]>([]);
  const [datasetsSummary, setDatasetsSummary] = useState<Summary>({ total: 0, updated: 0, failed: 0, stale: 0 });
  const [dataflowsSummary, setDataflowsSummary] = useState<Summary>({ total: 0, updated: 0, failed: 0, stale: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'datasets' | 'dataflows'>('datasets');
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [historyModal, setHistoryModal] = useState<{ open: boolean; datasetId: string; datasetName: string; connectionName: string } | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [userRole, setUserRole] = useState<string>('user');
  const [accessDenied, setAccessDenied] = useState(false);
  const [showScreenModal, setShowScreenModal] = useState(false);
  const [savingScreen, setSavingScreen] = useState(false);
  const [screenError, setScreenError] = useState('');
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<{id: string; name: string; email: string}[]>([]);
  const [screenFormData, setScreenFormData] = useState({
    title: '',
    report_id: '',
    is_active: true,
    is_first: false,
    allowed_users: [] as string[],
    icon: 'Monitor',
    company_group_id: ''
  });

  const loadData = async (currentGroup?: { id: string; name: string } | null) => {
    try {
      setLoading(true);
      setError(null);

      const datasetsUrl = currentGroup 
        ? `/api/powerbi/datasets/status?group_id=${currentGroup.id}`
        : '/api/powerbi/datasets/status';
      const dataflowsUrl = currentGroup
        ? `/api/powerbi/dataflows/status?group_id=${currentGroup.id}`
        : '/api/powerbi/dataflows/status';

      const [datasetsRes, dataflowsRes] = await Promise.all([
        fetch(datasetsUrl),
        fetch(dataflowsUrl)
      ]);

      if (datasetsRes.ok) {
        const data = await datasetsRes.json();
        setDatasets(data.datasets || []);
        setDatasetsSummary(data.summary || { total: 0, updated: 0, failed: 0, stale: 0 });
      }

      if (dataflowsRes.ok) {
        const data = await dataflowsRes.json();
        setDataflows(data.dataflows || []);
        setDataflowsSummary(data.summary || { total: 0, updated: 0, failed: 0, stale: 0 });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  useEffect(() => {
    if (userRole !== 'user') {
      loadData(activeGroup);
    }
  }, [activeGroup, userRole]);

  async function checkAccessAndLoad() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      
      if (data.user) {
        console.log('=== DEBUG USER ROLE ===', data.user);
        console.log('is_master:', data.user.is_master);
        console.log('is_developer:', data.user.is_developer);
        if (data.user.is_master) {
          setUserRole('master');
        } else if (data.user.is_developer) {
          setUserRole('developer');
        } else if (data.user.role === 'admin') {
          setUserRole('admin');
        } else {
          setUserRole('user');
          setAccessDenied(true);
          setLoading(false);
          return;
        }
        loadData(activeGroup);
      } else {
        setAccessDenied(true);
        setLoading(false);
      }
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      setAccessDenied(true);
      setLoading(false);
    }
  }

  const getStatusIcon = (status: string, isStale: boolean) => {
    if (status === 'Failed') return <XCircle className="w-5 h-5 text-red-500" />;
    if (isStale) return <AlertTriangle className="w-5 h-5 text-amber-500" />;
    if (status === 'Completed' || status === 'Success') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (status === 'InProgress') return <LoadingSpinner size={20} />;
    return <Clock className="w-5 h-5 text-gray-400" />;
  };

  const getStatusBadge = (status: string, isStale: boolean) => {
    if (status === 'Failed') return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Falhou</span>;
    if (isStale) return <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">Desatualizado</span>;
    if (status === 'Completed' || status === 'Success') return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Atualizado</span>;
    if (status === 'InProgress') return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">Atualizando...</span>;
    return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">Desconhecido</span>;
  };

  const formatTimeAgo = (hoursAgo: number | null) => {
    if (hoursAgo === null) return 'Nunca';
    if (hoursAgo < 1) return 'Agora';
    if (hoursAgo < 24) return `${hoursAgo}h atrás`;
    const days = Math.floor(hoursAgo / 24);
    return `${days}d atrás`;
  };

  const handleRefresh = async (datasetId: string, connectionName: string) => {
    if (refreshingId) return;
    
    setRefreshingId(datasetId);
    try {
      // Buscar connection_id pelo nome
      const connRes = await fetch('/api/powerbi/connections');
      const connData = await connRes.json();
      const connection = connData.connections?.find((c: any) => c.name === connectionName);
      
      if (!connection) {
        alert('Conexão não encontrada');
        return;
      }

      const res = await fetch('/api/powerbi/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_id: datasetId,
          connection_id: connection.id
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        alert('Atualização iniciada com sucesso!');
        // Recarrega os dados após 2 segundos
        setTimeout(() => loadData(activeGroup), 2000);
      } else {
        alert(data.error || 'Erro ao iniciar atualização');
      }
    } catch (err: any) {
      alert('Erro ao iniciar atualização');
    } finally {
      setRefreshingId(null);
    }
  };

  const loadHistory = async (datasetId: string, datasetName: string, connectionName: string) => {
    setHistoryModal({ open: true, datasetId, datasetName, connectionName });
    setLoadingHistory(true);
    setHistory([]);
    
    try {
      const connRes = await fetch('/api/powerbi/connections');
      const connData = await connRes.json();
      const connection = connData.connections?.find((c: any) => c.name === connectionName);
      
      if (!connection) {
        setHistory([]);
        return;
      }

      const res = await fetch(`/api/powerbi/refresh?dataset_id=${datasetId}&connection_id=${connection.id}`);
      const data = await res.json();
      
      if (res.ok) {
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  async function loadReportsForModal(groupId: string) {
    if (!groupId) {
      setReports([]);
      return;
    }
    setReportsLoading(true);
    try {
      const res = await fetch(`/api/powerbi/reports?group_id=${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch (err) {
      console.error('Erro ao carregar relatórios:', err);
    } finally {
      setReportsLoading(false);
    }
  }

  async function loadUsersForModal(groupId: string) {
    if (!groupId) {
      setUsers([]);
      return;
    }
    try {
      const res = await fetch(`/api/dev/groups/${groupId}/users`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    }
  }

  async function loadGroups() {
    try {
      const res = await fetch('/api/user/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.error('Erro ao carregar grupos:', err);
    }
  }

  function openNewScreenModal() {
    setScreenFormData({
      title: '',
      report_id: '',
      is_active: true,
      is_first: false,
      allowed_users: [],
      icon: 'Monitor',
      company_group_id: activeGroup?.id || ''
    });
    setScreenError('');
    loadGroups();
    if (activeGroup?.id) {
      loadReportsForModal(activeGroup.id);
      loadUsersForModal(activeGroup.id);
    }
    setShowScreenModal(true);
  }

  function toggleUserAccess(userId: string) {
    setScreenFormData(prev => {
      const allowed = [...prev.allowed_users];
      const index = allowed.indexOf(userId);
      if (index > -1) {
        allowed.splice(index, 1);
      } else {
        allowed.push(userId);
      }
      return { ...prev, allowed_users: allowed };
    });
  }

  async function handleSaveScreen() {
    if (!screenFormData.title.trim()) {
      setScreenError('Título é obrigatório');
      return;
    }
    if (!screenFormData.report_id) {
      setScreenError('Relatório é obrigatório');
      return;
    }
    if (!screenFormData.company_group_id) {
      setScreenError('Grupo é obrigatório');
      return;
    }

    try {
      setSavingScreen(true);
      setScreenError('');

      const res = await fetch(`/api/dev/groups/${screenFormData.company_group_id}/screens`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: screenFormData.title.trim(),
          report_id: screenFormData.report_id,
          is_active: screenFormData.is_active,
          is_first: screenFormData.is_first,
          allowed_users: screenFormData.allowed_users,
          icon: screenFormData.icon,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Erro ao salvar tela');
      }

      setShowScreenModal(false);
      alert('Tela criada com sucesso!');
    } catch (err: any) {
      setScreenError(err.message);
    } finally {
      setSavingScreen(false);
    }
  }

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getHistoryStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">Sucesso</span>;
      case 'Failed':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">Falhou</span>;
      case 'Unknown':
      case 'InProgress':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">Em andamento</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const totalItems = datasetsSummary.total + dataflowsSummary.total;
  const totalUpdated = datasetsSummary.updated + dataflowsSummary.updated;
  const totalFailed = datasetsSummary.failed + dataflowsSummary.failed;
  const totalStale = datasetsSummary.stale + dataflowsSummary.stale;
  const healthPercentage = totalItems > 0 ? Math.round((totalUpdated / totalItems) * 100) : 0;

  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Database className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Power BI nao disponivel</h2>
        <p className="text-gray-500 mb-4">Este modulo nao esta disponivel para seu perfil.</p>
        <p className="text-sm text-gray-400">Apenas administradores podem acessar.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard Power BI</h1>
            <p className="text-gray-500 text-sm mt-1">Monitoramento de atualizações e status dos recursos</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => loadData(activeGroup)}
              disabled={loading}
              loading={loading}
              icon={<RefreshCw size={16} />}
            >
              Atualizar
            </Button>
          </div>
        </div>

        {/* Cards de Resumo Geral */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Saúde Geral</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{healthPercentage}%</p>
              </div>
              <div className={`p-3 rounded-full ${healthPercentage >= 80 ? 'bg-green-100' : healthPercentage >= 50 ? 'bg-amber-100' : 'bg-red-100'}`}>
                <Activity className={`w-6 h-6 ${healthPercentage >= 80 ? 'text-green-600' : healthPercentage >= 50 ? 'text-amber-600' : 'text-red-600'}`} />
              </div>
            </div>
            <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${healthPercentage >= 80 ? 'bg-green-500' : healthPercentage >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${healthPercentage}%` }}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Atualizados</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{totalUpdated}</p>
              </div>
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">de {totalItems} recursos</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Com Falha</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{totalFailed}</p>
              </div>
              <div className="p-3 rounded-full bg-red-100">
                <XCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">requerem atenção</p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Desatualizados</p>
                <p className="text-3xl font-bold text-amber-600 mt-1">{totalStale}</p>
              </div>
              <div className="p-3 rounded-full bg-amber-100">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-2">mais de 24h sem atualizar</p>
          </div>
        </div>

        {/* Cards de Datasets e Dataflows */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-100">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Modelos Semânticos</h3>
                <p className="text-sm text-gray-500">{datasetsSummary.total} datasets</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{datasetsSummary.updated}</p>
                <p className="text-xs text-gray-500">OK</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{datasetsSummary.failed}</p>
                <p className="text-xs text-gray-500">Falha</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">{datasetsSummary.stale}</p>
                <p className="text-xs text-gray-500">Antigo</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-blue-100">
                <Workflow className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Fluxos de Dados</h3>
                <p className="text-sm text-gray-500">{dataflowsSummary.total} dataflows</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{dataflowsSummary.updated}</p>
                <p className="text-xs text-gray-500">OK</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{dataflowsSummary.failed}</p>
                <p className="text-xs text-gray-500">Falha</p>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <p className="text-2xl font-bold text-amber-600">{dataflowsSummary.stale}</p>
                <p className="text-xs text-gray-500">Antigo</p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista Detalhada com Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('datasets')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'datasets'
                    ? 'border-blue-600 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Modelos Semânticos ({datasetsSummary.total})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('dataflows')}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'dataflows'
                    ? 'border-blue-600 text-gray-900'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Workflow className="w-4 h-4" />
                  Fluxos de Dados ({dataflowsSummary.total})
                </div>
              </button>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size={32} />
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <XCircle className="w-12 h-12 text-red-300 mx-auto mb-4" />
                <p className="text-gray-500">{error}</p>
              </div>
            ) : activeTab === 'datasets' ? (
              <div className="space-y-3">
                {datasets.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nenhum modelo semântico encontrado</p>
                ) : (
                  datasets.map((dataset, index) => (
                    <div
                      key={`${dataset.id}-${index}`}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {getStatusIcon(dataset.lastRefreshStatus, dataset.isStale)}
                        <div>
                          <p className="font-medium text-gray-900">{dataset.name}</p>
                          <p className="text-sm text-gray-500">{dataset.workspaceName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Última atualização</p>
                          <p className="text-sm font-medium text-gray-700">{formatTimeAgo(dataset.hoursAgo)}</p>
                        </div>
                        {getStatusBadge(dataset.lastRefreshStatus, dataset.isStale)}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            loadHistory(dataset.id, dataset.name, dataset.workspaceName);
                          }}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Ver histórico"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRefresh(dataset.id, dataset.workspaceName);
                          }}
                          disabled={refreshingId === dataset.id}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Atualizar dataset"
                        >
                          <RefreshCw className={`w-4 h-4 ${refreshingId === dataset.id ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {dataflows.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nenhum fluxo de dados encontrado</p>
                ) : (
                  dataflows.map((dataflow, index) => (
                    <div
                      key={`${dataflow.id}-${index}`}
                      className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        {getStatusIcon(dataflow.lastRefreshStatus, dataflow.isStale)}
                        <div>
                          <p className="font-medium text-gray-900">{dataflow.name}</p>
                          <p className="text-sm text-gray-500">{dataflow.workspaceName}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">Última atualização</p>
                          <p className="text-sm font-medium text-gray-700">{formatTimeAgo(dataflow.hoursAgo)}</p>
                        </div>
                        {getStatusBadge(dataflow.lastRefreshStatus, dataflow.isStale)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal de Histórico */}
        {historyModal?.open && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Histórico de Atualizações</h3>
                  <p className="text-sm text-gray-500">{historyModal.datasetName}</p>
                </div>
                <button
                  onClick={() => setHistoryModal(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 max-h-96 overflow-y-auto">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <LoadingSpinner size={24} />
                  </div>
                ) : history.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">Nenhum histórico encontrado</p>
                ) : (
                  <div className="space-y-3">
                    {history.map((item, index) => (
                      <div key={item.id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{formatDateTime(item.startTime)}</p>
                          <p className="text-xs text-gray-500">
                            {item.endTime ? `Duração: ${Math.round((new Date(item.endTime).getTime() - new Date(item.startTime).getTime()) / 1000)}s` : 'Em andamento...'}
                          </p>
                        </div>
                        {getHistoryStatusBadge(item.status)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end p-4 border-t border-gray-200">
                <button
                  onClick={() => setHistoryModal(null)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Nova Tela */}
        {showScreenModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Nova Tela</h2>
                <button
                  onClick={() => setShowScreenModal(false)}
                  className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {screenError && (
                  <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                    {screenError}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grupo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={screenFormData.company_group_id}
                    onChange={(e) => {
                      setScreenFormData({ ...screenFormData, company_group_id: e.target.value, report_id: '' });
                      loadReportsForModal(e.target.value);
                      loadUsersForModal(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Selecione um grupo</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Título <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={screenFormData.title}
                    onChange={(e) => setScreenFormData({ ...screenFormData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Relatório Power BI <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={screenFormData.report_id}
                    onChange={(e) => setScreenFormData({ ...screenFormData, report_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!screenFormData.company_group_id}
                  >
                    <option value="">{reportsLoading ? 'Carregando...' : 'Selecione um relatório'}</option>
                    {reports.map(report => (
                      <option key={report.id} value={report.id}>{report.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ícone</label>
                  <div className="grid grid-cols-6 gap-2">
                    {ICONS.map((iconName) => {
                      const IconComponent = ICON_MAP[iconName];
                      return (
                        <button
                          key={iconName}
                          type="button"
                          onClick={() => setScreenFormData({ ...screenFormData, icon: iconName })}
                          className={`p-3 rounded-lg border-2 transition-all ${
                            screenFormData.icon === iconName
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <IconComponent className={`w-5 h-5 mx-auto ${
                            screenFormData.icon === iconName ? 'text-blue-600' : 'text-gray-600'
                          }`} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={screenFormData.is_active}
                      onChange={(e) => setScreenFormData({ ...screenFormData, is_active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Tela Ativa</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={screenFormData.is_first}
                      onChange={(e) => setScreenFormData({ ...screenFormData, is_first: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Tela Inicial</span>
                  </label>
                </div>

                {users.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Usuários com Acesso</label>
                    <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                      {users.map(user => (
                        <label key={user.id} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={screenFormData.allowed_users.includes(user.id)}
                            onChange={() => toggleUserAccess(user.id)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm text-gray-700">{user.name}</span>
                          <span className="text-xs text-gray-500">({user.email})</span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Se nenhum usuário for selecionado, todos terão acesso</p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => setShowScreenModal(false)}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveScreen}
                  disabled={savingScreen}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {savingScreen ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function PowerBIDashboardPage() {
  return (
    <MainLayout>
      <PowerBIDashboardContent />
    </MainLayout>
  );
}
