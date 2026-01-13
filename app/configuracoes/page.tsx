'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';
import { useMenu } from '@/contexts/MenuContext';
import {
  Users,
  Building2,
  Plus,
  Edit,
  Trash2,
  X,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  Search
} from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  is_master: boolean;
  status: string;
  last_login_at: string | null;
  created_at: string;
  memberships: {
    id: string;
    role: string;
    is_active: boolean;
    company_group: { id: string; name: string } | null;
  }[];
}

interface Group {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  status: string;
  max_users: number;
  max_companies: number;
  max_powerbi_screens: number;
  users_count: number;
  created_at: string;
}

function ConfiguracoesContent() {
  const toast = useToast();
  const { activeGroup } = useMenu();
  const [activeTab, setActiveTab] = useState<'users' | 'groups'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState<{ id?: string; is_master?: boolean; role?: string; adminGroupIds?: string[] } | null>(null);
  const [myProfile, setMyProfile] = useState<User | null>(null);

  // Modais
  const [showUserModal, setShowUserModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form de usuário
  const [userForm, setUserForm] = useState({
    email: '',
    full_name: '',
    phone: '',
    password: '',
    is_master: false,
    company_group_id: '',
    role: 'user'
  });

  // Form de grupo
  const [groupForm, setGroupForm] = useState({
    name: '',
    description: '',
    max_users: 10,
    max_companies: 5,
    max_powerbi_screens: 10
  });

  // Verifica se é usuário comum (não master, não admin)
  const isRegularUser = !currentUser?.is_master && currentUser?.role === 'user';

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!isRegularUser) {
      loadUsers(activeGroup);
    }
  }, [activeGroup]);

  async function loadData() {
    setLoading(true);
    const userData = await loadCurrentUser();
    
    // Se for user comum, carrega apenas o próprio perfil
    if (!userData?.is_master && userData?.role === 'user') {
      await loadMyProfile(userData.id);
    } else {
      await Promise.all([loadUsers(activeGroup), loadGroups()]);
    }
    setLoading(false);
  }

  async function loadMyProfile(userId: string) {
    try {
      const res = await fetch(`/api/config/users?id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setMyProfile(data.user);
        }
      }
    } catch (err) {
      console.error('Erro ao carregar perfil:', err);
    }
  }

  async function loadCurrentUser() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        const userData = {
          id: data.user?.id,
          is_master: data.user?.is_master || false,
          role: data.user?.role || 'user',
          adminGroupIds: data.user?.adminGroupIds || []
        };
        setCurrentUser(userData);
        return userData;
      }
    } catch (err) {
      console.error('Erro ao carregar usuário:', err);
    }
    return null;
  }

  async function loadUsers(currentGroup?: { id: string; name: string } | null) {
    try {
      const usersUrl = currentGroup 
        ? `/api/config/users?group_id=${currentGroup.id}`
        : '/api/config/users';
      const res = await fetch(usersUrl);
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
      const res = await fetch('/api/config/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.error('Erro ao carregar grupos:', err);
    }
  }

  // USUÁRIOS
  function openNewUser() {
    // Se não for master, pré-seleciona o primeiro grupo disponível
    const defaultGroupId = !currentUser?.is_master && groups.length > 0 ? groups[0].id : '';
    
    setUserForm({
      email: '',
      full_name: '',
      phone: '',
      password: '',
      is_master: false,
      company_group_id: defaultGroupId,
      role: 'user'
    });
    setEditingUser(null);
    setShowPassword(false);
    setShowUserModal(true);
  }

  function openEditUser(user: User) {
    setEditingUser(user);
    setUserForm({
      email: user.email,
      full_name: user.full_name,
      phone: user.phone || '',
      password: '',
      is_master: user.is_master,
      company_group_id: user.memberships[0]?.company_group?.id || '',
      role: user.memberships[0]?.role || 'user'
    });
    setShowPassword(false);
    setShowUserModal(true);
  }

  async function saveUser() {
    if (!userForm.email || !userForm.full_name) {
      toast.error('Email e nome são obrigatórios');
      return;
    }
    if (!editingUser && !userForm.password) {
      toast.error('Senha é obrigatória para novo usuário');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        email: userForm.email,
        full_name: userForm.full_name,
        phone: userForm.phone || null,
        is_master: userForm.is_master,
        company_group_id: userForm.company_group_id || null,
        role: userForm.role
      };

      if (userForm.password) {
        payload.password = userForm.password;
      }

      if (editingUser) {
        payload.id = editingUser.id;
      }

      const res = await fetch('/api/config/users', {
        method: editingUser ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingUser ? 'Usuário atualizado!' : 'Usuário criado!');
        setShowUserModal(false);
        loadUsers(activeGroup);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao salvar');
      }
    } catch (err) {
      toast.error('Erro ao salvar usuário');
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(id: string) {
    if (!confirm('Excluir este usuário?')) return;

    try {
      const res = await fetch(`/api/config/users?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.error('Usuário excluído!');
        loadUsers(activeGroup);
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao excluir');
      }
    } catch (err) {
      toast.error('Erro ao excluir usuário');
    }
  }

  // GRUPOS
  function openNewGroup() {
    setGroupForm({
      name: '',
      description: '',
      max_users: 10,
      max_companies: 5,
      max_powerbi_screens: 10
    });
    setEditingGroup(null);
    setShowGroupModal(true);
  }

  function openEditGroup(group: Group) {
    setEditingGroup(group);
    setGroupForm({
      name: group.name,
      description: group.description || '',
      max_users: group.max_users,
      max_companies: group.max_companies,
      max_powerbi_screens: group.max_powerbi_screens
    });
    setShowGroupModal(true);
  }

  async function saveGroup() {
    if (!groupForm.name) {
      toast.error('Nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name: groupForm.name,
        description: groupForm.description || null,
        max_users: groupForm.max_users,
        max_companies: groupForm.max_companies,
        max_powerbi_screens: groupForm.max_powerbi_screens
      };

      if (editingGroup) {
        payload.id = editingGroup.id;
      }

      const res = await fetch('/api/config/groups', {
        method: editingGroup ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingGroup ? 'Grupo atualizado!' : 'Grupo criado!');
        setShowGroupModal(false);
        loadGroups();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao salvar');
      }
    } catch (err) {
      toast.error('Erro ao salvar grupo');
    } finally {
      setSaving(false);
    }
  }

  async function deleteGroup(id: string) {
    if (!confirm('Excluir este grupo?')) return;

    try {
      const res = await fetch(`/api/config/groups?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.error('Grupo excluído!');
        loadGroups();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao excluir');
      }
    } catch (err) {
      toast.error('Erro ao excluir grupo');
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Filtros
  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      user.full_name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term)
    );
  });

  const filteredGroups = groups.filter(group => {
    if (!searchTerm) return true;
    return group.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isRegularUser ? 'Meu Perfil' : 'Configurações'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {isRegularUser ? 'Visualize e edite seus dados' : 'Gerencie usuários e grupos do sistema'}
            </p>
          </div>
          {!isRegularUser && (activeTab === 'users' || currentUser?.is_master) && (
            <Button onClick={activeTab === 'users' ? openNewUser : openNewGroup} icon={<Plus size={20} />}>
              {activeTab === 'users' ? 'Novo Usuário' : 'Novo Grupo'}
            </Button>
          )}
        </div>

        {/* Tabs - esconde para users comuns */}
        {!isRegularUser && (
          <div className="flex gap-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                activeTab === 'users'
                  ? 'text-primary-dark border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users size={20} />
              Usuários ({users.length})
            </button>
            {currentUser?.is_master && (
              <button
                onClick={() => setActiveTab('groups')}
                className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                  activeTab === 'groups'
                    ? 'text-primary-dark border-b-2 border-primary'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <Building2 size={20} />
                Grupos ({groups.length})
              </button>
            )}
          </div>
        )}

        {/* Busca - esconde para users comuns */}
        {!isRegularUser && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder={activeTab === 'users' ? 'Buscar usuários...' : 'Buscar grupos...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
        )}

        {/* Perfil do usuário comum */}
        {isRegularUser && !loading && myProfile && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            {[myProfile].map(user => (
              <div key={user.id} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-medium">
                    {user.full_name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{user.full_name}</h2>
                    <p className="text-gray-500">{user.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-sm text-gray-500">Telefone</p>
                    <p className="font-medium text-gray-900">{user.phone || 'Não informado'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Grupo</p>
                    <p className="font-medium text-gray-900">{user.memberships[0]?.company_group?.name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Último Acesso</p>
                    <p className="font-medium text-gray-900">{formatDate(user.last_login_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Membro desde</p>
                    <p className="font-medium text-gray-900">{formatDate(user.created_at)}</p>
                  </div>
                </div>
                <div className="pt-4">
                  <button
                    onClick={() => openEditUser(user)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Editar Meus Dados
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size={32} />
          </div>
        ) : !isRegularUser ? (
          <>
            {/* Lista de Usuários */}
            {activeTab === 'users' && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Usuário</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Grupo</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Perfil</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Último Acesso</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                          Nenhum usuário encontrado
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium ${
                                user.is_master ? 'bg-purple-600' : 'bg-blue-600'
                              }`}>
                                {user.full_name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{user.full_name}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">
                              {user.memberships[0]?.company_group?.name || '-'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {user.is_master ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                <ShieldCheck size={12} />
                                Master
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                <Shield size={12} />
                                {user.memberships[0]?.role || 'Usuário'}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatDate(user.last_login_at)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditUser(user)}
                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => deleteUser(user.id)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Excluir"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Lista de Grupos */}
            {activeTab === 'groups' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGroups.length === 0 ? (
                  <div className="col-span-full bg-white rounded-xl border border-gray-200 p-8 text-center">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Nenhum grupo encontrado</p>
                  </div>
                ) : (
                  filteredGroups.map((group) => (
                    <div key={group.id} className="bg-white rounded-xl border border-gray-200 p-5">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Building2 className="text-blue-600" size={24} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{group.name}</h3>
                            <p className="text-sm text-gray-500">{group.slug}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditGroup(group)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => deleteGroup(group.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      {group.description && (
                        <p className="text-sm text-gray-600 mb-4">{group.description}</p>
                      )}
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-lg font-bold text-gray-900">{group.users_count}</p>
                          <p className="text-xs text-gray-500">Usuários</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-lg font-bold text-gray-900">{group.max_users}</p>
                          <p className="text-xs text-gray-500">Máx. Users</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2">
                          <p className="text-lg font-bold text-gray-900">{group.max_powerbi_screens}</p>
                          <p className="text-xs text-gray-500">Telas BI</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        ) : null}

        {/* Modal Usuário */}
        {showUserModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                </h2>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo *</label>
                  <input
                    type="text"
                    value={userForm.full_name}
                    onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input
                    type="tel"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Senha {editingUser ? '(deixe vazio para manter)' : '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grupo {!currentUser?.is_master && '*'}</label>
                    {currentUser?.is_master ? (
                      <select
                        value={userForm.company_group_id}
                        onChange={(e) => setUserForm({ ...userForm, company_group_id: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Nenhum</option>
                        {groups.map(group => (
                          <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                      </select>
                    ) : (
                      <select
                        value={userForm.company_group_id}
                        disabled
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-600"
                      >
                        {groups.map(group => (
                          <option key={group.id} value={group.id}>{group.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="user">Usuário</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                {currentUser?.is_master && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_master"
                      checked={userForm.is_master}
                      onChange={(e) => setUserForm({ ...userForm, is_master: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <label htmlFor="is_master" className="text-sm text-gray-700">
                      Usuário Master (acesso total ao sistema)
                    </label>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <Button onClick={saveUser} loading={saving}>
                  {editingUser ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Grupo */}
        {showGroupModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingGroup ? 'Editar Grupo' : 'Novo Grupo'}
                </h2>
                <button
                  onClick={() => setShowGroupModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea
                    value={groupForm.description}
                    onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Usuários</label>
                    <input
                      type="number"
                      value={groupForm.max_users}
                      onChange={(e) => setGroupForm({ ...groupForm, max_users: parseInt(e.target.value) || 10 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Empresas</label>
                    <input
                      type="number"
                      value={groupForm.max_companies}
                      onChange={(e) => setGroupForm({ ...groupForm, max_companies: parseInt(e.target.value) || 5 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telas BI</label>
                    <input
                      type="number"
                      value={groupForm.max_powerbi_screens}
                      onChange={(e) => setGroupForm({ ...groupForm, max_powerbi_screens: parseInt(e.target.value) || 10 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <button
                  onClick={() => setShowGroupModal(false)}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <Button onClick={saveGroup} loading={saving}>
                  {editingGroup ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}

export default function ConfiguracoesPage() {
  return (
    <MainLayout>
      <ConfiguracoesContent />
    </MainLayout>
  );
}

