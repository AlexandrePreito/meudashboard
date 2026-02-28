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
  Trash2,
  CheckCircle,
  XCircle,
  Pencil,
  X,
  BarChart3,
  MonitorPlay,
  Bell,
  MessageCircle,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import Pagination, { PAGE_SIZE } from '@/components/ui/Pagination';
import { showToast } from '@/lib/toast';

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
  quota_users?: number | null;
  quota_screens?: number | null;
  quota_alerts?: number | null;
  quota_whatsapp_per_day?: number | null;
  quota_ai_credits_per_day?: number | null;
  quota_refreshes?: number | null;
}

function QuotaRow({
  icon: Icon,
  label,
  value,
  color
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | null | undefined;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <span
        className={`text-sm font-bold ${(value ?? 0) === 0 ? 'text-gray-400' : 'text-gray-900'}`}
      >
        {value ?? 0}
      </span>
    </div>
  );
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
  const [page, setPage] = useState(1);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    slug: '',
    status: 'active',
    logo_url: ''
  });
  const [viewingQuotas, setViewingQuotas] = useState<Group | null>(null);

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

  async function handleSaveGroup() {
    if (!editingGroup) return;
    try {
      const res = await fetch(`/api/admin/groups/${editingGroup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (res.ok) {
        showToast('Grupo atualizado com sucesso', 'success');
        setEditingGroup(null);
        loadData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro ao atualizar', 'error');
      }
    } catch {
      showToast('Erro ao atualizar grupo', 'error');
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este grupo?')) return;

    try {
      const res = await fetch(`/api/admin/groups/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Grupo excluído', 'success');
        loadData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro ao excluir', 'error');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
      showToast('Erro ao excluir grupo', 'error');
    }
  }

  const filteredGroups = groups.filter(group => {
    const matchesSearch = 
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.developer_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDeveloper = filterDeveloper === 'all' || group.developer_id === filterDeveloper;
    
    return matchesSearch && matchesDeveloper;
  });

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterDeveloper]);

  const paginatedGroups = filteredGroups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Grupos</h1>
          <p className="text-gray-500 mt-1">Todos os grupos do sistema</p>
        </div>

        {/* Filtros */}
        <div className="card-modern p-4">
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
          <div className="card-modern p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{groups.length}</p>
            <p className="text-sm text-gray-500">Total de Grupos</p>
          </div>
          <div className="card-modern p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {groups.filter(g => g.status === 'active').length}
            </p>
            <p className="text-sm text-gray-500">Ativos</p>
          </div>
          <div className="card-modern p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {groups.reduce((sum, g) => sum + g.users_count, 0)}
            </p>
            <p className="text-sm text-gray-500">Total Usuarios</p>
          </div>
          <div className="card-modern p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {groups.reduce((sum, g) => sum + g.screens_count, 0)}
            </p>
            <p className="text-sm text-gray-500">Total Telas</p>
          </div>
        </div>

        {/* Lista */}
        <div className="card-modern overflow-hidden">
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
            <>
            <div className="overflow-x-auto">
              <table className="w-full table-modern">
                <thead>
                  <tr>
                    <th>Grupo</th>
                    <th>Desenvolvedor</th>
                    <th className="text-center">Usuarios</th>
                    <th className="text-center">Telas</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Criado em</th>
                    <th className="text-center">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedGroups.map((group) => (
                    <tr key={group.id}>
                      <td>
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
                      <td>
                        <div className="flex items-center gap-2 text-sm">
                          <Code className="w-4 h-4 text-purple-500" />
                          <span className="text-gray-700">{group.developer_name}</span>
                        </div>
                      </td>
                      <td className="text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                          <Users className="w-3 h-3" /> {group.users_count}
                        </span>
                      </td>
                      <td className="text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                          <Monitor className="w-3 h-3" /> {group.screens_count}
                        </span>
                      </td>
                      <td className="text-center">
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
                      <td className="text-center text-sm text-gray-500">
                        {new Date(group.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setEditForm({
                                name: group.name,
                                slug: group.slug || '',
                                status: group.status || 'active',
                                logo_url: group.logo_url || ''
                              });
                              setEditingGroup(group);
                            }}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar grupo"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setViewingQuotas(group)}
                            className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Ver cotas"
                          >
                            <BarChart3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(group.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir grupo"
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
            <div className="mt-4 px-4 pb-4">
              <Pagination
                totalItems={filteredGroups.length}
                currentPage={page}
                onPageChange={setPage}
                pageSize={PAGE_SIZE}
              />
            </div>
            </>
          )}
        </div>

        {/* Modal Editar Grupo */}
        {editingGroup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">Editar Grupo</h2>
                <button
                  onClick={() => setEditingGroup(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
                  <input
                    type="text"
                    value={editForm.slug}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, slug: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, status: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
                  <input
                    type="text"
                    value={editForm.logo_url}
                    onChange={(e) =>
                      setEditForm((prev) => ({ ...prev, logo_url: e.target.value }))
                    }
                    placeholder="https://..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setEditingGroup(null)}
                  className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveGroup}
                  className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Ver Cotas */}
        {viewingQuotas && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Cotas do Grupo</h2>
                  <p className="text-sm text-gray-500">{viewingQuotas.name}</p>
                </div>
                <button
                  onClick={() => setViewingQuotas(null)}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-3">
                <QuotaRow
                  icon={Users}
                  label="Usuários"
                  value={viewingQuotas.quota_users}
                  color="text-indigo-600"
                />
                <QuotaRow
                  icon={MonitorPlay}
                  label="Telas"
                  value={viewingQuotas.quota_screens}
                  color="text-purple-600"
                />
                <QuotaRow
                  icon={Bell}
                  label="Alertas"
                  value={viewingQuotas.quota_alerts}
                  color="text-red-600"
                />
                <QuotaRow
                  icon={MessageCircle}
                  label="WhatsApp/dia"
                  value={viewingQuotas.quota_whatsapp_per_day}
                  color="text-green-600"
                />
                <QuotaRow
                  icon={Sparkles}
                  label="Créditos IA/dia"
                  value={viewingQuotas.quota_ai_credits_per_day}
                  color="text-amber-600"
                />
                <QuotaRow
                  icon={RefreshCw}
                  label="Atualizações/dia"
                  value={viewingQuotas.quota_refreshes}
                  color="text-orange-600"
                />
              </div>

              <div className="mt-6">
                <button
                  onClick={() => setViewingQuotas(null)}
                  className="w-full px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
