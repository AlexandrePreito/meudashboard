'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import {
  ArrowLeft,
  Building2,
  Users,
  Monitor,
  Mail,
  Phone,
  MapPin,
  Edit2,
  Plus,
  Trash2,
  X,
  Loader2,
  AlertCircle,
  Key,
  BarChart3,
  FileText,
  PieChart,
  TrendingUp,
  Activity,
  DollarSign,
  ShoppingCart,
  Package,
  Truck,
  Factory,
  RefreshCw,
  Bell,
  MessageCircle,
  MonitorPlay
} from 'lucide-react';

interface Group {
  id: string;
  name: string;
  slug: string;
  document?: string;
  email?: string;
  phone?: string;
  status: string;
  logo_url?: string;
  responsible_name?: string;
  responsible_email?: string;
  responsible_phone?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  quota_users?: number;
  quota_screens?: number;
  quota_alerts?: number;
  quota_whatsapp_per_day?: number;
  quota_alert_executions_per_day?: number;
  quota_refreshes?: number;
  users?: any[];
  screens?: any[];
  alerts?: any[];
  usage_today?: {
    whatsapp_messages_sent: number;
    refreshes: number;
  };
}

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  is_active: boolean;
  membership_id: string;
  company_group_id: string;
  can_use_ai: boolean;
  can_refresh: boolean;
  created_at: string;
}

interface UserFormData {
  full_name: string;
  email: string;
  password: string;
  role: string;
}

interface Screen {
  id: string;
  title: string;
  report_id: string;
  page_name?: string;
  description?: string;
  is_active: boolean;
  is_first: boolean;
  allowed_users?: string[];
  icon?: string;
  created_at: string;
}

interface ScreenFormData {
  title: string;
  report_id: string;
  page_name: string;
  is_active: boolean;
  is_public: boolean;
  allowed_users: string[];
  icon: string;
}

interface Report {
  id: string;
  name: string;
  workspace_id?: string;
  connection_id?: string;
}

const ICONS = ['Monitor', 'BarChart3', 'FileText', 'PieChart', 'TrendingUp', 'Activity', 'DollarSign', 'Users', 'ShoppingCart', 'Package', 'Truck', 'Factory'];

const ICON_MAP: Record<string, any> = {
  Monitor,
  BarChart3,
  FileText,
  PieChart,
  TrendingUp,
  Activity,
  DollarSign,
  Users,
  ShoppingCart,
  Package,
  Truck,
  Factory,
};

export default function AdminGroupDetailPage() {
  const router = useRouter();
  const params = useParams();
  const groupId = params.id as string;
  
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [savingUser, setSavingUser] = useState(false);
  const [userFormData, setUserFormData] = useState<UserFormData>({
    full_name: '',
    email: '',
    password: '',
    role: 'viewer',
  });
  const [userError, setUserError] = useState('');

  const [screens, setScreens] = useState<Screen[]>([]);
  const [screensLoading, setScreensLoading] = useState(false);
  
  const [reports, setReports] = useState<Report[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  
  const [availablePages, setAvailablePages] = useState<string[]>([]);
  const [showScreenModal, setShowScreenModal] = useState(false);
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null);
  const [savingScreen, setSavingScreen] = useState(false);
  const [screenFormData, setScreenFormData] = useState<ScreenFormData>({
    title: '',
    report_id: '',
    page_name: '',
    is_active: true,
    is_public: true,
    allowed_users: [],
    icon: 'Monitor',
  });
  const [screenError, setScreenError] = useState('');

  useEffect(() => {
    if (groupId) {
      loadGroup();
      loadUsers();
      loadScreens();
      loadReports();
    }
  }, [groupId]);

  useEffect(() => {
    if (screenFormData.report_id && showScreenModal) {
      fetchPagesForReport(screenFormData.report_id);
    } else {
      setAvailablePages([]);
    }
  }, [screenFormData.report_id, showScreenModal]);

  async function loadGroup() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin-group?group_id=${groupId}`);
      
      if (res.status === 403 || res.status === 404) {
        router.push('/administrador');
        return;
      }
      
      if (!res.ok) {
        throw new Error('Erro ao carregar grupo');
      }
      
      const result = await res.json();
      setGroup(result.group);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      setUsersLoading(true);
      const res = await fetch(`/api/admin-group/usuarios?group_id=${groupId}`);
      
      if (!res.ok) {
        throw new Error('Erro ao carregar usuários');
      }
      
      const result = await res.json();
      setUsers(result.users || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadScreens() {
    try {
      setScreensLoading(true);
      const res = await fetch(`/api/powerbi/screens?group_id=${groupId}`);
      
      if (!res.ok) {
        throw new Error('Erro ao carregar telas');
      }
      
      const result = await res.json();
      setScreens(result.screens || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setScreensLoading(false);
    }
  }

  async function loadReports() {
    try {
      setReportsLoading(true);
      const res = await fetch('/api/powerbi/reports');
      
      if (!res.ok) {
        throw new Error('Erro ao carregar relatórios');
      }
      
      const result = await res.json();
      // Filtrar apenas relatórios do grupo atual
      const groupReports = result.reports?.filter((report: any) => {
        return report.connection?.company_group_id === groupId;
      }) || [];
      setReports(groupReports);
    } catch (err: any) {
      console.error(err);
    } finally {
      setReportsLoading(false);
    }
  }

  const fetchPagesForReport = async (reportId: string) => {
    try {
      const res = await fetch(`/api/powerbi/reports/${reportId}/pages`);
      if (res.ok) {
        const data = await res.json();
        setAvailablePages(data.pages || []);
      } else {
        setAvailablePages([]);
      }
    } catch (error) {
      console.error('Erro ao buscar páginas:', error);
      setAvailablePages([]);
    }
  };

  function openNewUser() {
    setEditingUser(null);
    setUserFormData({
      full_name: '',
      email: '',
      password: '',
      role: 'viewer',
    });
    setUserError('');
    setShowUserModal(true);
  }

  function openEditUser(user: User) {
    setEditingUser(user);
    setUserFormData({
      full_name: user.full_name,
      email: user.email,
      password: '',
      role: user.role,
    });
    setUserError('');
    setShowUserModal(true);
  }

  async function handleSaveUser() {
    if (!editingUser) {
      if (!userFormData.full_name.trim()) {
        setUserError('Nome é obrigatório');
        return;
      }
      
      if (!userFormData.email.trim()) {
        setUserError('Email é obrigatório');
        return;
      }
      
      if (!userFormData.password) {
        setUserError('Senha é obrigatória para novo usuário');
        return;
      }
    }

    try {
      setSavingUser(true);
      setUserError('');
      
      if (editingUser) {
        const response = await fetch(`/api/admin-group/usuarios`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            user_id: editingUser.id,
            membership_id: editingUser.membership_id,
            company_group_id: groupId,
            role: userFormData.role,
            email: userFormData.email,
            full_name: userFormData.full_name,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Erro ao atualizar usuário');
        }

        await loadUsers();
        await loadGroup();
      } else {
        const response = await fetch(`/api/admin-group/usuarios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            email: userFormData.email.trim(),
            full_name: userFormData.full_name.trim(),
            password: userFormData.password,
            role: userFormData.role,
            company_group_id: groupId,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Erro ao criar usuário');
        }
      }

      setShowUserModal(false);
      setEditingUser(null);
      loadUsers();
      loadGroup();
    } catch (error: any) {
      setUserError(error.message);
    } finally {
      setSavingUser(false);
    }
  }

  async function handleDeleteUser(userId: string) {
    const userMembership = users.find(u => u.id === userId);
    if (!userMembership || !confirm('Tem certeza que deseja remover este usuário do grupo?')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin-group/usuarios?membership_id=${userMembership.membership_id}&group_id=${groupId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Erro ao remover usuário');
      }
      
      loadUsers();
      loadGroup();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleResetPassword(userId: string) {
    const newPassword = prompt('Digite a nova senha (mínimo 6 caracteres):');
    
    if (!newPassword) return;
    
    if (newPassword.length < 6) {
      alert('Senha deve ter no mínimo 6 caracteres');
      return;
    }

    try {
      const userMembership = users.find(u => u.id === userId);
      if (!userMembership) return;

      const res = await fetch(`/api/admin-group/usuarios`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          membership_id: userMembership.membership_id,
          company_group_id: groupId,
          password: newPassword,
        }),
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || 'Erro ao resetar senha');
      }
      
      alert('Senha alterada com sucesso!');
    } catch (err: any) {
      alert(err.message);
    }
  }

  function openNewScreen() {
    setEditingScreen(null);
    setScreenFormData({
      title: '',
      report_id: '',
      page_name: '',
      is_active: true,
      is_public: true,
      allowed_users: [],
      icon: 'Monitor',
    });
    setScreenError('');
    setShowScreenModal(true);
  }

  function openEditScreen(screen: Screen) {
    setEditingScreen(screen);
    setScreenFormData({
      title: screen.title,
      report_id: screen.report_id,
      page_name: screen.page_name || '',
      is_active: screen.is_active,
      is_public: screen.allowed_users && screen.allowed_users.length > 0 ? false : true,
      allowed_users: screen.allowed_users || [],
      icon: screen.icon || 'Monitor',
    });
    setScreenError('');
    setShowScreenModal(true);
  }

  async function handleSaveScreen() {
    if (!screenFormData.title.trim()) {
      setScreenError('Título é obrigatório');
      return;
    }
    
    if (!screenFormData.report_id.trim()) {
      setScreenError('Relatório é obrigatório');
      return;
    }

    try {
      setSavingScreen(true);
      setScreenError('');
      
      const payload = {
        title: screenFormData.title.trim(),
        report_id: screenFormData.report_id.trim(),
        page_name: screenFormData.page_name.trim(),
        is_active: screenFormData.is_active,
        is_public: screenFormData.is_public,
        allowed_users: screenFormData.is_public ? [] : screenFormData.allowed_users,
        icon: screenFormData.icon,
      };
      
      // Para admin, usar API do powerbi diretamente
      const url = editingScreen 
        ? `/api/powerbi/screens/${editingScreen.id}`
        : `/api/powerbi/screens`;
      
      const method = editingScreen ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          company_group_id: groupId,
        }),
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || 'Erro ao salvar tela');
      }
      
      setShowScreenModal(false);
      loadScreens();
      loadGroup();
    } catch (err: any) {
      setScreenError(err.message);
    } finally {
      setSavingScreen(false);
    }
  }

  async function handleDeleteScreen(screenId: string) {
    if (!confirm('Tem certeza que deseja excluir esta tela?')) {
      return;
    }

    try {
      const res = await fetch(`/api/powerbi/screens/${screenId}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Erro ao excluir tela');
      }
      
      loadScreens();
      loadGroup();
    } catch (err: any) {
      alert(err.message);
    }
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

  function getProgressColor(used: number, limit: number) {
    if (limit === 0) return 'bg-gray-400';
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
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

  if (error || !group) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao carregar</h2>
          <p className="text-gray-600 mb-4">{error || 'Grupo não encontrado'}</p>
          <button
            onClick={() => router.push('/administrador')}
            className="btn-primary px-4 py-2 rounded-lg"
          >
            Voltar
          </button>
        </div>
      </MainLayout>
    );
  }

  // Não mostrar página se grupo estiver inativo ou apagado
  if (group.status !== 'active') {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Grupo não disponível</h2>
          <p className="text-gray-500 mb-4">
            Este grupo está {group.status === 'suspended' ? 'suspenso' : 'inativo'}.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="btn-primary px-4 py-2 rounded-lg"
          >
            Voltar para Dashboard
          </button>
        </div>
      </MainLayout>
    );
  }

  const usersCount = users.filter(u => u.is_active).length;
  const screensCount = screens.length;
  const alertsCount = group.alerts?.length || 0;
  const usageToday = group.usage_today || { whatsapp_messages_sent: 0, refreshes: 0 };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  group.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {group.status === 'active' ? 'Ativo' : 'Suspenso'}
              </span>
            </div>
          </div>
        </div>

        {/* Cards de Quotas */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Uso de Recursos</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Usuários */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-gray-700">Usuários</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-2">
                {usersCount} / {group.quota_users || '∞'}
              </p>
              {group.quota_users && (
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${getProgressColor(usersCount, group.quota_users)}`}
                    style={{ width: `${Math.min((usersCount / group.quota_users) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Telas */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <MonitorPlay className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Telas</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-2">
                {screensCount} / {group.quota_screens || '∞'}
              </p>
              {group.quota_screens && (
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${getProgressColor(screensCount, group.quota_screens)}`}
                    style={{ width: `${Math.min((screensCount / group.quota_screens) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Alertas */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-gray-700">Alertas</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-2">
                {alertsCount} / {group.quota_alerts || '∞'}
              </p>
              {group.quota_alerts && (
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${getProgressColor(alertsCount, group.quota_alerts)}`}
                    style={{ width: `${Math.min((alertsCount / group.quota_alerts) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* WhatsApp/dia */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-gray-700">WhatsApp/dia</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-2">
                {usageToday.whatsapp_messages_sent} / {group.quota_whatsapp_per_day || '∞'}
              </p>
              {group.quota_whatsapp_per_day && (
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${getProgressColor(usageToday.whatsapp_messages_sent, group.quota_whatsapp_per_day)}`}
                    style={{ width: `${Math.min((usageToday.whatsapp_messages_sent / group.quota_whatsapp_per_day) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Atualizações/dia */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-medium text-gray-700">Atualizações/dia</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-2">
                {usageToday.refreshes || 0} / {group.quota_refreshes || '∞'}
              </p>
              {group.quota_refreshes && (
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${getProgressColor(usageToday.refreshes || 0, group.quota_refreshes || 0)}`}
                    style={{ width: `${Math.min(((usageToday.refreshes || 0) / (group.quota_refreshes || 1)) * 100, 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Usuários do Grupo */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Usuários do Grupo</h2>
            <button
              onClick={openNewUser}
              className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg"
            >
              <Plus className="w-5 h-5" />
              Novo Usuário
            </button>
          </div>

          {usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : users.filter(u => u.is_active).length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum usuário ativo cadastrado neste grupo
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Perfil</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.filter(u => u.is_active).map((userMembership) => (
                    <tr key={userMembership.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">
                          {userMembership.full_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {userMembership.email}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          userMembership.role === 'admin' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {userMembership.role === 'viewer' ? 'Visualizador' : 
                           userMembership.role === 'editor' ? 'Editor' : 
                           userMembership.role === 'admin' ? 'Administrador' : 
                           userMembership.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            userMembership.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {userMembership.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditUser(userMembership)}
                            className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                            title="Editar usuário"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleResetPassword(userMembership.id)}
                            className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                            title="Resetar senha"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(userMembership.id)}
                            className="p-1.5 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Telas Power BI */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Telas Power BI</h2>
            <button
              onClick={openNewScreen}
              className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg"
            >
              <Plus className="w-5 h-5" />
              Nova Tela
            </button>
          </div>

          {screensLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : screens.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhuma tela cadastrada neste grupo
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {screens.map((screen) => (
                <div key={screen.id} className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-5 h-5 text-blue-600" />
                        <div>
                          <h3 className="font-medium text-gray-900">{screen.title}</h3>
                        </div>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          screen.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {screen.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                  
                  <div className="text-xs text-gray-500 mb-3">
                    <p>Report ID: {screen.report_id}</p>
                    {screen.page_name && <p>Página: {screen.page_name}</p>}
                    {screen.allowed_users && screen.allowed_users.length > 0 && (
                      <p className="mt-1">{screen.allowed_users.length} usuário(s) com acesso</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                    <button
                      onClick={() => openEditScreen(screen)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteScreen(screen.id)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded transition-colors text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Usuário - Ainda precisa ser implementado, mas por enquanto mantém estrutura básica */}
    </MainLayout>
  );
}
