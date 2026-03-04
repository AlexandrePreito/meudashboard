'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import {
  Users,
  Search,
  Loader2,
  Building2,
  Mail,
  Calendar,
  CheckCircle,
  XCircle,
  Shield,
  Crown,
  Code,
  Trash2,
  Pencil,
  Power,
  X,
  Copy,
  Check,
  KeyRound
} from 'lucide-react';
import Pagination, { PAGE_SIZE } from '@/components/ui/Pagination';

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_master: boolean;
  is_developer: boolean;
  is_active: boolean;
  groups: { id: string; name: string }[];
  created_at: string;
  developer_name?: string;
}

export default function AdminUsuariosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [page, setPage] = useState(1);

  // Modal de edição
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ full_name: '', email: '', is_active: true });
  const [saving, setSaving] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users');

      if (res.status === 403) {
        router.push('/dashboard');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error('Erro ao carregar usuarios:', error);
    } finally {
      setLoading(false);
    }
  }

  function openEditModal(user: User) {
    setEditingUser(user);
    setEditForm({
      full_name: user.full_name || '',
      email: user.email || '',
      is_active: user.is_active !== false
    });
    setTempPassword(null);
    setEditModalOpen(true);
  }

  function closeEditModal() {
    setEditModalOpen(false);
    setEditingUser(null);
    setTempPassword(null);
  }

  async function handleSave() {
    if (!editingUser) return;
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: editForm.full_name,
          email: editForm.email,
          is_active: editForm.is_active
        })
      });

      if (res.ok) {
        const data = await res.json();
        setEditingUser({
          ...editingUser,
          full_name: data.user?.full_name ?? editingUser.full_name,
          email: data.user?.email ?? editingUser.email,
          is_active: data.user?.status === 'active',
          groups: editingUser.groups
        });
        setEditForm({
          full_name: data.user?.full_name ?? editForm.full_name,
          email: data.user?.email ?? editForm.email,
          is_active: data.user?.status === 'active'
        });
        loadUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar');
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setSaving(false);
    }
  }

  async function handleResetPassword() {
    if (!editingUser) return;
    if (!confirm('Gerar uma nova senha temporária? O usuário precisará usar essa senha para fazer login.')) return;

    try {
      setResettingPassword(true);
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset_password: true })
      });

      if (res.ok) {
        const data = await res.json();
        setTempPassword(data.temp_password || null);
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao resetar senha');
      }
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setResettingPassword(false);
    }
  }

  async function handleDeleteFromModal() {
    if (!editingUser) return;
    if (!confirm('Tem certeza que deseja excluir este usuario?')) return;

    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, { method: 'DELETE' });
      if (res.ok) {
        closeEditModal();
        loadUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  }

  function copyTempPassword() {
    if (tempPassword) {
      navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleToggleStatus(userId: string, currentStatus: boolean) {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (res.ok) {
        loadUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao atualizar');
      }
    } catch (error) {
      console.error('Erro:', error);
    }
  }

  function getRoleBadge(user: User) {
    if (user.is_master) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded-full text-xs">
          <Crown className="w-3 h-3" /> Master
        </span>
      );
    }
    if (user.is_developer) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs">
          <Code className="w-3 h-3" /> Dev
        </span>
      );
    }
    if (user.role === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-xs">
          <Shield className="w-3 h-3" /> Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-50 text-gray-700 rounded-full text-xs">
        <Users className="w-3 h-3" /> Usuario
      </span>
    );
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterRole === 'all') return matchesSearch;
    if (filterRole === 'master') return matchesSearch && user.is_master;
    if (filterRole === 'developer') return matchesSearch && user.is_developer;
    if (filterRole === 'admin') return matchesSearch && user.role === 'admin';
    if (filterRole === 'user') return matchesSearch && !user.is_master && !user.is_developer && user.role !== 'admin';

    return matchesSearch;
  });
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterRole]);
  const paginatedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500 mt-1">Todos os usuarios do sistema</p>
        </div>

        {/* Filtros */}
        <div className="card-modern p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="w-full sm:w-48">
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="all">Todos os perfis</option>
                <option value="master">Master</option>
                <option value="developer">Desenvolvedor</option>
                <option value="admin">Admin</option>
                <option value="user">Usuario</option>
              </select>
            </div>
          </div>
        </div>

        {/* Estatisticas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card-modern p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            <p className="text-sm text-gray-500">Total</p>
          </div>
          <div className="card-modern p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {users.filter(u => u.is_master).length}
            </p>
            <p className="text-sm text-gray-500">Masters</p>
          </div>
          <div className="card-modern p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {users.filter(u => u.is_developer).length}
            </p>
            <p className="text-sm text-gray-500">Devs</p>
          </div>
          <div className="card-modern p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.role === 'admin').length}
            </p>
            <p className="text-sm text-gray-500">Admins</p>
          </div>
          <div className="card-modern p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {users.filter(u => u.is_active !== false).length}
            </p>
            <p className="text-sm text-gray-500">Ativos</p>
          </div>
        </div>

        {/* Lista */}
        <div className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Users className="w-12 h-12 mb-2 text-gray-300" />
              <p>Nenhum usuario encontrado</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto bg-white rounded-lg">
                <table className="w-full table-modern">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>Perfil</th>
                      <th>Grupos</th>
                      <th className="text-center">Status</th>
                      <th className="text-center">Criado em</th>
                      <th className="text-center">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user) => (
                      <tr key={user.id} className="cursor-pointer hover:bg-gray-50" onClick={() => openEditModal(user)}>
                        <td>
                          <div>
                            <p className="font-medium text-gray-900">{user.full_name || 'Sem nome'}</p>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {user.email}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {getRoleBadge(user)}
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          {user.groups.length === 0 ? (
                            <span className="text-sm text-gray-400">Nenhum grupo</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {user.groups.slice(0, 2).map((group) => (
                                <span key={group.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                                  <Building2 className="w-3 h-3" /> {group.name}
                                </span>
                              ))}
                              {user.groups.length > 2 && (
                                <span className="text-xs text-gray-500">+{user.groups.length - 2}</span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          {user.is_active !== false ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                              <CheckCircle className="w-3 h-3" /> Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-full text-sm">
                              <XCircle className="w-3 h-3" /> Inativo
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-sm text-gray-500" onClick={(e) => e.stopPropagation()}>
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditModal(user)}
                              className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(user.id, user.is_active !== false)}
                              className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title={user.is_active !== false ? 'Desativar' : 'Ativar'}
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4">
                <Pagination totalItems={filteredUsers.length} currentPage={page} onPageChange={setPage} pageSize={PAGE_SIZE} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modal de Edição */}
      {editModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={closeEditModal} />
          <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Editar Usuario</h2>
              <button
                onClick={closeEditModal}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={editForm.full_name}
                  onChange={(e) => setEditForm((f) => ({ ...f, full_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <button
                  type="button"
                  onClick={() => setEditForm((f) => ({ ...f, is_active: !f.is_active }))}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    editForm.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {editForm.is_active ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                  {editForm.is_active ? 'Ativo' : 'Inativo'}
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Grupos</label>
                <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                  {editingUser.groups.length === 0 ? (
                    <span className="text-gray-400">Nenhum grupo</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {editingUser.groups.map((g) => (
                        <span key={g.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                          <Building2 className="w-3 h-3" /> {g.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Somente leitura - gerencie grupos em outra tela</p>
                </div>
              </div>

              {/* Resetar Senha */}
              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Resetar Senha</label>
                {tempPassword ? (
                  <div className="space-y-2">
                    <p className="text-sm text-amber-700 font-medium">Anote esta senha, ela nao sera exibida novamente.</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 px-3 py-2 bg-gray-100 rounded-lg font-mono text-sm select-all">
                        {tempPassword}
                      </div>
                      <button
                        onClick={copyTempPassword}
                        className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                        title="Copiar"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleResetPassword}
                    disabled={resettingPassword}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <KeyRound className="w-4 h-4" />
                    {resettingPassword ? 'Gerando...' : 'Resetar Senha'}
                  </button>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={closeEditModal}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteFromModal}
                className="px-4 py-2 text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors inline-flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" /> Excluir
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
