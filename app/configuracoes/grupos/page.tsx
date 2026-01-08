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
  Users,
  Upload,
  Image
} from 'lucide-react';
import { brandColors } from '@/lib/colors';

interface Plan {
  id: string;
  name: string;
  max_users: number;
  max_companies: number;
  max_powerbi_screens: number;
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
  logo_url: string | null;
  plan_id: string | null;
  plan?: Plan;
  primary_color: string | null;
}

export default function GruposPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentUser, setCurrentUser] = useState<{ is_master?: boolean } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    plan_id: '',
    primary_color: 'blue'
  });

  useEffect(() => {
    loadCurrentUser();
    loadGroups();
    loadPlans();
  }, []);

  async function loadCurrentUser() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUser({ is_master: data.user?.is_master });
      }
    } catch (err) {
      console.error('Erro ao carregar usuário:', err);
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
    } finally {
      setLoading(false);
    }
  }

  async function loadPlans() {
    try {
      const res = await fetch('/api/plans');
      if (res.ok) {
        const data = await res.json();
        setPlans(data.plans || []);
      }
    } catch (err) {
      console.error('Erro ao carregar planos:', err);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      description: '',
      logo_url: '',
      plan_id: '',
      primary_color: 'blue'
    });
    setEditingGroup(null);
    setLogoPreview(null);
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
      logo_url: group.logo_url || '',
      plan_id: group.plan_id || '',
      primary_color: group.primary_color || 'blue'
    });
    setLogoPreview(group.logo_url || null);
    setShowModal(true);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('group_id', editingGroup?.id || 'new');

      const res = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formDataUpload
      });

      if (res.ok) {
        const data = await res.json();
        setFormData({ ...formData, logo_url: data.url });
        setLogoPreview(data.url);
      } else {
        const data = await res.json();
        alert(data.error || 'Erro no upload');
      }
    } catch (err) {
      alert('Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
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
        logo_url: formData.logo_url || null,
        plan_id: formData.plan_id || null,
        primary_color: formData.primary_color || 'blue'
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
      <div className="space-y-6 -mt-12">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {currentUser?.is_master ? 'Grupos' : 'Personalização'}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {currentUser?.is_master 
                ? 'Gerencie os grupos de empresas do sistema' 
                : 'Personalize a logo e cores do seu grupo'}
            </p>
          </div>
          {currentUser?.is_master && (
          <button
            onClick={openNewGroup}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg transition-colors"
            style={{ 
              backgroundColor: 'var(--color-primary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary)';
            }}
          >
            <Plus size={20} />
            Novo Grupo
          </button>
          )}
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
            {currentUser?.is_master ? (
              <>
                <p className="text-gray-500 mb-4">Crie seu primeiro grupo</p>
                <button
                  onClick={openNewGroup}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Criar Grupo
                </button>
              </>
            ) : (
              <p className="text-gray-500">Você não tem grupos para personalizar</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredGroups.map((group) => (
              <div key={group.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center overflow-hidden">
                      {group.logo_url ? (
                        <img src={group.logo_url} alt={group.name} className="w-full h-full object-contain" />
                      ) : (
                        <Building2 className="text-blue-600" size={24} />
                      )}
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
                    {currentUser?.is_master && (
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                    )}
                  </div>
                </div>
                {group.description && (
                  <p className="text-sm text-gray-600 mb-4">{group.description}</p>
                )}
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Plano: <span className="font-medium text-gray-700">{plans.find(p => p.id === group.plan_id)?.name || 'Nenhum'}</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {group.users_count} usuários ativos
                  </p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                      ) : (
                        <Image size={24} className="text-gray-400" />
                      )}
                    </div>
                    <div>
                      <label className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                          {uploading ? 'Enviando...' : 'Escolher imagem'}
                        </div>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/svg+xml"
                          onChange={handleLogoUpload}
                          disabled={uploading}
                          className="hidden"
                        />
                      </label>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP ou SVG. Máx 2MB.</p>
                    </div>
                  </div>
                </div>

                {currentUser?.is_master && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>
                )}

                {currentUser?.is_master && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plano</label>
                  <select
                    value={formData.plan_id}
                    onChange={(e) => setFormData({ ...formData, plan_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Selecione um plano</option>
                    {plans.map(plan => (
                      <option key={plan.id} value={plan.id}>{plan.name}</option>
                    ))}
                  </select>
                </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Cor do Tema</label>
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(brandColors).map(([key, color]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormData({ ...formData, primary_color: key })}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          formData.primary_color === key 
                            ? 'border-gray-900 scale-110' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        style={{ backgroundColor: color.primary }}
                        title={color.name}
                      />
                    ))}
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

