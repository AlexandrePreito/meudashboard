'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import { useMenu } from '@/contexts/MenuContext';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Layers,
  FileText,
  Eye,
  EyeOff,
  Copy,
  Search,
  Filter,
  Monitor,
  BarChart3,
  PieChart,
  TrendingUp,
  Activity,
  DollarSign,
  Users,
  ShoppingCart,
  Package,
  Truck,
  Factory,
  LucideIcon,
  Database
} from 'lucide-react';

interface Report {
  id: string;
  name: string;
  connection?: {
    company_group_id?: string;
  };
}

interface Screen {
  id: string;
  title: string;
  icon: string;
  is_active: boolean;
  is_first: boolean;
  display_order: number;
  is_public?: boolean;
  page_name?: string;
  description?: string;
  report: Report;
  company_group: {
    id: string;
    name: string;
  };
}

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  memberships?: {
    company_group: {
      id: string;
      name: string;
    } | null;
  }[];
}

const ICONS = [
  'Monitor', 'BarChart3', 'FileText', 'PieChart', 'TrendingUp', 'Activity', 
  'DollarSign', 'Users', 'ShoppingCart', 'Package', 'Truck', 'Factory'
];

// Mapeamento de nomes de ícones para componentes
const ICON_MAP: Record<string, LucideIcon> = {
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
  Factory
};

// Função para renderizar o ícone
function renderIcon(iconName: string, size: number = 20, className?: string) {
  const IconComponent = ICON_MAP[iconName] || Monitor;
  return <IconComponent size={size} className={className} />;
}

// Componente interno que usa o contexto
function TelasContent() {
  const { activeGroup } = useMenu();
  const [screens, setScreens] = useState<Screen[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [availablePages, setAvailablePages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingScreen, setEditingScreen] = useState<Screen | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userRole, setUserRole] = useState<string>('user');
  const [accessDenied, setAccessDenied] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [screenToDelete, setScreenToDelete] = useState<Screen | null>(null);
  
  const [form, setForm] = useState({
    report_id: '',
    title: '',
    icon: 'Monitor',
    is_active: true,
    is_public: true,
    page_name: '',
    allowed_users: [] as string[]
  });

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  useEffect(() => {
    if (userRole !== 'user') {
      loadData(activeGroup);
    }
  }, [activeGroup, userRole]);

  useEffect(() => {
    if (form.report_id && showModal) {
      fetchPagesForReport(form.report_id);
    } else {
      setAvailablePages([]);
    }
  }, [form.report_id, showModal]);

  async function checkAccessAndLoad() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      
      if (data.user) {
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

  async function loadData(currentGroup?: { id: string; name: string } | null) {
    try {
      // Montar URL com filtro de grupo se houver grupo ativo
      const screensUrl = currentGroup
        ? `/api/powerbi/screens?group_id=${currentGroup.id}`
        : '/api/powerbi/screens';
      
      const [screensRes, reportsRes, usersRes] = await Promise.all([
        fetch(screensUrl),
        fetch('/api/powerbi/reports'),
        fetch('/api/config/users')
      ]);

      if (screensRes.ok) {
        const data = await screensRes.json();
        setScreens(data.screens || []);
      }

      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setReports(data.reports || []);
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        console.log('DEBUG - users loaded:', data);
        console.log('DEBUG - Total de usuários carregados:', data.users?.length || 0);
        console.log('DEBUG - Usuários:', data.users);
        setUsers(data.users || []);
      } else {
        console.log('DEBUG - users error:', usersRes.status, await usersRes.text());
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
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

  async function openModal(screen?: Screen) {
    if (screen) {
      setEditingScreen(screen);
      
      // Buscar usuários permitidos
      let allowedUsers: string[] = [];
      try {
        const res = await fetch(`/api/powerbi/screens/${screen.id}/users`);
        if (res.ok) {
          const data = await res.json();
          // Pode retornar { users: [...] } ou array direto
          if (data.users) {
            allowedUsers = data.users.map((u: User) => u.id);
          } else if (Array.isArray(data)) {
            allowedUsers = data.map((u: User) => u.id);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar usuários permitidos:', error);
      }
      
      setForm({
        report_id: screen.report?.id || '',
        title: screen.title,
        icon: screen.icon,
        is_active: screen.is_active,
        is_public: screen.is_public ?? true,
        page_name: (screen as any).page_name || '',
        allowed_users: allowedUsers
      });
    } else {
      setEditingScreen(null);
      setForm({
        report_id: reports[0]?.id || '',
        title: '',
        icon: 'Monitor',
        is_active: true,
        is_public: true,
        page_name: '',
        allowed_users: []
      });
    }
    console.log('DEBUG - editingScreen:', screen);
    console.log('DEBUG - users:', users);
    console.log('DEBUG - screenGroupId:', screen?.company_group?.id);
    setUserSearchTerm('');
    setShowModal(true);
  }

  function handleCopy(screen: Screen) {
    setEditingScreen(null); // Não está editando, está criando novo
    setForm({
      report_id: screen.report?.id || '',
      title: `${screen.title} (Cópia)`,
      icon: screen.icon,
      is_active: screen.is_active,
      is_public: screen.is_public ?? true,
      page_name: (screen as any).page_name || '',
      allowed_users: []
    });
    setUserSearchTerm('');
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingScreen 
        ? `/api/powerbi/screens/${editingScreen.id}`
        : '/api/powerbi/screens';

      // Pegar o company_group_id do relatório selecionado
      const selectedReport = reports.find(r => r.id === form.report_id);
      const company_group_id = selectedReport?.connection?.company_group_id;

      const body = {
        ...form,
        company_group_id,
        is_public: form.is_public,
        page_name: form.page_name,
        user_ids: form.is_public ? [] : form.allowed_users
      };

      const res = await fetch(url, {
        method: editingScreen ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        setShowModal(false);
        loadData(activeGroup);
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar tela');
    } finally {
      setSaving(false);
    }
  }

  function openDeleteModal(screen: Screen) {
    setScreenToDelete(screen);
    setShowDeleteModal(true);
  }

  function closeDeleteModal() {
    setShowDeleteModal(false);
    setScreenToDelete(null);
  }

  async function handleDelete() {
    if (!screenToDelete) return;

    try {
      const res = await fetch(`/api/powerbi/screens/${screenToDelete.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        closeDeleteModal();
        loadData(activeGroup);
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir tela');
    }
  }

  async function toggleActive(screen: Screen) {
    try {
      const res = await fetch(`/api/powerbi/screens/${screen.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !screen.is_active })
      });

      if (res.ok) {
        loadData(activeGroup);
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  }


  if (accessDenied) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Database className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Acesso restrito</h2>
        <p className="text-gray-500 mb-4">Este modulo nao esta disponivel para seu perfil.</p>
        <p className="text-sm text-gray-400">Apenas administradores podem acessar.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Telas</h1>
            <p className="text-gray-500">Gerencie as telas disponíveis para os usuários</p>
          </div>
          <Button
            onClick={() => openModal()}
            disabled={reports.length === 0}
            icon={<Plus size={20} />}
          >
            Nova Tela
          </Button>
        </div>

        {reports.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
            <FileText size={20} className="text-yellow-600" />
            <p className="text-yellow-800">
              Você precisa cadastrar um <a href="/powerbi/relatorios" className="font-medium underline">relatório</a> antes de criar telas.
            </p>
          </div>
        )}

        {/* Campos de Busca e Filtro */}
        {screens.length > 0 && (
          <div className="flex gap-4">
            {/* Campo de Busca */}
            <div className="flex-1 relative">
              <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por título ou relatório..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Filtro por Grupo */}
            <div className="relative min-w-[250px]">
              <Filter size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none"
              >
                <option value="">Todos os grupos</option>
                {Array.from(new Set(screens.map(s => s.company_group?.name).filter(Boolean))).map((groupName) => (
                  <option key={groupName} value={groupName}>{groupName}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {screens.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100">
            <Layers size={48} className="mx-auto text-gray-300 mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">Nenhuma tela</h2>
            <p className="text-gray-500 mb-4">Crie sua primeira tela para os usuários</p>
            {reports.length > 0 && (
              <Button onClick={() => openModal()}>
                Criar Tela
              </Button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Tela</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Relatório</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Grupo</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {screens
                  .filter(screen => {
                    // Filtro de busca
                    if (searchTerm) {
                      const term = searchTerm.toLowerCase();
                      const matchesSearch = 
                        screen.title.toLowerCase().includes(term) ||
                        screen.report?.name.toLowerCase().includes(term);
                      if (!matchesSearch) return false;
                    }
                    
                    // Filtro de grupo
                    if (filterGroup && screen.company_group?.name !== filterGroup) {
                      return false;
                    }
                    
                    return true;
                  })
                  .map((screen) => (
                  <tr key={screen.id} className={`hover:bg-gray-50 ${!screen.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          {renderIcon(screen.icon, 18, 'text-blue-600')}
                        </div>
                        <div className="font-medium text-gray-900">{screen.title}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{screen.report?.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{screen.company_group?.name}</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleActive(screen)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          screen.is_active 
                            ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                        title={screen.is_active ? 'Ativa' : 'Inativa'}
                      >
                        {screen.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => openModal(screen)}
                        className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg mr-1"
                        title="Editar"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleCopy(screen)}
                        className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg mr-1"
                        title="Copiar"
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(screen)}
                        className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingScreen ? 'Editar Tela' : 'Nova Tela'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relatório</label>
                <select
                  value={form.report_id}
                  onChange={(e) => setForm({ ...form, report_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                  disabled={!!editingScreen}
                >
                  <option value="">Selecione um relatório</option>
                  {reports.map((report) => (
                    <option key={report.id} value={report.id}>{report.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ex: Dashboard Financeiro"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Ícone</label>
                <div className="grid grid-cols-6 gap-2">
                  {ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setForm({ ...form, icon })}
                      className={`p-3 rounded-lg border-2 transition-colors ${
                        form.icon === icon 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      title={icon}
                    >
                      {renderIcon(icon, 20, form.icon === icon ? 'text-blue-600' : 'text-gray-600')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 bg-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700">Ativa</span>
                </label>
              </div>

              {/* Seção de Visibilidade */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Visibilidade
                </label>
                
                {/* Toggle Público/Privado */}
                <div className="flex items-center mb-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.is_public}
                      onChange={(e) => setForm({ 
                        ...form, 
                        is_public: e.target.checked, 
                        allowed_users: e.target.checked ? [] : form.allowed_users 
                      })}
                      className="sr-only"
                    />
                    <div className={`w-11 h-6 rounded-full transition-colors ${
                      form.is_public ? 'bg-blue-600' : 'bg-gray-200'
                    }`}>
                      <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${
                        form.is_public ? 'translate-x-5' : ''
                      }`} />
                    </div>
                    <span className="ml-3 text-sm font-medium text-gray-700">
                      {form.is_public ? 'Todos podem ver' : 'Privado'}
                    </span>
                  </label>
                </div>

                {/* Lista de Usuários - APENAS SE PRIVADO */}
                {!form.is_public && (
                  <div>
                    {/* Campo de Busca */}
                    <div className="relative mb-3">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Buscar usuários..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    {/* Lista de Usuários com Checkboxes */}
                    <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg bg-white">
                      {users
                        .filter(user => {
                          // Filtrar por company_group
                          let groupId: string | undefined;
                          
                          if (editingScreen?.company_group?.id) {
                            groupId = editingScreen.company_group.id;
                          } else if (form.report_id) {
                            const selectedReport = reports.find((r: any) => r.id === form.report_id);
                            groupId = selectedReport?.connection?.company_group_id;
                          }
                          
                          // Se tem grupo definido, filtrar por grupo
                          if (groupId && user.memberships) {
                            const userInGroup = user.memberships.some(
                              (m: any) => m.company_group?.id === groupId && m.is_active
                            );
                            if (!userInGroup) return false;
                          }

                          // Filtrar por busca
                          if (userSearchTerm.trim()) {
                            const term = userSearchTerm.toLowerCase().trim();
                            const matchName = user.full_name?.toLowerCase().includes(term);
                            const matchEmail = user.email?.toLowerCase().includes(term);
                            return matchName || matchEmail;
                          }

                          return true;
                        })
                        .map(user => (
                          <label
                            key={user.id}
                            className="flex items-center p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <input
                              type="checkbox"
                              checked={form.allowed_users.includes(user.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setForm({ 
                                    ...form, 
                                    allowed_users: [...form.allowed_users, user.id] 
                                  });
                                } else {
                                  setForm({ 
                                    ...form, 
                                    allowed_users: form.allowed_users.filter(id => id !== user.id) 
                                  });
                                }
                              }}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded accent-blue-600"
                            />
                            <div className="ml-3 flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {user.full_name}
                              </div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </div>
                          </label>
                        ))}
                      
                      {/* Mensagem quando não há usuários */}
                      {users.filter(user => {
                        let groupId: string | undefined;
                        
                        if (editingScreen?.company_group?.id) {
                          groupId = editingScreen.company_group.id;
                        } else if (form.report_id) {
                          const selectedReport = reports.find((r: any) => r.id === form.report_id);
                          groupId = selectedReport?.connection?.company_group_id;
                        }
                        
                        if (groupId && user.memberships) {
                          const userInGroup = user.memberships.some(
                            (m: any) => m.company_group?.id === groupId && m.is_active
                          );
                          if (!userInGroup) return false;
                        }

                        if (userSearchTerm.trim()) {
                          const term = userSearchTerm.toLowerCase().trim();
                          const matchName = user.full_name?.toLowerCase().includes(term);
                          const matchEmail = user.email?.toLowerCase().includes(term);
                          return matchName || matchEmail;
                        }

                        return true;
                      }).length === 0 && (
                        <div className="p-4 text-center text-sm text-gray-500">
                          {userSearchTerm.trim() 
                            ? 'Nenhum usuário encontrado' 
                            : 'Nenhum usuário disponível neste grupo'}
                        </div>
                      )}
                    </div>

                    {/* Contador de usuários selecionados */}
                    {form.allowed_users.length > 0 && (
                      <div className="mt-2 text-xs text-gray-600">
                        {form.allowed_users.length} usuário(s) selecionado(s)
                      </div>
                    )}
                    
                    {/* Aviso se nenhum usuário selecionado */}
                    {form.allowed_users.length === 0 && (
                      <div className="mt-2 text-xs text-gray-500 italic">
                        Se nenhum usuário for selecionado, todos terão acesso
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4 justify-end">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <Button
                  type="submit"
                  loading={saving}
                >
                  {saving ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {showDeleteModal && screenToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md shadow-xl">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Excluir Tela</h3>
                  <p className="text-sm text-gray-500">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              
              <p className="text-gray-700 mb-6">
                Tem certeza que deseja excluir a tela <span className="font-semibold">"{screenToDelete.title}"</span>?
              </p>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={closeDeleteModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  Excluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Componente principal exportado
export default function TelasPage() {
  return (
    <MainLayout>
      <TelasContent />
    </MainLayout>
  );
}




