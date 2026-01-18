'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Users, Search, Plus, Edit, Trash2, Loader2, 
  UserCheck, UserX, MoveVertical
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import ScreenOrderModal from '@/components/admin/ScreenOrderModal';

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  is_active: boolean;
  role: string;
  membership_id: string;
  company_group_id: string;
  can_use_ai: boolean;
  can_refresh: boolean;
  created_at: string;
}

export default function AdminUsuariosPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  useEffect(() => {
    if (groupId) {
      loadUsers();
    }
  }, [groupId]);

  async function loadUsers() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin-group/usuarios?group_id=${groupId}`);
      
      if (!res.ok) {
        throw new Error('Erro ao carregar usuários');
      }

      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('Erro:', err);
      alert('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Tem certeza que deseja remover ${user.full_name} do grupo?`)) {
      return;
    }

    try {
      const res = await fetch(
        `/api/admin-group/usuarios?membership_id=${user.membership_id}&group_id=${groupId}`,
        { method: 'DELETE' }
      );

      if (!res.ok) {
        throw new Error('Erro ao remover usuário');
      }

      alert('Usuário removido com sucesso!');
      loadUsers();
    } catch (err) {
      console.error('Erro:', err);
      alert('Erro ao remover usuário');
    }
  }

  async function handleToggleActive(user: User) {
    try {
      const res = await fetch('/api/admin-group/usuarios', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          membership_id: user.membership_id,
          company_group_id: groupId,
          is_active: !user.is_active
        })
      });

      if (!res.ok) {
        throw new Error('Erro ao atualizar status');
      }

      alert('Status atualizado!');
      loadUsers();
    } catch (err) {
      console.error('Erro:', err);
      alert('Erro ao atualizar status');
    }
  }

  function openOrderModal(user: User) {
    setSelectedUser(user);
    setShowOrderModal(true);
  }

  const filteredUsers = users.filter(u => 
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    const colors: any = {
      admin: 'bg-purple-100 text-purple-700',
      manager: 'bg-blue-100 text-blue-700',
      operator: 'bg-green-100 text-green-700',
      user: 'bg-gray-100 text-gray-700',
      viewer: 'bg-gray-100 text-gray-600'
    };
    
    const labels: any = {
      admin: 'Administrador',
      manager: 'Gerente',
      operator: 'Operador',
      user: 'Usuário',
      viewer: 'Visualizador'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${colors[role] || colors.user}`}>
        {labels[role] || role}
      </span>
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
            <p className="text-gray-500 mt-1">{users.length} usuários cadastrados</p>
          </div>

          <button
            onClick={() => router.push(`/administrador/${groupId}/usuarios/novo`)}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Novo Usuário
          </button>
        </div>

      {/* Search */}
      <div className="bg-white rounded-xl border-2 border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-gray-500">Carregando usuários...</p>
          </div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border-2 border-gray-100">
          <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Nenhum usuário encontrado</p>
          <p className="text-sm text-gray-400 mt-1">
            {search ? 'Tente buscar por outro termo' : 'Comece adicionando um usuário'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border-2 border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Função
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-600 font-semibold text-sm">
                            {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.full_name}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {user.is_active ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                          <UserCheck className="w-3 h-3" />
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                          <UserX className="w-3 h-3" />
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openOrderModal(user)}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          title="Ordenar telas"
                        >
                          <MoveVertical className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => router.push(`/administrador/${groupId}/usuarios/${user.id}`)}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          title={user.is_active ? 'Desativar' : 'Ativar'}
                        >
                          {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
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
        </div>
      )}

        {/* Modal de Ordem */}
        {showOrderModal && selectedUser && (
          <ScreenOrderModal
            userId={selectedUser.id}
            groupId={groupId}
            userName={selectedUser.full_name}
            onClose={() => {
              setShowOrderModal(false);
              setSelectedUser(null);
            }}
          />
        )}
      </div>
    </MainLayout>
  );
}
