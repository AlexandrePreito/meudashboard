'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  Search,
  Users
} from 'lucide-react';

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

export default function GruposPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    max_users: 10,
    max_companies: 5,
    max_powerbi_screens: 10
  });

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    try {
      const res = await fetch('/api/config/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.error('Erro ao carregar grupos:', err);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      max_users: 10,
      max_companies: 5,
      max_powerbi_screens: 10
    });
    setEditingGroup(null);
  }

  function openNewGroup() {
    resetForm();
    setShowModal(true);
  }

  function openEditGroup(group: Group) {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      description: group.description || '',
      max_users: group.max_users,
      max_companies: group.max_companies,
      max_powerbi_screens: group.max_powerbi_screens
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.name) {
      alert('Nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name: formData.name,
        description: formData.description || null,
        max_users: formData.max_users,
        max_companies: formData.max_companies,
        max_powerbi_screens: formData.max_powerbi_screens
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
        alert(editingGroup ? 'Grupo atualizado!' : 'Grupo criado!');
        setShowModal(false);
        resetForm();
        loadGroups();
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
    if (!confirm('Excluir este grupo?')) return;

    try {
      const res = await fetch(`/api/config/groups?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Grupo excluído!');
        loadGroups();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir');
      }
    } catch (err) {
      alert('Erro ao excluir grupo');
    }
  }

  const filteredGroups = groups.filter(group => {
    if (!searchTerm) return true;
    return group.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Grupos</h1>
            <p className="text-gray-500 text-sm mt-1">Gerencie os grupos de empresas do sistema</p>
          </div>
          <button
            onClick={openNewGroup}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Novo Grupo
          </button>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar grupos..."
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
        ) : filteredGroups.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum grupo encontrado</h3>
            <p className="text-gray-500 mb-4">Crie seu primeiro grupo</p>
            <button
              onClick={openNewGroup}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Criar Grupo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map((group) => (
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
                      onClick={() => handleDelete(group.id)}
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
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingGroup ? 'Editar Grupo' : 'Novo Grupo'}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Usuários</label>
                    <input
                      type="number"
                      value={formData.max_users}
                      onChange={(e) => setFormData({ ...formData, max_users: parseInt(e.target.value) || 10 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Máx. Empresas</label>
                    <input
                      type="number"
                      value={formData.max_companies}
                      onChange={(e) => setFormData({ ...formData, max_companies: parseInt(e.target.value) || 5 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telas BI</label>
                    <input
                      type="number"
                      value={formData.max_powerbi_screens}
                      onChange={(e) => setFormData({ ...formData, max_powerbi_screens: parseInt(e.target.value) || 10 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
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
                  {editingGroup ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

