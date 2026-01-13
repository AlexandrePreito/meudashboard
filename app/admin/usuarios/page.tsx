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
  Trash2
} from 'lucide-react';

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
}

export default function AdminUsuariosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

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

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este usuario?')) return;

    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
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

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500 mt-1">Todos os usuarios do sistema</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
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
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            <p className="text-sm text-gray-500">Total</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {users.filter(u => u.is_master).length}
            </p>
            <p className="text-sm text-gray-500">Masters</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {users.filter(u => u.is_developer).length}
            </p>
            <p className="text-sm text-gray-500">Devs</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.role === 'admin').length}
            </p>
            <p className="text-sm text-gray-500">Admins</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {users.filter(u => u.is_active !== false).length}
            </p>
            <p className="text-sm text-gray-500">Ativos</p>
          </div>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Usuario</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Perfil</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Grupos</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Criado em</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{user.full_name || 'Sem nome'}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {user.email}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {getRoleBadge(user)}
                      </td>
                      <td className="px-4 py-3">
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
                      <td className="px-4 py-3 text-center">
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
                      <td className="px-4 py-3 text-center text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
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
      </div>
    </MainLayout>
  );
}
