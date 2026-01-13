'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { showToast } from '@/lib/toast';
import {
  Building2,
  Users,
  Monitor,
  Plus,
  Search,
  Loader2,
  Edit2,
  Trash2,
  X,
  MapPin,
  LogIn,
  Upload,
  Image,
  Palette,
  Copy
} from 'lucide-react';

interface Group {
  id: string;
  name: string;
  slug: string;
  document?: string;
  status: string;
  logo_url?: string;
  email?: string;
  phone?: string;
  primary_color?: string;
  use_developer_logo?: boolean;
  use_developer_colors?: boolean;
  users_count: number;
  screens_count: number;
  alerts_count: number;
  quota_users?: number;
  quota_screens?: number;
  quota_alerts?: number;
  quota_whatsapp_per_day?: number;
  quota_ai_credits_per_day?: number;
  created_at: string;
}

interface FormData {
  document: string;
  name: string;
  email: string;
  phone: string;
  responsible_name: string;
  responsible_email: string;
  responsible_phone: string;
  address_street: string;
  address_number: string;
  address_complement: string;
  address_neighborhood: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  quota_users: number;
  quota_screens: number;
  quota_alerts: number;
  quota_whatsapp_per_day: number;
  quota_ai_credits_per_day: number;
  logo_url: string;
  primary_color: string;
  use_developer_logo: boolean;
  use_developer_colors: boolean;
}

const initialFormData: FormData = {
  document: '',
  name: '',
  email: '',
  phone: '',
  responsible_name: '',
  responsible_email: '',
  responsible_phone: '',
  address_street: '',
  address_number: '',
  address_complement: '',
  address_neighborhood: '',
  address_city: '',
  address_state: '',
  address_zip: '',
  quota_users: 10,
  quota_screens: 10,
  quota_alerts: 10,
  quota_whatsapp_per_day: 100,
  quota_ai_credits_per_day: 100,
  logo_url: '',
  primary_color: '#3B82F6',
  use_developer_logo: true,
  use_developer_colors: true,
};

export default function DevGroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [cloningGroup, setCloningGroup] = useState<Group | null>(null);
  const [cloneFormData, setCloneFormData] = useState({ name: '', slug: '' });
  const [cloning, setCloning] = useState(false);
  const [deleteConfirmGroup, setDeleteConfirmGroup] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    try {
      setLoading(true);
      const res = await fetch('/api/dev/groups');
      
      if (res.status === 403) {
        router.push('/dashboard');
        return;
      }
      
      if (!res.ok) {
        throw new Error('Erro ao carregar grupos');
      }
      
      const result = await res.json();
      setGroups(result.groups || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openNewGroup() {
    setEditingGroup(null);
    setFormData(initialFormData);
    setError('');
    setLogoPreview(null);
    setShowModal(true);
  }

  function openEditGroup(group: Group) {
    setEditingGroup(group);
    setLogoPreview(group.logo_url || null);
    setFormData({
      document: group.document || '',
      name: group.name,
      email: group.email || '',
      phone: group.phone || '',
      responsible_name: '',
      responsible_email: '',
      responsible_phone: '',
      address_street: '',
      address_number: '',
      address_complement: '',
      address_neighborhood: '',
      address_city: '',
      address_state: '',
      address_zip: '',
      quota_users: group.quota_users || 10,
      quota_screens: group.quota_screens || 10,
      quota_alerts: group.quota_alerts || 10,
      quota_whatsapp_per_day: group.quota_whatsapp_per_day || 100,
      quota_ai_credits_per_day: group.quota_ai_credits_per_day || 100,
      logo_url: group.logo_url || '',
      primary_color: group.primary_color || '#3B82F6',
      use_developer_logo: group.use_developer_logo ?? true,
      use_developer_colors: group.use_developer_colors ?? true,
    });
    setError('');
    setShowModal(true);
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('type', 'group');
      if (editingGroup?.id) {
        formDataUpload.append('group_id', editingGroup.id);
      }

      const res = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formDataUpload
      });

      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, logo_url: data.url }));
        setLogoPreview(data.url);
      } else {
        const data = await res.json();
        setError(data.error || 'Erro no upload');
      }
    } catch (err) {
      setError('Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  }

  async function buscarCNPJ() {
    if (!formData.document) return;

    const cnpjLimpo = formData.document.replace(/[^\d]/g, '');
    
    if (cnpjLimpo.length !== 14) {
      setError('CNPJ deve ter 14 dígitos');
      return;
    }

    try {
      setCnpjLoading(true);
      setError('');
      
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
      
      if (!res.ok) {
        throw new Error('CNPJ não encontrado');
      }
      
      const data = await res.json();
      
      setFormData(prev => ({
        ...prev,
        name: data.razao_social || prev.name,
        email: data.email || prev.email,
        phone: data.ddd_telefone_1 ? data.ddd_telefone_1.replace(/[^\d]/g, '') : prev.phone,
        address_street: data.logradouro || prev.address_street,
        address_number: data.numero || prev.address_number,
        address_complement: data.complemento || prev.address_complement,
        address_neighborhood: data.bairro || prev.address_neighborhood,
        address_city: data.municipio || prev.address_city,
        address_state: data.uf || prev.address_state,
        address_zip: data.cep ? data.cep.replace(/[^\d]/g, '') : prev.address_zip,
        responsible_name: data.qsa?.[0]?.nome_socio || prev.responsible_name,
      }));
    } catch (err: any) {
      setError(err.message || 'Erro ao buscar CNPJ');
    } finally {
      setCnpjLoading(false);
    }
  }

  async function handleSave() {
    // Validacao de campos obrigatorios
    const camposFaltando: string[] = [];
    
    if (!formData.name.trim()) {
      camposFaltando.push('Nome do Grupo');
    }
    
    if (camposFaltando.length > 0) {
      setError(`Preencha os campos obrigatórios: ${camposFaltando.join(', ')}`);
      // Scroll para o topo do modal para ver o erro
      const modalContent = document.querySelector('.overflow-y-auto');
      if (modalContent) modalContent.scrollTop = 0;
      return;
    }

    try {
      setSaving(true);
      setError('');
      
      const slug = formData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      
      const payload = {
        name: formData.name.trim(),
        slug,
        document: formData.document.replace(/[^\d]/g, ''),
        email: formData.email.trim(),
        phone: formData.phone.replace(/[^\d]/g, ''),
        responsible_name: formData.responsible_name.trim(),
        responsible_email: formData.responsible_email.trim(),
        responsible_phone: formData.responsible_phone.replace(/[^\d]/g, ''),
        address_street: formData.address_street.trim(),
        address_number: formData.address_number.trim(),
        address_complement: formData.address_complement.trim(),
        address_neighborhood: formData.address_neighborhood.trim(),
        address_city: formData.address_city.trim(),
        address_state: formData.address_state.trim(),
        address_zip: formData.address_zip.replace(/[^\d]/g, ''),
        quota_users: formData.quota_users,
        quota_screens: formData.quota_screens,
        quota_alerts: formData.quota_alerts,
        quota_whatsapp_per_day: formData.quota_whatsapp_per_day,
        quota_ai_credits_per_day: formData.quota_ai_credits_per_day,
        logo_url: formData.logo_url.trim(),
        primary_color: formData.primary_color,
        use_developer_logo: formData.use_developer_logo,
        use_developer_colors: formData.use_developer_colors,
      };
      
      const url = editingGroup 
        ? `/api/dev/groups/${editingGroup.id}`
        : '/api/dev/groups';
      
      const method = editingGroup ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || 'Erro ao salvar grupo');
      }
      
      setShowModal(false);
      loadGroups();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function openDeleteConfirm(group: Group) {
    setDeleteConfirmGroup(group);
  }

  async function handleDelete() {
    if (!deleteConfirmGroup) return;

    try {
      setDeleting(true);
      const res = await fetch(`/api/dev/groups/${deleteConfirmGroup.id}`, {
        method: 'DELETE',
      });
      
      if (!res.ok) {
        throw new Error('Erro ao excluir grupo');
      }
      
      setDeleteConfirmGroup(null);
      loadGroups();
      showToast('Grupo excluído com sucesso', 'success');
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  }

  function openCloneModal(group: Group) {
    setCloningGroup(group);
    setCloneFormData({ 
      name: `${group.name} (Cópia)`, 
      slug: `${group.slug}-copia` 
    });
    setError('');
    setShowCloneModal(true);
  }

  async function handleClone() {
    if (!cloningGroup) return;
    
    if (!cloneFormData.name.trim()) {
      setError('Nome é obrigatório');
      return;
    }

    try {
      setCloning(true);
      setError('');

      const slug = cloneFormData.slug || cloneFormData.name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

      const res = await fetch(`/api/dev/groups/${cloningGroup.id}/clone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cloneFormData.name.trim(),
          slug,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Erro ao clonar grupo');
      }

      setShowCloneModal(false);
      setCloningGroup(null);
      setCloneFormData({ name: '', slug: '' });
      loadGroups();
      
      showToast(
        `Grupo clonado com sucesso! Conexões Power BI: ${result.cloned?.connections || 0}, Instâncias WhatsApp: ${result.cloned?.whatsapp_instances || 0}`,
        'success'
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCloning(false);
    }
  }

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.document && group.document.includes(searchTerm.replace(/[^\d]/g, '')))
  );

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
            <h1 className="text-2xl font-bold text-gray-900">Meus Grupos</h1>
            <p className="text-gray-500 mt-1">
              {groups.length} {groups.length === 1 ? 'grupo cadastrado' : 'grupos cadastrados'}
            </p>
          </div>
          <button
            onClick={openNewGroup}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Grupo
          </button>
        </div>

        {/* Barra de Busca */}
        {groups.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar grupo por nome, slug ou CNPJ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Empty State */}
        {groups.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum grupo cadastrado
            </h3>
            <p className="text-gray-500 mb-6">
              Crie seu primeiro grupo para começar a gerenciar clientes
            </p>
            <button
              onClick={openNewGroup}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Criar primeiro grupo
            </button>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">Nenhum grupo encontrado</p>
          </div>
        ) : (
          /* Grid de Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGroups.map((group) => (
              <div
                key={group.id}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg transition-shadow"
              >
                {/* Header do Card */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3 flex-1">
                    {group.logo_url ? (
                      <img
                        src={group.logo_url}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-blue-600" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">
                        {group.name}
                      </h3>
                      {group.document && (
                        <p className="text-sm text-gray-500 truncate">
                          {group.document.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      group.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : group.status === 'suspended'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {group.status === 'active' ? 'Ativo' : 'Suspenso'}
                  </span>
                </div>

                {/* Info do Card */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>Usuários</span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {group.users_count} / {group.quota_users || '∞'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Monitor className="w-4 h-4" />
                      <span>Telas</span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {group.screens_count} / {group.quota_screens || '∞'}
                    </span>
                  </div>
                </div>

                {/* Ações */}
                <div className="flex items-center justify-between gap-2 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => router.push(`/dev/groups/${group.id}`)}
                    className="flex items-center justify-center gap-2 px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                  >
                    <LogIn className="w-4 h-4" />
                    Entrar
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditGroup(group)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openCloneModal(group)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Clonar"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => openDeleteConfirm(group)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingGroup ? 'Editar Grupo' : 'Novo Grupo'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteudo do Modal */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {error && (
                <div className="bg-red-50 border-2 border-red-300 text-red-800 px-4 py-3 rounded-lg text-sm flex items-start gap-3 animate-pulse">
                  <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Atenção!</p>
                    <p>{error}</p>
                  </div>
                </div>
              )}

              {/* SECAO 1: Dados da Empresa */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-4 h-4 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Dados da Empresa</h3>
                </div>
                
                {/* CNPJ com botao buscar */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.document}
                      onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                      placeholder="00.000.000/0000-00"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={buscarCNPJ}
                      disabled={cnpjLoading}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                      {cnpjLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                      <span className="hidden sm:inline">Buscar</span>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Digite o CNPJ e clique em buscar para preencher automaticamente</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome do Grupo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECAO 2: Responsavel */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Responsavel</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Responsavel</label>
                    <input
                      type="text"
                      value={formData.responsible_name}
                      onChange={(e) => setFormData({ ...formData, responsible_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email do Responsavel</label>
                    <input
                      type="email"
                      value={formData.responsible_email}
                      onChange={(e) => setFormData({ ...formData, responsible_email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                    <input
                      type="text"
                      value={formData.responsible_phone}
                      onChange={(e) => setFormData({ ...formData, responsible_phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECAO 3: Endereco */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Endereco</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                    <input
                      type="text"
                      value={formData.address_zip}
                      onChange={(e) => setFormData({ ...formData, address_zip: e.target.value })}
                      placeholder="00000-000"
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Logradouro</label>
                    <input
                      type="text"
                      value={formData.address_street}
                      onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Numero</label>
                    <input
                      type="text"
                      value={formData.address_number}
                      onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                    <input
                      type="text"
                      value={formData.address_complement}
                      onChange={(e) => setFormData({ ...formData, address_complement: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                    <input
                      type="text"
                      value={formData.address_neighborhood}
                      onChange={(e) => setFormData({ ...formData, address_neighborhood: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                    <input
                      type="text"
                      value={formData.address_city}
                      onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                    <input
                      type="text"
                      value={formData.address_state}
                      onChange={(e) => setFormData({ ...formData, address_state: e.target.value })}
                      placeholder="UF"
                      maxLength={2}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                    />
                  </div>
                </div>
              </div>

              {/* SECAO 4: Cotas - DESTAQUE AZUL */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Monitor className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Cotas e Limites</h3>
                    <p className="text-sm text-blue-600">Defina os limites de recursos para este grupo</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-blue-100">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Usuarios</label>
                    <input
                      type="number"
                      value={formData.quota_users}
                      onChange={(e) => setFormData({ ...formData, quota_users: parseInt(e.target.value) || 0 })}
                      min={1}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-semibold"
                    />
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-blue-100">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Telas</label>
                    <input
                      type="number"
                      value={formData.quota_screens}
                      onChange={(e) => setFormData({ ...formData, quota_screens: parseInt(e.target.value) || 0 })}
                      min={1}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-semibold"
                    />
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-blue-100">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Alertas</label>
                    <input
                      type="number"
                      value={formData.quota_alerts}
                      onChange={(e) => setFormData({ ...formData, quota_alerts: parseInt(e.target.value) || 0 })}
                      min={1}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-semibold"
                    />
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-blue-100">
                    <label className="block text-xs font-medium text-gray-500 mb-1">WhatsApp/dia</label>
                    <input
                      type="number"
                      value={formData.quota_whatsapp_per_day}
                      onChange={(e) => setFormData({ ...formData, quota_whatsapp_per_day: parseInt(e.target.value) || 0 })}
                      min={1}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-semibold"
                    />
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-blue-100">
                    <label className="block text-xs font-medium text-gray-500 mb-1 whitespace-nowrap">IA/dia</label>
                    <input
                      type="number"
                      value={formData.quota_ai_credits_per_day}
                      onChange={(e) => setFormData({ ...formData, quota_ai_credits_per_day: parseInt(e.target.value) || 0 })}
                      min={1}
                      className="w-full px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* SECAO 5: Personalizacao */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center">
                    <Palette className="w-4 h-4 text-pink-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">Personalizacao Visual</h3>
                </div>
                
                {/* Opcao usar tema do desenvolvedor */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-3 mb-4">
                  <p className="text-sm text-gray-600 mb-2">Escolha se este grupo usara a identidade visual da sua software house ou tera identidade propria:</p>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="use_developer_logo"
                      checked={formData.use_developer_logo}
                      onChange={(e) => setFormData({ ...formData, use_developer_logo: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label htmlFor="use_developer_logo" className="text-sm text-gray-700">
                      Usar logo do desenvolvedor (sua software house)
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="use_developer_colors"
                      checked={formData.use_developer_colors}
                      onChange={(e) => setFormData({ ...formData, use_developer_colors: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <label htmlFor="use_developer_colors" className="text-sm text-gray-700">
                      Usar cores do desenvolvedor (sua software house)
                    </label>
                  </div>
                </div>

                {/* Logo e Cor do Grupo */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Logo do Grupo - so mostra se NAO usar do desenvolvedor */}
                  {!formData.use_developer_logo && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Logo do Grupo</label>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                          {logoPreview ? (
                            <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                          ) : (
                            <Image className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <label className="cursor-pointer">
                            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
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
                          <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP ou SVG. Max 2MB.</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cor do Grupo - so mostra se NAO usar do desenvolvedor */}
                  {!formData.use_developer_colors && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Cor Primaria do Grupo
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={formData.primary_color}
                          onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                          className="w-14 h-10 rounded-lg border border-gray-300 cursor-pointer"
                          style={{ padding: 0 }}
                        />
                        <input
                          type="text"
                          value={formData.primary_color}
                          onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg font-mono text-sm"
                          placeholder="#3B82F6"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer do Modal */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
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

      {/* Modal de Clonagem */}
      {showCloneModal && cloningGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Clonar Grupo</h2>
              <button
                onClick={() => {
                  setShowCloneModal(false);
                  setCloningGroup(null);
                  setError('');
                }}
                className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Clonando:</strong> {cloningGroup.name}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Serão copiadas as conexões Power BI e vinculadas as instâncias WhatsApp.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do novo grupo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={cloneFormData.name}
                  onChange={(e) => setCloneFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome do grupo"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Slug (URL)
                </label>
                <input
                  type="text"
                  value={cloneFormData.slug}
                  onChange={(e) => setCloneFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="slug-do-grupo"
                />
                <p className="text-xs text-gray-500 mt-1">Será gerado automaticamente se deixar vazio</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                onClick={() => {
                  setShowCloneModal(false);
                  setCloningGroup(null);
                  setError('');
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleClone}
                disabled={cloning}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {cloning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Clonando...
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Clonar Grupo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteConfirmGroup && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1 pt-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Excluir Grupo
                  </h3>
                  <p className="text-sm text-gray-600">
                    Tem certeza que deseja excluir o grupo <strong>"{deleteConfirmGroup.name}"</strong>?
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Esta ação não pode ser desfeita.
                  </p>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setDeleteConfirmGroup(null)}
                  disabled={deleting}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
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
                      Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4" />
                      Excluir
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
