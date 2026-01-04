'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  Eye,
  EyeOff,
  Shield,
  ShieldCheck,
  Search
} from 'lucide-react';

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
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    password: '',
    is_master: false,
    company_group_id: '',
    role: 'user'
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadUsers(), loadGroups()]);
    setLoading(false);
  }

  async function loadUsers() {
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

  function resetForm() {
    setFormData({
      email: '',
      full_name: '',
      phone: '',
      password: '',
      is_master: false,
      company_group_id: '',
      role: 'user'
    });
    setEditingUser(null);
    setShowPassword(false);
  }

  function openNewUser() {
    resetForm();
    setShowModal(true);
  }

  function openEditUser(user: User) {
    setEditingUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      phone: user.phone || '',
      password: '',
      is_master: user.is_master,
      company_group_id: user.memberships[0]?.company_group?.id || '',
      role: user.memberships[0]?.role || 'user'
    });
    setShowPassword(false);
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.email || !formData.full_name) {
      alert('Email e nome são obrigatórios');
      return;
    }
    if (!editingUser && !formData.password) {
      alert('Senha é obrigatória para novo usuário');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        email: formData.email,
        full_name: formData.full_name,
        phone: formData.phone || null,
        is_master: formData.is_master,
        company_group_id: formData.company_group_id || null,
        role: formData.role
      };

      if (formData.password) {
        payload.password = formData.password;
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
        alert(editingUser ? 'Usuário atualizado!' : 'Usuário criado!');
        setShowModal(false);
        resetForm();
        loadUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar');
      }
    } catch (err) {
      alert('Erro ao salvar usuário');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este usuário?')) return;

    try {
      const res = await fetch(`/api/config/users?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Usuário excluído!');
        loadUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir');
      }
    } catch (err) {
      alert('Erro ao excluir usuário');
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

  const filteredUsers = users.filter(user => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      user.full_name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term)
    );
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
            <p className="text-gray-500 text-sm mt-1">Gerencie os usuários do sistema</p>
          </div>
          <button
            onClick={openNewUser}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Novo Usuário
          </button>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar usuários..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
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
                            onClick={() => handleDelete(user.id)}
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

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                </h2>
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
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
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grupo</label>
                    <select
                      value={formData.company_group_id}
                      onChange={(e) => setFormData({ ...formData, company_group_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Nenhum</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                    >
                      <option value="user">Usuário</option>
                      <option value="admin">Admin</option>
                      <option value="manager">Gerente</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_master"
                    checked={formData.is_master}
                    onChange={(e) => setFormData({ ...formData, is_master: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor="is_master" className="text-sm text-gray-700">
                    Usuário Master (acesso total ao sistema)
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {editingUser ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
