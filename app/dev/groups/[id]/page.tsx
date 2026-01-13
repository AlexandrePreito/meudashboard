'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Factory
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
  quota_ai_credits_per_day?: number;
  users?: any[];
  screens?: any[];
  alerts?: any[];
  usage_today?: {
    whatsapp_messages_sent: number;
    ai_credits_used: number;
    alert_executions: number;
  };
}

interface User {
  id: string;
  role: string;
  is_active: boolean;
  created_at: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    status: string;
    last_login_at?: string;
    avatar_url?: string;
  };
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
  description: string;
  is_active: boolean;
  is_first: boolean;
  allowed_users: string[];
  icon: string;
}

interface Report {
  id: string;
  name: string;
  workspace_id?: string;
  connection_id?: string;
}

interface RouteParams {
  params: Promise<{ id: string }>;
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

export default function GroupDetailPage({ params }: RouteParams) {
  const router = useRouter();
  const [groupId, setGroupId] = useState<string>('');
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
  
  const [showScreenModal, setShowScreenModal] = useState(false);
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null);
  const [savingScreen, setSavingScreen] = useState(false);
  const [screenFormData, setScreenFormData] = useState<ScreenFormData>({
    title: '',
    report_id: '',
    page_name: '',
    description: '',
    is_active: true,
    is_first: false,
    allowed_users: [],
    icon: 'Monitor',
  });
  const [screenError, setScreenError] = useState('');

  useEffect(() => {
    params.then(({ id }) => {
      setGroupId(id);
    });
  }, [params]);

  useEffect(() => {
    if (groupId) {
      loadGroup();
      loadUsers();
      loadScreens();
      loadReports();
    }
  }, [groupId]);

  async function loadGroup() {
    try {
      setLoading(true);
      const res = await fetch(`/api/dev/groups/${groupId}`);
      
      if (res.status === 403 || res.status === 404) {
        router.push('/dev/groups');
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
      const res = await fetch(`/api/dev/groups/${groupId}/users`);
      
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
      full_name: user.user.full_name,
      email: user.user.email,
      password: '',
      role: user.role,
    });
    setUserError('');
    setShowUserModal(true);
  }

  async function handleSaveUser() {
    if (!userFormData.full_name.trim()) {
      setUserError('Nome é obrigatório');
      return;
    }
    
    if (!userFormData.email.trim()) {
      setUserError('Email é obrigatório');
      return;
    }
    
    if (!editingUser && !userFormData.password) {
      setUserError('Senha é obrigatória para novo usuário');
      return;
    }

    try {
      setSavingUser(true);
      setUserError('');
      
      const payload: any = {
        full_name: userFormData.full_name.trim(),
        email: userFormData.email.trim(),
        role: userFormData.role,
      };
      
      if (userFormData.password) {
        payload.password = userFormData.password;
      }
      
      const res = await fetch(`/api/dev/groups/${groupId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || 'Erro ao salvar usuário');
      }
      
      setShowUserModal(false);
      loadUsers();
      loadGroup();
    } catch (err: any) {
      setUserError(err.message);
    } finally {
      setSavingUser(false);
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm('Tem certeza que deseja remover este usuário do grupo?')) {
      return;
    }

    try {
      const res = await fetch(`/api/dev/groups/${groupId}/users?user_id=${userId}`, {
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
      const res = await fetch(`/api/dev/groups/${groupId}/users/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          new_password: newPassword,
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

  async function loadScreens() {
    try {
      setScreensLoading(true);
      const res = await fetch(`/api/dev/groups/${groupId}/screens`);
      
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

  function openNewScreen() {
    setEditingScreen(null);
    setScreenFormData({
      title: '',
      report_id: '',
      page_name: '',
      description: '',
      is_active: true,
      is_first: false,
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
      description: screen.description || '',
      is_active: screen.is_active,
      is_first: screen.is_first,
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
        description: screenFormData.description.trim(),
        is_active: screenFormData.is_active,
        is_first: screenFormData.is_first,
        allowed_users: screenFormData.allowed_users,
        icon: screenFormData.icon,
      };
      
      const url = editingScreen 
        ? `/api/dev/groups/${groupId}/screens/${editingScreen.id}`
        : `/api/dev/groups/${groupId}/screens`;
      
      const method = editingScreen ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
      const res = await fetch(`/api/dev/groups/${groupId}/screens/${screenId}`, {
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
            onClick={() => router.push('/dev/groups')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar para grupos
          </button>
        </div>
      </MainLayout>
    );
  }

  const usersCount = users.filter(u => u.is_active).length;
  const screensCount = group.screens?.length || 0;
  const alertsCount = group.alerts?.length || 0;
  const usageToday = group.usage_today || { whatsapp_messages_sent: 0, ai_credits_used: 0, alert_executions: 0 };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dev/groups')}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
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
              <p className="text-gray-500 mt-1">{group.slug}</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dev/groups')}
            className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
          >
            <Edit2 className="w-5 h-5" />
            Editar
          </button>
        </div>

        {/* Cards de Informações */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Dados da Empresa */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Dados da Empresa
            </h3>
            <div className="space-y-3 text-sm">
              {group.document && (
                <div>
                  <span className="text-gray-500">CNPJ:</span>
                  <p className="font-medium text-gray-900">
                    {group.document.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
                  </p>
                </div>
              )}
              {group.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{group.email}</span>
                </div>
              )}
              {group.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-900">{group.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Responsável */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              Responsável
            </h3>
            <div className="space-y-3 text-sm">
              {group.responsible_name ? (
                <>
                  <div>
                    <span className="text-gray-500">Nome:</span>
                    <p className="font-medium text-gray-900">{group.responsible_name}</p>
                  </div>
                  {group.responsible_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{group.responsible_email}</span>
                    </div>
                  )}
                  {group.responsible_phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-900">{group.responsible_phone}</span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-400">Não informado</p>
              )}
            </div>
          </div>

          {/* Endereço */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-red-600" />
              Endereço
            </h3>
            <div className="space-y-2 text-sm text-gray-900">
              {group.address_street ? (
                <>
                  <p>
                    {group.address_street}, {group.address_number}
                    {group.address_complement && ` - ${group.address_complement}`}
                  </p>
                  <p>{group.address_neighborhood}</p>
                  <p>
                    {group.address_city} - {group.address_state}
                  </p>
                  {group.address_zip && (
                    <p className="text-gray-500">
                      CEP: {group.address_zip.replace(/^(\d{5})(\d{3})$/, '$1-$2')}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-gray-400">Não informado</p>
              )}
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
                <Monitor className="w-4 h-4 text-cyan-600" />
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
                <AlertCircle className="w-4 h-4 text-amber-600" />
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
                <Mail className="w-4 h-4 text-green-600" />
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

            {/* IA/dia */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">IA/dia</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-2">
                {usageToday.ai_credits_used} / {group.quota_ai_credits_per_day || '∞'}
              </p>
              {group.quota_ai_credits_per_day && (
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${getProgressColor(usageToday.ai_credits_used, group.quota_ai_credits_per_day)}`}
                    style={{ width: `${Math.min((usageToday.ai_credits_used / group.quota_ai_credits_per_day) * 100, 100)}%` }}
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
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Novo Usuário
            </button>
          </div>

          {usersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhum usuário cadastrado neste grupo
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
                  {users.map((userMembership) => (
                    <tr key={userMembership.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <span className="font-medium text-gray-900">
                          {userMembership.user.full_name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {userMembership.user.email}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {userMembership.role}
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
                            onClick={() => handleResetPassword(userMembership.user.id)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title="Resetar senha"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(userMembership.user.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
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
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                        {screen.is_first && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                            Inicial
                          </span>
                        )}
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
                  
                  {screen.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">{screen.description}</p>
                  )}
                  
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

      {/* Modal de Usuário */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <button
                onClick={() => setShowUserModal(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="p-6 space-y-4">
              {userError && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                  {userError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={userFormData.full_name}
                  onChange={(e) => setUserFormData({ ...userFormData, full_name: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={userFormData.email}
                  onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha {!editingUser && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  placeholder={editingUser ? 'Deixe em branco para manter' : ''}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Perfil
                </label>
                <select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="viewer">Visualizador</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveUser}
                disabled={savingUser}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {savingUser ? (
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

      {/* Modal de Tela */}
      {showScreenModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingScreen ? 'Editar Tela' : 'Nova Tela'}
              </h2>
              <button
                onClick={() => setShowScreenModal(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {screenError && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                  {screenError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Título <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={screenFormData.title}
                  onChange={(e) => setScreenFormData({ ...screenFormData, title: e.target.value })}
                  required
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
                  required
                >
                  <option value="">Selecione um relatório</option>
                  {reports.map(report => (
                    <option key={report.id} value={report.id}>{report.name}</option>
                  ))}
                </select>
                {reportsLoading && (
                  <p className="text-xs text-gray-500 mt-1">Carregando relatórios...</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ícone
                </label>
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
                        title={iconName}
                      >
                        <IconComponent className={`w-5 h-5 mx-auto ${
                          screenFormData.icon === iconName ? 'text-blue-600' : 'text-gray-600'
                        }`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Página
                </label>
                <input
                  type="text"
                  value={screenFormData.page_name}
                  onChange={(e) => setScreenFormData({ ...screenFormData, page_name: e.target.value })}
                  placeholder="Opcional - nome da página específica"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <textarea
                  value={screenFormData.description}
                  onChange={(e) => setScreenFormData({ ...screenFormData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={screenFormData.is_active}
                    onChange={(e) => setScreenFormData({ ...screenFormData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Tela Ativa</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={screenFormData.is_first}
                    onChange={(e) => setScreenFormData({ ...screenFormData, is_first: e.target.checked })}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Tela Inicial</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Usuários com Acesso
                </label>
                <div className="border border-gray-200 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                  {users.filter(u => u.is_active).length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum usuário ativo no grupo</p>
                  ) : (
                    users.filter(u => u.is_active).map((userMembership) => (
                      <label key={userMembership.user.id} className="flex items-center gap-2 hover:bg-gray-50 p-2 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={screenFormData.allowed_users.includes(userMembership.user.id)}
                          onChange={() => toggleUserAccess(userMembership.user.id)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{userMembership.user.full_name}</span>
                        <span className="text-xs text-gray-500">({userMembership.user.email})</span>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Se nenhum usuário for selecionado, todos terão acesso
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowScreenModal(false)}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveScreen}
                disabled={savingScreen}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
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
    </MainLayout>
  );
}
