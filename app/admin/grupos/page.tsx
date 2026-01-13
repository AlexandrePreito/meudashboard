'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import {
  Building2,
  Search,
  Loader2,
  Users,
  Monitor,
  Code,
  Calendar,
  Trash2,
  CheckCircle,
  XCircle,
  Filter
} from 'lucide-react';

interface Group {
  id: string;
  name: string;
  slug: string;
  document?: string;
  email?: string;
  logo_url?: string;
  status: string;
  developer_id: string;
  developer_name: string;
  users_count: number;
  screens_count: number;
  created_at: string;
}

interface Developer {
  id: string;
  name: string;
}

export default function AdminGruposPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Group[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDeveloper, setFilterDeveloper] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      // Carregar grupos
      const groupsRes = await fetch('/api/admin/groups');
      if (groupsRes.status === 403) {
        router.push('/dashboard');
        return;
      }
      if (groupsRes.ok) {
        const data = await groupsRes.json();
        setGroups(data.groups || []);
      }

      // Carregar desenvolvedores para filtro
      const devsRes = await fetch('/api/admin/developers');
      if (devsRes.ok) {
        const data = await devsRes.json();
        setDevelopers(data.developers || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este grupo?')) return;

    try {
      const res = await fetch(`/api/admin/groups/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  }

  const filteredGroups = groups.filter(group => {
    const matchesSearch = 
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.developer_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDeveloper = filterDeveloper === 'all' || group.developer_id === filterDeveloper;
    
    return matchesSearch && matchesDeveloper;
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grupos</h1>
          <p className="text-gray-500 mt-1">Todos os grupos do sistema</p>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou desenvolvedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="w-full sm:w-64">
              <select
                value={filterDeveloper}
                onChange={(e) => setFilterDeveloper(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos os desenvolvedores</option>
                {developers.map((dev) => (
                  <option key={dev.id} value={dev.id}>{dev.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Estatisticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{groups.length}</p>
            <p className="text-sm text-gray-500">Total de Grupos</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {groups.filter(g => g.status === 'active').length}
            </p>
            <p className="text-sm text-gray-500">Ativos</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {groups.reduce((sum, g) => sum + g.users_count, 0)}
            </p>
            <p className="text-sm text-gray-500">Total Usuarios</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {groups.reduce((sum, g) => sum + g.screens_count, 0)}
            </p>
            <p className="text-sm text-gray-500">Total Telas</p>
          </div>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Building2 className="w-12 h-12 mb-2 text-gray-300" />
              <p>Nenhum grupo encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Grupo</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Desenvolvedor</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Usuarios</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Telas</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Criado em</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredGroups.map((group) => (
                    <tr key={group.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {group.logo_url ? (
                            <img src={group.logo_url} alt={group.name} className="w-10 h-10 rounded-lg object-contain" />
                          ) : (
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-blue-600" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{group.name}</p>
                            <p className="text-xs text-gray-500">{group.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 text-sm">
                          <Code className="w-4 h-4 text-purple-500" />
                          <span className="text-gray-700">{group.developer_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                          <Users className="w-3 h-3" /> {group.users_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                          <Monitor className="w-3 h-3" /> {group.screens_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {group.status === 'active' ? (
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
                        {new Date(group.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleDelete(group.id)}
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
