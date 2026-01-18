'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Users,
  Loader2,
  X,
  Eye,
  EyeOff,
  Mail,
  Building2,
  Filter,
  UserCheck,
  UserX,
  ListOrdered
} from 'lucide-react';
import ScreenOrderModal from './ScreenOrderModal';

const roleLabels: { [key: string]: string } = {
  admin: 'Administrador',
  viewer: 'Visualizador',
  user: 'Usuário',
  developer: 'Desenvolvedor',
  master: 'Master',
};

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  is_active: boolean;
  user_is_active: boolean;
  role: string;
  can_use_ai: boolean;
  can_refresh: boolean;
  membership_id: string;
  company_group_id: string;
  company_group_name: string;
  created_at: string;
}

interface Group {
  id: string;
  name: string;
}

export default function DevUsuariosPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    company_group_id: '',
    role: 'viewer',
    is_active: true,
    can_use_ai: false,
    can_refresh: false
  });

  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [orderingUser, setOrderingUser] = useState<User | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const res = await fetch('/api/dev/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.error('Erro ao carregar usuários:', err);
    } finally {
      setLoading(false);
    }
  }

  function openNewUser() {
    setEditingUser(null);
    setFormData({
      email: '',
      full_name: '',
      password: '',
      company_group_id: groups[0]?.id || '',
      role: 'viewer',
      is_active: true,
      can_use_ai: false,
      can_refresh: false
    });
    setError('');
    setShowPassword(false);
    setShowModal(true);
  }

  function openEditUser(user: User) {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      password: '',
      company_group_id: user.company_group_id,
      role: user.role,
      is_active: user.is_active,
      can_use_ai: user.can_use_ai,
      can_refresh: user.can_refresh
    });
    setError('');
    setShowPassword(false);
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.full_name.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    if (!editingUser) {
      if (!formData.email.trim()) {
        setError('Email é obrigatório');
        return;
      }
      if (!formData.password || formData.password.length < 6) {
        setError('Senha deve ter pelo menos 6 caracteres');
        return;
      }
      if (!formData.company_group_id) {
        setError('Selecione um grupo');
        return;
      }
    }

    try {
      setSaving(true);
      setError('');

      const url = '/api/dev/users';
      const method = editingUser ? 'PUT' : 'POST';

      const payload = editingUser
        ? {
            user_id: editingUser.id,
            membership_id: editingUser.membership_id,
            email: formData.email.trim().toLowerCase(),
            full_name: formData.full_name.trim(),
            role: formData.role,
            is_active: formData.is_active,
            can_use_ai: formData.can_use_ai,
            can_refresh: formData.can_refresh,
            ...(formData.password ? { password: formData.password } : {})
          }
        : {
            email: formData.email.trim().toLowerCase(),
            full_name: formData.full_name.trim(),
            password: formData.password,
            company_group_id: formData.company_group_id,
            role: formData.role
          };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Erro ao salvar');
      }

      setShowModal(false);
      loadUsers();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteConfirm) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/dev/users?membership_id=${deleteConfirm.membership_id}`, {
        method: 'DELETE'
      });

      if (!res.ok) {
        throw new Error('Erro ao remover usuário');
      }

      setDeleteConfirm(null);
      loadUsers();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeleting(false);
    }
  }

  async function toggleUserStatus(user: User) {
    try {
      await fetch('/api/dev/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          membership_id: user.membership_id,
          is_active: !user.is_active
        })
      });
      loadUsers();
    } catch (err) {
      console.error('Erro ao alterar status:', err);
    }
  }

  const filteredUsers = users.filter(user => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSearch =
        user.full_name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term);
      if (!matchesSearch) return false;
    }
    if (filterGroup && user.company_group_id !== filterGroup) return false;
    if (filterStatus === 'active' && !user.is_active) return false;
    if (filterStatus === 'inactive' && user.is_active) return false;
    return true;
  });

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
            <p className="text-gray-500 mt-1">
              {users.length} {users.length === 1 ? 'usuário cadastrado' : 'usuários cadastrados'}
            </p>
          </div>
          <button
            onClick={openNewUser}
            disabled={groups.length === 0}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50"
          >
            <Plus className="w-5 h-5" />
            Novo Usuário
          </button>
        </div>

        {groups.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-yellow-600" />
            <p className="text-yellow-800">
              Você precisa criar um <a href="/dev/groups" className="font-medium underline">grupo</a> antes de cadastrar usuários.
            </p>
          </div>
        )}

        {/* Filtros */}
        {users.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative min-w-[200px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="">Todos os grupos</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <div className="relative min-w-[150px]">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
              >
                <option value="">Todos</option>
                <option value="active">Ativos</option>
                <option value="inactive">Inativos</option>
              </select>
            </div>
          </div>
        )}

        {/* Lista */}
        {users.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum usuário cadastrado</h3>
            <p className="text-gray-500 mb-6">Crie seu primeiro usuário para começar</p>
            {groups.length > 0 && (
              <button
                onClick={openNewUser}
                className="btn-primary inline-flex items-center gap-2 px-6 py-3 rounded-lg"
              >
                <Plus className="w-5 h-5" />
                Criar primeiro usuário
              </button>
            )}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Usuário</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Grupo</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Função</th>
                  <th className="text-center px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredUsers.map((user) => (
                  <tr key={user.membership_id} className={`hover:bg-gray-50 ${!user.is_active ? 'opacity-60' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-full" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-sm font-medium text-blue-600">
                              {user.full_name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{user.full_name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                        <Building2 className="w-3.5 h-3.5" />
                        {user.company_group_name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {roleLabels[user.role] || 'Usuário'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleUserStatus(user)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          user.is_active
                            ? 'bg-green-100 text-green-600 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                        }`}
                        title={user.is_active ? 'Ativo' : 'Inativo'}
                      >
                        {user.is_active ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setOrderingUser(user)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Ordenar Telas"
                      >
                        <ListOrdered className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEditUser(user)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(user)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grupo <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.company_group_id}
                    onChange={(e) => setFormData({ ...formData, company_group_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione um grupo</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome completo"
                />
              </div>

              {!editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email@exemplo.com"
                  />
                </div>
              )}

              {editingUser && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email@exemplo.com"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {editingUser ? 'Nova Senha (deixe vazio para manter)' : 'Senha'} {!editingUser && <span className="text-red-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={editingUser ? '••••••••' : 'Mínimo 6 caracteres'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="viewer">Visualizador</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              {editingUser && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    Usuário ativo
                  </label>
                </div>
              )}

              {editingUser && (
                <div className="pt-4 border-t border-gray-200 space-y-3">
                  <p className="text-sm font-medium text-gray-700">Permissões</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="can_use_ai"
                      checked={formData.can_use_ai}
                      onChange={(e) => setFormData({ ...formData, can_use_ai: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label htmlFor="can_use_ai" className="text-sm text-gray-700">
                      Pode usar Chat IA
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="can_refresh"
                      checked={formData.can_refresh}
                      onChange={(e) => setFormData({ ...formData, can_refresh: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label htmlFor="can_refresh" className="text-sm text-gray-700">
                      Pode atualizar dashboards
                    </label>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
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

      {/* Modal Confirmação Delete */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Remover Usuário</h3>
                <p className="text-sm text-gray-600">
                  Tem certeza que deseja remover <strong>"{deleteConfirm.full_name}"</strong> do grupo <strong>"{deleteConfirm.company_group_name}"</strong>?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Removendo...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Remover
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {orderingUser && (
        <ScreenOrderModal
          userId={orderingUser.id}
          groupId={orderingUser.company_group_id}
          userName={orderingUser.full_name}
          onClose={() => setOrderingUser(null)}
        />
      )}
    </MainLayout>
  );
}
