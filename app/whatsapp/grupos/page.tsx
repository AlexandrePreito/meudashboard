'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import DatasetSelector from '@/components/whatsapp/DatasetSelector';
import { useMenu } from '@/contexts/MenuContext';
import {
  UsersRound,
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  Search,
  Bell,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface AuthorizedGroup {
  id: string;
  group_id: string;
  group_name: string;
  purpose: string | null;
  can_receive_alerts: boolean;
  is_active: boolean;
  created_at: string;
  instance: { id: string; name: string } | null;
  datasets?: Array<{
    id: string;
    connection_id: string;
    dataset_id: string;
    dataset_name: string;
  }>;
}

interface Instance {
  id: string;
  name: string;
}

function GruposContent() {
  const router = useRouter();
  const { activeGroup } = useMenu();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('loading');
  const [userGroupIds, setUserGroupIds] = useState<string[]>([]);
  
  const [groups, setGroups] = useState<AuthorizedGroup[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<AuthorizedGroup | null>(null);

  const [formData, setFormData] = useState({
    group_id: '',
    group_name: '',
    purpose: '',
    instance_id: '',
    can_receive_alerts: true,
    datasets: [] as Array<{connection_id: string, dataset_id: string, dataset_name: string}>
  });

  useEffect(() => {
    checkAccessAndLoad();
  }, []);

  useEffect(() => {
    if (userRole !== 'user') {
      loadGroups(activeGroup);
    }
  }, [activeGroup, userRole]);

  async function checkAccessAndLoad() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      
      if (!data.user) {
        router.push('/login');
        return;
      }
      
      setUser(data.user);
      
      if (data.user.is_master) {
        setUserRole('master');
      } else if (data.user.is_developer) {
        setUserRole('developer');
      } else if (data.user.role === 'admin') {
        setUserRole('admin');
        setUserGroupIds(data.groupIds || []);
      } else {
        setUserRole('user');
      }
      
      loadData(activeGroup);
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      router.push('/login');
    }
  }

  async function loadData(currentGroup?: { id: string; name: string } | null) {
    setLoading(true);
    await Promise.all([loadGroups(currentGroup), loadInstances()]);
    setLoading(false);
  }

  async function loadGroups(currentGroup?: { id: string; name: string } | null) {
    try {
      const url = currentGroup
        ? `/api/whatsapp/groups?group_id=${currentGroup.id}`
        : '/api/whatsapp/groups';
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.error('Erro ao carregar grupos:', err);
    }
  }

  async function loadInstances() {
    try {
      const res = await fetch('/api/whatsapp/instances');
      if (res.ok) {
        const data = await res.json();
        setInstances(data.instances || []);
      }
    } catch (err) {
      console.error('Erro ao carregar instâncias:', err);
    }
  }

  function resetForm() {
    setFormData({
      group_id: '',
      group_name: '',
      purpose: '',
      instance_id: '',
      can_receive_alerts: true,
      datasets: []
    });
    setEditingGroup(null);
  }

  function openNew() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(group: AuthorizedGroup) {
    setEditingGroup(group);
    setFormData({
      group_id: group.group_id,
      group_name: group.group_name,
      purpose: group.purpose || '',
      instance_id: group.instance?.id || '',
      can_receive_alerts: group.can_receive_alerts,
      datasets: group.datasets?.map(d => ({
        connection_id: d.connection_id,
        dataset_id: d.dataset_id,
        dataset_name: d.dataset_name
      })) || []
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.group_id || !formData.group_name) {
      alert('ID do grupo e nome são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        group_id: formData.group_id,
        group_name: formData.group_name,
        purpose: formData.purpose || null,
        instance_id: formData.instance_id || null,
        can_receive_alerts: formData.can_receive_alerts,
        datasets: formData.datasets
      };

      // Se admin ou developer, adicionar company_group_id
      if (userRole === 'admin' && userGroupIds.length > 0) {
        payload.company_group_id = userGroupIds[0];
      } else if (userRole === 'developer' && activeGroup) {
        payload.company_group_id = activeGroup.id;
      } else if (activeGroup) {
        payload.company_group_id = activeGroup.id;
      }

      if (editingGroup) {
        payload.id = editingGroup.id;
        payload.is_active = editingGroup.is_active;
      }

      const res = await fetch('/api/whatsapp/groups', {
        method: editingGroup ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(editingGroup ? 'Grupo atualizado!' : 'Grupo autorizado!');
        setShowModal(false);
        resetForm();
        loadGroups(activeGroup);
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar');
      }
    } catch (err) {
      alert('Erro ao salvar grupo');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este grupo autorizado?')) return;

    try {
      const res = await fetch(`/api/whatsapp/groups?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Grupo removido!');
        loadGroups(activeGroup);
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao remover');
      }
    } catch (err) {
      alert('Erro ao remover grupo');
    }
  }

  async function toggleActive(group: AuthorizedGroup) {
    try {
      const res = await fetch('/api/whatsapp/groups', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: group.id,
          group_id: group.group_id,
          group_name: group.group_name,
          is_active: !group.is_active
        })
      });

      if (res.ok) {
        loadGroups(activeGroup);
      }
    } catch (err) {
      console.error('Erro ao atualizar:', err);
    }
  }

  const filteredGroups = groups.filter(grp => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      grp.group_name.toLowerCase().includes(term) ||
      grp.group_id.toLowerCase().includes(term)
    );
  });

  // Loading state
  if (userRole === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // Módulos removidos - sempre disponível
  // Verificação de módulo removida

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Grupos Autorizados</h1>
            <p className="text-gray-500 text-sm mt-1">Gerencie os grupos do WhatsApp que podem interagir com o sistema</p>
          </div>
          <Button onClick={openNew} icon={<Plus size={20} />}>
            Novo Grupo
          </Button>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <UsersRound className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum grupo autorizado</h3>
            <p className="text-gray-500 mb-4">Autorize grupos do WhatsApp para interagir com o sistema</p>
            <Button onClick={openNew}>
              Autorizar Grupo
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map((group) => (
              <div key={group.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      group.is_active ? 'bg-purple-100' : 'bg-gray-100'
                    }`}>
                      <UsersRound className={group.is_active ? 'text-purple-600' : 'text-gray-400'} size={24} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900 truncate">{group.group_name}</h3>
                      <p className="text-xs text-gray-500 truncate">{group.group_id}</p>
                    </div>
                  </div>
                </div>

                {group.purpose && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{group.purpose}</p>
                )}

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Instância:</span>
                    <span className="text-gray-900">{group.instance?.name || 'Todas'}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Alertas:</span>
                    <span className={group.can_receive_alerts ? 'text-green-600' : 'text-gray-400'}>
                      {group.can_receive_alerts ? 'Habilitado' : 'Desabilitado'}
                    </span>
                  </div>
                  
                  {/* Datasets */}
                  {group.datasets && group.datasets.length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <span className="text-xs text-gray-500 block mb-1">Datasets:</span>
                      <div className="flex flex-wrap gap-1">
                        {group.datasets.map((d: any) => (
                          <span 
                            key={`${d.connection_id}-${d.dataset_id}`}
                            className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full"
                          >
                            {d.dataset_name || d.dataset_id}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <button
                    onClick={() => toggleActive(group)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                      group.is_active
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {group.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {group.is_active ? 'Ativo' : 'Inativo'}
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(group)}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingGroup ? 'Editar Grupo' : 'Autorizar Grupo'}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Grupo *</label>
                  <input
                    type="text"
                    value={formData.group_name}
                    onChange={(e) => setFormData({ ...formData, group_name: e.target.value })}
                    placeholder="Ex: Vendas - Equipe"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ID do Grupo WhatsApp *
                  </label>
                  <input
                    type="text"
                    value={formData.group_id}
                    onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                    placeholder="120363123456789012@g.us"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formato: 120363...@g.us (obtido via webhook)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Finalidade</label>
                  <input
                    type="text"
                    value={formData.purpose}
                    onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                    placeholder="Ex: Alertas de vendas, Suporte técnico..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instância</label>
                  <select
                    value={formData.instance_id}
                    onChange={(e) => setFormData({ ...formData, instance_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Todas as instâncias</option>
                    {instances.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                  </select>
                </div>

                {/* DatasetSelector */}
                <DatasetSelector
                  companyGroupId={
                    userRole === 'admin' && userGroupIds.length > 0
                      ? userGroupIds[0]
                      : userRole === 'developer' && activeGroup
                      ? activeGroup.id
                      : activeGroup?.id
                  }
                  selectedDatasets={formData.datasets}
                  onChange={(datasets) => setFormData({...formData, datasets})}
                />

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="can_receive_alerts"
                    checked={formData.can_receive_alerts}
                    onChange={(e) => setFormData({ ...formData, can_receive_alerts: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300"
                  />
                  <label htmlFor="can_receive_alerts" className="text-sm text-gray-700 flex items-center gap-2">
                    <Bell size={16} className="text-gray-400" />
                    Pode receber alertas
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl sticky bottom-0">
                <button
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <Button
                  onClick={handleSave}
                  loading={saving}
                >
                  {editingGroup ? 'Salvar' : 'Autorizar'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}

export default function GruposPage() {
  return (
    <MainLayout>
      <GruposContent />
    </MainLayout>
  );
}
