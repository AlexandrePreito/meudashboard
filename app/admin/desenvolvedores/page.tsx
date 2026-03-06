'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import CascadeDeleteModal from '@/components/CascadeDeleteModal';
import { showToast } from '@/lib/toast';
import {
  Code,
  Plus,
  Search,
  Loader2,
  Building2,
  Users,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  X,
  Upload,
  MapPin,
  User,
  Palette,
  FileText,
  Key,
  Settings,
  Globe,
  ExternalLink,
  Check,
  AlertCircle
} from 'lucide-react';
import Pagination, { PAGE_SIZE } from '@/components/ui/Pagination';

interface DeveloperPlan {
  id: string;
  name: string;
  max_companies?: number;
  max_users?: number;
  max_powerbi_screens?: number;
  max_whatsapp_messages_per_month?: number;
  max_ai_alerts_per_month?: number;
  max_ai_questions_per_day?: number;
  ai_enabled?: boolean;
}

interface Developer {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  document?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  use_developer_logo?: boolean;
  use_developer_colors?: boolean;
  status: string;
  notes?: string;
  responsible_name?: string;
  responsible_email?: string;
  responsible_phone?: string;
  address_street?: string;
  address_number?: string;
  address_complement?: string;
  address_neighborhood?: string;
  address_city?: string;
  address_state?: string;
  address_zip?: string;
  plan_id?: string | null;
  plan_name?: string;
  max_companies?: number;
  max_users?: number;
  max_powerbi_screens?: number;
  max_daily_refreshes?: number;
  max_chat_messages_per_day?: number;
  max_alerts?: number;
  max_whatsapp_messages_per_day?: number;
  max_ai_credits_per_day?: number;
  monthly_price?: number;
  groups_count: number;
  users_count: number;
  created_at: string;
  allow_shared_tenant?: boolean;
  self_registered?: boolean;
  registered_at?: string;
  subdomain?: string | null;
  subdomain_enabled?: boolean;
  subdomain_approved?: boolean;
  subdomain_allowed?: boolean;
  landing_title?: string | null;
  landing_description?: string | null;
  allow_powerbi_connections?: boolean;
  allow_whatsapp_instances?: boolean;
}

const estadosBrasil = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

export default function AdminDesenvolvedoresPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [plans, setPlans] = useState<DeveloperPlan[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingDeveloper, setEditingDeveloper] = useState<Developer | null>(null);
  const [activeTab, setActiveTab] = useState<'dados' | 'responsavel' | 'endereco' | 'personalizacao' | 'acesso'>('dados');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cascadeDeleteOpen, setCascadeDeleteOpen] = useState(false);
  const [developerToDelete, setDeveloperToDelete] = useState<{id: string, name: string} | null>(null);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [editingLimitsDeveloper, setEditingLimitsDeveloper] = useState<Developer | null>(null);
  const [savingLimits, setSavingLimits] = useState(false);
  const [limitsModalPlans, setLimitsModalPlans] = useState<DeveloperPlan[]>([]);
  const [limitsFormLoading, setLimitsFormLoading] = useState(false);
  const [limitsFormData, setLimitsFormData] = useState({
    plan_id: '' as string | null,
    max_companies: 5,
    max_users: 50,
    max_powerbi_screens: 10,
    max_alerts: 0,
    max_whatsapp_messages_per_day: 0,
    max_ai_credits_per_day: 0,
    max_daily_refreshes: 20
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    document: '',
    logo_url: '',
    primary_color: '#3B82F6',
    status: 'active',
    notes: '',
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
    login_email: '',
    login_password: '',
    login_password_confirm: '',
    allow_shared_tenant: false
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      
      const devsRes = await fetch('/api/admin/developers');

      if (devsRes.status === 403) {
        router.push('/dashboard');
        return;
      }

      if (devsRes.ok) {
        const data = await devsRes.json();
        setDevelopers(data.developers || []);
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingDeveloper(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      document: '',
      logo_url: '',
      primary_color: '#3B82F6',
      status: 'active',
      notes: '',
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
      login_email: '',
      login_password: '',
      login_password_confirm: '',
      allow_shared_tenant: false
    });
    setActiveTab('dados');
    setShowModal(true);
  }

  function openEditModal(developer: Developer) {
    setEditingDeveloper(developer);
    setFormData({
      name: developer.name || '',
      email: developer.email || '',
      phone: developer.phone || '',
      document: developer.document || '',
      logo_url: developer.logo_url || '',
      primary_color: developer.primary_color || '#3B82F6',
      status: developer.status || 'active',
      notes: developer.notes || '',
      responsible_name: developer.responsible_name || '',
      responsible_email: developer.responsible_email || '',
      responsible_phone: developer.responsible_phone || '',
      address_street: developer.address_street || '',
      address_number: developer.address_number || '',
      address_complement: developer.address_complement || '',
      address_neighborhood: developer.address_neighborhood || '',
      address_city: developer.address_city || '',
      address_state: developer.address_state || '',
      address_zip: developer.address_zip || '',
      login_email: developer.email || '',
      login_password: '',
      login_password_confirm: '',
      allow_shared_tenant: developer.allow_shared_tenant ?? false
    });
    setActiveTab('dados');
    setShowModal(true);
  }

  async function openLimitsModal(developer: Developer) {
    setEditingLimitsDeveloper(developer);
    setShowLimitsModal(true);
    setLimitsFormLoading(true);
    setLimitsModalPlans([]);
    try {
      const res = await fetch(`/api/admin/developers/${developer.id}`);
      if (!res.ok) throw new Error('Erro ao carregar');
      const data = await res.json();
      const dev = data.developer;
      const apiPlans = data.plans || [];

      setLimitsModalPlans(apiPlans.length > 0 ? apiPlans : plans);
      setEditingLimitsDeveloper((prev) => prev ? {
        ...prev,
        ...dev,
        groups_count: (dev as any).group_count ?? prev.groups_count,
        users_count: (dev as any).user_count ?? prev.users_count
      } : null);

      const planName = (dev?.plan_name || developer.plan_name || '').toLowerCase();
      const isFree = planName === 'free';

      setLimitsFormData({
        plan_id: dev?.plan_id || developer.plan_id || null,
        max_companies: dev?.max_companies ?? 5,
        max_users: dev?.max_users ?? 50,
        max_powerbi_screens: dev?.max_powerbi_screens ?? 10,
        max_alerts: isFree ? 0 : (dev?.max_alerts ?? 0),
        max_whatsapp_messages_per_day: isFree ? 0 : (dev?.max_whatsapp_messages_per_day ?? dev?.max_chat_messages_per_day ?? 0),
        max_ai_credits_per_day: isFree ? 0 : (dev?.max_ai_credits_per_day ?? 0),
        max_daily_refreshes: dev?.max_daily_refreshes ?? 20
      });
    } catch {
      setLimitsModalPlans(plans);
      const planName = (developer.plan_name || '').toLowerCase();
      const isFree = planName === 'free';
      setLimitsFormData({
        plan_id: developer.plan_id || null,
        max_companies: 5,
        max_users: 50,
        max_powerbi_screens: 10,
        max_alerts: isFree ? 0 : 20,
        max_whatsapp_messages_per_day: isFree ? 0 : 500,
        max_ai_credits_per_day: isFree ? 0 : 200,
        max_daily_refreshes: 20
      });
    } finally {
      setLimitsFormLoading(false);
    }
  }

  function handlePlanChange(newPlanId: string | null, planList?: DeveloperPlan[]) {
    const list = planList && planList.length > 0 ? planList : plans;
    const plan = list.find((p) => p.id === newPlanId);
    const planName = (plan?.name || '').toLowerCase();
    const isFree = planName === 'free';
    setLimitsFormData((prev) => {
      const next = { ...prev, plan_id: newPlanId };
      if (isFree) {
        next.max_alerts = 0;
        next.max_whatsapp_messages_per_day = 0;
        next.max_ai_credits_per_day = 0;
      } else if (plan) {
        next.max_users = plan.max_users ?? prev.max_users;
        next.max_powerbi_screens = plan.max_powerbi_screens ?? prev.max_powerbi_screens;
        next.max_alerts = Math.floor((plan.max_ai_alerts_per_month ?? 0) / 30) || 10;
        next.max_whatsapp_messages_per_day = Math.floor((plan.max_whatsapp_messages_per_month ?? 0) / 30) || 500;
        next.max_ai_credits_per_day = plan.max_ai_questions_per_day ?? 200;
      }
      return next;
    });
  }

  async function handleSaveLimits() {
    if (!editingLimitsDeveloper) return;

    try {
      setSavingLimits(true);
      const res = await fetch(`/api/admin/developers/${editingLimitsDeveloper.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: limitsFormData.plan_id,
          max_companies: limitsFormData.max_companies,
          max_users: limitsFormData.max_users,
          max_powerbi_screens: limitsFormData.max_powerbi_screens,
          max_alerts: limitsFormData.max_alerts,
          max_whatsapp_messages_per_day: limitsFormData.max_whatsapp_messages_per_day,
          max_ai_credits_per_day: limitsFormData.max_ai_credits_per_day,
          max_daily_refreshes: limitsFormData.max_daily_refreshes
        })
      });

      if (res.ok) {
        setShowLimitsModal(false);
        setEditingLimitsDeveloper(null);
        loadData();
        showToast('Plano e cotas atualizados com sucesso!', 'success');
      } else {
        const err = await res.json();
        showToast(err.error || 'Erro ao salvar', 'error');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      showToast('Erro ao salvar plano e cotas', 'error');
    } finally {
      setSavingLimits(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.name || !formData.email) {
      alert('Nome e email sao obrigatorios');
      return;
    }

    try {
      setSaving(true);
      const url = editingDeveloper 
        ? `/api/admin/developers/${editingDeveloper.id}`
        : '/api/admin/developers';
      
      const method = editingDeveloper ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        setShowModal(false);
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar desenvolvedor');
    } finally {
      setSaving(false);
    }
  }

  const handleDelete = (id: string, name: string) => {
    setDeveloperToDelete({ id, name });
    setCascadeDeleteOpen(true);
  };

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formDataUpload = new FormData();
    formDataUpload.append('file', file);
    formDataUpload.append('folder', 'developers');

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formDataUpload
      });

      if (res.ok) {
        const data = await res.json();
        setFormData(prev => ({ ...prev, logo_url: data.url }));
      } else {
        alert('Erro ao fazer upload da imagem');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao fazer upload');
    }
  }

  const filteredDevelopers = developers.filter(dev =>
    dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    dev.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  useEffect(() => {
    setPage(1);
  }, [searchTerm]);
  const paginatedDevelopers = filteredDevelopers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const tabs = [
    { id: 'dados', label: 'Dados da Empresa', icon: Building2 },
    { id: 'responsavel', label: 'Responsavel', icon: User },
    { id: 'endereco', label: 'Endereco', icon: MapPin },
    { id: 'personalizacao', label: 'Personalizacao', icon: Palette },
    { id: 'acesso', label: 'Acesso', icon: Key }
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Desenvolvedores</h1>
            <p className="text-gray-500 mt-1">Gerencie os desenvolvedores do sistema</p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Desenvolvedor
          </button>
        </div>

        {/* Busca */}
        <div className="card-modern p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="overflow-hidden bg-white rounded-2xl shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredDevelopers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Code className="w-12 h-12 mb-2 text-gray-300" />
              <p>Nenhum desenvolvedor encontrado</p>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="w-full table-modern">
                <thead>
                  <tr>
                    <th>Desenvolvedor</th>
                    <th>Contato</th>
                    <th className="text-center">Plano</th>
                    <th className="text-center">Grupos</th>
                    <th className="text-center">Usuarios</th>
                    <th className="text-center">Status</th>
                    <th className="text-center">Criado em</th>
                    <th className="text-center">Acoes</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDevelopers.map((dev) => (
                    <tr key={dev.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          {dev.logo_url ? (
                            <img src={dev.logo_url} alt={dev.name} className="w-10 h-10 rounded-lg object-contain bg-gray-100" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: dev.primary_color || '#8B5CF6' }}>
                              <Code className="w-5 h-5 text-white" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900 flex items-center gap-2 flex-wrap">
                              {dev.name}
                              {dev.self_registered && (
                                <span className="text-xs px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">Self</span>
                              )}
                              {dev.subdomain_enabled && !dev.subdomain_approved && (
                                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Subdomínio pendente</span>
                              )}
                              {dev.subdomain_enabled && dev.subdomain_approved && dev.subdomain && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">{dev.subdomain}.meudashboard.org</span>
                              )}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{dev.email}</p>
                        <p className="text-xs text-gray-500">{dev.phone || '-'}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {(() => {
                          const p = (dev.plan_name || 'Free').toLowerCase();
                          const cls = p === 'free' ? 'bg-amber-100 text-amber-700' : p === 'pro' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700';
                          return <span className={`inline-flex px-2 py-1 rounded-full text-sm font-medium ${cls}`}>{dev.plan_name || 'Free'}</span>;
                        })()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                          <Building2 className="w-3 h-3" /> {dev.groups_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                          <Users className="w-3 h-3" /> {dev.users_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {dev.status === 'active' ? (
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
                        {new Date(dev.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 flex-wrap">
                          {dev.subdomain_enabled && !dev.subdomain_approved && (
                            <>
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/admin/developers/${dev.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ subdomain_approved: true })
                                    });
                                    if (res.ok) {
                                      showToast('Subdomínio aprovado', 'success');
                                      loadData();
                                    } else showToast((await res.json()).error || 'Erro', 'error');
                                  } catch (e) {
                                    showToast('Erro ao aprovar', 'error');
                                  }
                                }}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded text-xs font-medium"
                                title="Aprovar subdomínio"
                              >
                                Aprovar
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/admin/developers/${dev.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ subdomain_approved: false })
                                    });
                                    if (res.ok) {
                                      showToast('Subdomínio rejeitado', 'success');
                                      loadData();
                                    } else showToast((await res.json()).error || 'Erro', 'error');
                                  } catch (e) {
                                    showToast('Erro ao rejeitar', 'error');
                                  }
                                }}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded text-xs font-medium"
                                title="Rejeitar subdomínio"
                              >
                                Rejeitar
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => openLimitsModal(dev)}
                            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Plano e Cotas"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(dev)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(dev.id, dev.name)}
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
            <div className="mt-4 px-4 pb-4">
              <Pagination totalItems={filteredDevelopers.length} currentPage={page} onPageChange={setPage} pageSize={PAGE_SIZE} />
            </div>
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingDeveloper ? 'Editar Desenvolvedor' : 'Novo Desenvolvedor'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap border-b border-gray-200 px-6">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
              {/* Tab: Dados da Empresa */}
              {activeTab === 'dados' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nome da empresa"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="email@empresa.com"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                      <input
                        type="text"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ/CPF</label>
                    <input
                      type="text"
                      value={formData.document}
                      onChange={(e) => setFormData({ ...formData, document: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  {editingDeveloper && (
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <input
                        type="checkbox"
                        checked={formData.allow_shared_tenant || false}
                        onChange={(e) => setFormData({ ...formData, allow_shared_tenant: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-700">Permitir Tenant ID compartilhado</span>
                        <p className="text-xs text-gray-500">Permite que este developer use um Tenant ID já em uso por outro developer</p>
                      </div>
                    </label>
                  )}
                </div>
              )}

              {/* Tab: Responsavel */}
              {activeTab === 'responsavel' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Responsavel</label>
                    <input
                      type="text"
                      value={formData.responsible_name}
                      onChange={(e) => setFormData({ ...formData, responsible_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Nome completo"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email do Responsavel</label>
                      <input
                        type="email"
                        value={formData.responsible_email}
                        onChange={(e) => setFormData({ ...formData, responsible_email: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="responsavel@empresa.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Telefone do Responsavel</label>
                      <input
                        type="text"
                        value={formData.responsible_phone}
                        onChange={(e) => setFormData({ ...formData, responsible_phone: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Endereco */}
              {activeTab === 'endereco' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rua</label>
                      <input
                        type="text"
                        value={formData.address_street}
                        onChange={(e) => setFormData({ ...formData, address_street: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nome da rua"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Numero</label>
                      <input
                        type="text"
                        value={formData.address_number}
                        onChange={(e) => setFormData({ ...formData, address_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="123"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                      <input
                        type="text"
                        value={formData.address_complement}
                        onChange={(e) => setFormData({ ...formData, address_complement: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Sala 101"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bairro</label>
                      <input
                        type="text"
                        value={formData.address_neighborhood}
                        onChange={(e) => setFormData({ ...formData, address_neighborhood: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nome do bairro"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
                      <input
                        type="text"
                        value={formData.address_city}
                        onChange={(e) => setFormData({ ...formData, address_city: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Cidade"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                      <select
                        value={formData.address_state}
                        onChange={(e) => setFormData({ ...formData, address_state: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Selecione</option>
                        {estadosBrasil.map(uf => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
                      <input
                        type="text"
                        value={formData.address_zip}
                        onChange={(e) => setFormData({ ...formData, address_zip: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="00000-000"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Tab: Personalizacao */}
              {activeTab === 'personalizacao' && (
                <div className="space-y-6">
                  {/* Logo */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
                    <div className="flex items-start gap-4">
                      <div className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center overflow-hidden bg-gray-50">
                        {formData.logo_url ? (
                          <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <Upload className="w-8 h-8 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleLogoUpload}
                          accept="image/*"
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                          Escolher arquivo
                        </button>
                        <p className="text-xs text-gray-500 mt-2">PNG ou JPG. Max 2MB.</p>
                        {formData.logo_url && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, logo_url: '' })}
                            className="text-xs text-red-600 hover:text-red-700 mt-1"
                          >
                            Remover logo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Cores */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Cor Primaria</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={formData.primary_color}
                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                        className="w-12 h-12 rounded-lg cursor-pointer border-0"
                      />
                      <input
                        type="text"
                        value={formData.primary_color}
                        onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>

                  {/* Preview */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                    <div className="p-4 rounded-xl border border-gray-200" style={{ backgroundColor: formData.primary_color + '10' }}>
                      <div className="flex items-center gap-3">
                        {formData.logo_url ? (
                          <img src={formData.logo_url} alt="Preview" className="w-10 h-10 object-contain" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: formData.primary_color }}>
                            <Code className="w-5 h-5 text-white" />
                          </div>
                        )}
                        <span className="font-bold" style={{ color: formData.primary_color }}>
                          {formData.name || 'Nome da Empresa'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}


              {/* Tab: Acesso */}
              {activeTab === 'acesso' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800">
                      Configure as credenciais de acesso do desenvolvedor ao sistema. O usuario sera criado automaticamente com permissoes de desenvolvedor.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email de Login *</label>
                    <input
                      type="email"
                      value={formData.login_email}
                      onChange={(e) => setFormData({ ...formData, login_email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="login@empresa.com"
                    />
                    <p className="text-xs text-gray-500 mt-1">Este sera o email usado para fazer login no sistema</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {editingDeveloper ? 'Nova Senha (deixe vazio para manter)' : 'Senha *'}
                      </label>
                      <input
                        type="password"
                        value={formData.login_password}
                        onChange={(e) => setFormData({ ...formData, login_password: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Senha</label>
                      <input
                        type="password"
                        value={formData.login_password_confirm}
                        onChange={(e) => setFormData({ ...formData, login_password_confirm: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  {formData.login_password && formData.login_password_confirm && formData.login_password !== formData.login_password_confirm && (
                    <p className="text-sm text-red-600">As senhas nao coincidem</p>
                  )}
                </div>
              )}
            </form>

            {/* Footer do Modal */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingDeveloper ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Plano e Cotas */}
      {showLimitsModal && editingLimitsDeveloper && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Gerenciar Developer</h2>
                <p className="text-sm text-gray-600 mt-1 font-medium">{editingLimitsDeveloper.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{editingLimitsDeveloper.email}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Cadastrado em {editingLimitsDeveloper.registered_at ? new Date(editingLimitsDeveloper.registered_at).toLocaleDateString('pt-BR') : new Date(editingLimitsDeveloper.created_at).toLocaleDateString('pt-BR')}
                  {' · '}{editingLimitsDeveloper.groups_count} grupos · {editingLimitsDeveloper.users_count} usuários
                </p>
              </div>
              <button onClick={() => setShowLimitsModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Plano */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">Plano</h3>
                <select
                  value={limitsFormData.plan_id || ''}
                  onChange={(e) => handlePlanChange(e.target.value || null, limitsModalPlans.length ? limitsModalPlans : plans)}
                  disabled={limitsFormLoading}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-50 disabled:cursor-not-allowed"
                >
                  {limitsFormLoading ? (
                    <option value="">Carregando planos...</option>
                  ) : (limitsModalPlans.length || plans.length) === 0 ? (
                    <option value="">Nenhum plano disponível</option>
                  ) : (
                    <>
                      <option value="">Selecione um plano</option>
                      {(limitsModalPlans.length ? limitsModalPlans : plans).map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                      {limitsFormData.plan_id && !(limitsModalPlans.length ? limitsModalPlans : plans).some((p) => p.id === limitsFormData.plan_id) && editingLimitsDeveloper.plan_name && (
                        <option value={limitsFormData.plan_id}>{editingLimitsDeveloper.plan_name} (atual)</option>
                      )}
                    </>
                  )}
                </select>
              </div>

              {/* Cotas Totais do Developer */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Cotas Totais do Developer</h3>
                <p className="text-xs text-gray-500 mb-4">O developer distribui essas cotas entre seus grupos em /dev/quotas</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Grupos (máx)</label>
                    <input
                      type="number"
                      min="0"
                      value={limitsFormData.max_companies}
                      onChange={(e) => setLimitsFormData({ ...limitsFormData, max_companies: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Usuários (máx)</label>
                    <input
                      type="number"
                      min="0"
                      value={limitsFormData.max_users}
                      onChange={(e) => setLimitsFormData({ ...limitsFormData, max_users: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Telas (máx)</label>
                    <input
                      type="number"
                      min="0"
                      value={limitsFormData.max_powerbi_screens}
                      onChange={(e) => setLimitsFormData({ ...limitsFormData, max_powerbi_screens: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Alertas</label>
                    <input
                      type="number"
                      min="0"
                      value={limitsFormData.max_alerts}
                      onChange={(e) => setLimitsFormData({ ...limitsFormData, max_alerts: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">0 se Free</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">WhatsApp/dia</label>
                    <input
                      type="number"
                      min="0"
                      value={limitsFormData.max_whatsapp_messages_per_day}
                      onChange={(e) => setLimitsFormData({ ...limitsFormData, max_whatsapp_messages_per_day: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">0 se Free</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Créditos IA/dia</label>
                    <input
                      type="number"
                      min="0"
                      value={limitsFormData.max_ai_credits_per_day}
                      onChange={(e) => setLimitsFormData({ ...limitsFormData, max_ai_credits_per_day: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-400 mt-1">0 se Free</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Atualizações/dia</label>
                    <input
                      type="number"
                      min="0"
                      value={limitsFormData.max_daily_refreshes}
                      onChange={(e) => setLimitsFormData({ ...limitsFormData, max_daily_refreshes: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                {(() => {
                  const planOptions = limitsModalPlans.length ? limitsModalPlans : plans;
                  const selectedPlanName = (limitsFormData.plan_id ? (planOptions.find(p => p.id === limitsFormData.plan_id)?.name ?? '') : '').toLowerCase();
                  const prevPlan = (editingLimitsDeveloper.plan_name || '').toLowerCase();
                  if (selectedPlanName === 'free' && prevPlan !== 'free') {
                    return (
                      <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                        <span className="font-medium">⚠️</span> Atenção: o developer perderá acesso a WhatsApp, Alertas e IA.
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Seção Acesso a Páginas */}
              <div className="border-t border-gray-100 pt-6">
                <h3 className="text-sm font-semibold text-gray-900 mb-1">Acesso a Páginas</h3>
                <p className="text-xs text-gray-500 mb-4">Controle quais páginas o developer e seus usuários podem acessar</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Conexões Power BI</p>
                      <p className="text-xs text-gray-500">/powerbi/conexoes</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const newValue = !(editingLimitsDeveloper!.allow_powerbi_connections ?? true);
                        try {
                          const res = await fetch(`/api/admin/developers/${editingLimitsDeveloper!.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ allow_powerbi_connections: newValue })
                          });
                          if (res.ok) {
                            setEditingLimitsDeveloper(prev => prev ? { ...prev, allow_powerbi_connections: newValue } : null);
                            showToast(newValue ? 'Conexões Power BI habilitadas' : 'Conexões Power BI desabilitadas', 'success');
                            loadData();
                          } else showToast((await res.json()).error || 'Erro', 'error');
                        } catch { showToast('Erro ao atualizar', 'error'); }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        (editingLimitsDeveloper!.allow_powerbi_connections ?? true) ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                        (editingLimitsDeveloper!.allow_powerbi_connections ?? true) ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Instâncias WhatsApp</p>
                      <p className="text-xs text-gray-500">/whatsapp/instancias</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const newValue = !(editingLimitsDeveloper!.allow_whatsapp_instances ?? true);
                        try {
                          const res = await fetch(`/api/admin/developers/${editingLimitsDeveloper!.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ allow_whatsapp_instances: newValue })
                          });
                          if (res.ok) {
                            setEditingLimitsDeveloper(prev => prev ? { ...prev, allow_whatsapp_instances: newValue } : null);
                            showToast(newValue ? 'Instâncias WhatsApp habilitadas' : 'Instâncias WhatsApp desabilitadas', 'success');
                            loadData();
                          } else showToast((await res.json()).error || 'Erro', 'error');
                        } catch { showToast('Erro ao atualizar', 'error'); }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        (editingLimitsDeveloper!.allow_whatsapp_instances ?? true) ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                        (editingLimitsDeveloper!.allow_whatsapp_instances ?? true) ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Permitir Tenant ID compartilhado</p>
                      <p className="text-xs text-gray-500">Permite usar um Tenant ID já utilizado por outro developer</p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const newValue = !(editingLimitsDeveloper!.allow_shared_tenant ?? false);
                        try {
                          const res = await fetch(`/api/admin/developers/${editingLimitsDeveloper!.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ allow_shared_tenant: newValue })
                          });
                          if (res.ok) {
                            setEditingLimitsDeveloper(prev => prev ? { ...prev, allow_shared_tenant: newValue } : null);
                            showToast(newValue ? 'Tenant ID compartilhado habilitado' : 'Tenant ID compartilhado desabilitado', 'success');
                            loadData();
                          } else showToast((await res.json()).error || 'Erro', 'error');
                        } catch { showToast('Erro ao atualizar', 'error'); }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        (editingLimitsDeveloper!.allow_shared_tenant ?? false) ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                        (editingLimitsDeveloper!.allow_shared_tenant ?? false) ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Seção Subdomínio */}
              <div className="border-t border-gray-100 pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      Subdomínio
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">Permitir que este developer tenha um endereço próprio</p>
                  </div>

                  {/* Toggle de permissão */}
                  <button
                    type="button"
                    onClick={async () => {
                      const newValue = !(editingLimitsDeveloper.subdomain_allowed || editingLimitsDeveloper.subdomain_enabled || editingLimitsDeveloper.subdomain_approved);

                      // Se está desabilitando e tem subdomínio ativo, confirmar
                      if (!newValue && editingLimitsDeveloper.subdomain_approved) {
                        if (!confirm('Isso vai desativar o subdomínio do developer. Continuar?')) return;
                      }

                      try {
                        const body: Record<string, unknown> = {};
                        if (newValue) {
                          body.subdomain_allowed = true;
                        } else {
                          body.subdomain_allowed = false;
                          body.subdomain_enabled = false;
                          body.subdomain_approved = false;
                        }

                        const res = await fetch(`/api/admin/developers/${editingLimitsDeveloper.id}`, {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(body)
                        });
                        if (res.ok) {
                          showToast(newValue ? 'Subdomínio permitido para este developer' : 'Permissão de subdomínio removida', 'success');
                          setShowLimitsModal(false);
                          loadData();
                        } else {
                          showToast((await res.json()).error || 'Erro', 'error');
                        }
                      } catch { showToast('Erro ao atualizar permissão', 'error'); }
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      editingLimitsDeveloper.subdomain_allowed || editingLimitsDeveloper.subdomain_enabled || editingLimitsDeveloper.subdomain_approved
                        ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                      editingLimitsDeveloper.subdomain_allowed || editingLimitsDeveloper.subdomain_enabled || editingLimitsDeveloper.subdomain_approved
                        ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>

                {/* Conteúdo — só aparece se permissão está habilitada */}
                {(editingLimitsDeveloper.subdomain_allowed || editingLimitsDeveloper.subdomain_enabled || editingLimitsDeveloper.subdomain_approved) && (
                  <div className="bg-gray-50 rounded-xl p-4">
                    {!editingLimitsDeveloper.subdomain ? (
                      /* Permissão dada mas developer ainda não configurou */
                      <p className="text-sm text-gray-500">
                        Permissão concedida. O developer pode configurar o subdomínio em <span className="font-mono text-xs bg-gray-200 px-1.5 py-0.5 rounded">/dev/perfil</span> → aba Subdomínio.
                      </p>
                    ) : (
                      /* Developer já configurou — mostrar info + ações */
                      <div className="space-y-3">
                        {/* URL */}
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium text-gray-500">Endereço solicitado</p>
                            <p className="text-sm font-mono font-semibold text-gray-900">
                              {editingLimitsDeveloper.subdomain}.meudashboard.org
                            </p>
                          </div>
                          {editingLimitsDeveloper.subdomain_approved && (
                            <a
                              href={`https://${editingLimitsDeveloper.subdomain}.meudashboard.org`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-500 hover:text-blue-600 transition-colors"
                              title="Abrir subdomínio"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>

                        {/* Status */}
                        <div>
                          {editingLimitsDeveloper.subdomain_approved ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium">
                              <CheckCircle className="w-3 h-3" /> Ativo
                            </span>
                          ) : editingLimitsDeveloper.subdomain_enabled ? (
                            <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">
                              Aguardando sua aprovação
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full font-medium">
                              <XCircle className="w-3 h-3" /> Rejeitado
                            </span>
                          )}
                        </div>

                        {/* Ações */}
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                          {/* Pendente → Aprovar / Rejeitar */}
                          {editingLimitsDeveloper.subdomain_enabled && !editingLimitsDeveloper.subdomain_approved && (
                            <>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/admin/developers/${editingLimitsDeveloper.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ subdomain_approved: true })
                                    });
                                    if (res.ok) {
                                      showToast('Subdomínio aprovado!', 'success');
                                      setShowLimitsModal(false);
                                      loadData();
                                    } else showToast((await res.json()).error || 'Erro', 'error');
                                  } catch { showToast('Erro ao aprovar', 'error'); }
                                }}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-xs font-medium"
                              >
                                Aprovar
                              </button>
                              <button
                                type="button"
                                onClick={async () => {
                                  try {
                                    const res = await fetch(`/api/admin/developers/${editingLimitsDeveloper.id}`, {
                                      method: 'PUT',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ subdomain_enabled: false, subdomain_approved: false })
                                    });
                                    if (res.ok) {
                                      showToast('Subdomínio rejeitado', 'success');
                                      setShowLimitsModal(false);
                                      loadData();
                                    } else showToast((await res.json()).error || 'Erro', 'error');
                                  } catch { showToast('Erro ao rejeitar', 'error'); }
                                }}
                                className="px-3 py-1.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-xs font-medium"
                              >
                                Rejeitar
                              </button>
                            </>
                          )}

                          {/* Ativo → Revogar */}
                          {editingLimitsDeveloper.subdomain_approved && (
                            <button
                              type="button"
                              onClick={async () => {
                                if (!confirm('Revogar subdomínio? O endereço ficará inacessível.')) return;
                                try {
                                  const res = await fetch(`/api/admin/developers/${editingLimitsDeveloper.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ subdomain_enabled: false, subdomain_approved: false })
                                  });
                                  if (res.ok) {
                                    showToast('Subdomínio revogado', 'success');
                                    setShowLimitsModal(false);
                                    loadData();
                                  } else showToast((await res.json()).error || 'Erro', 'error');
                                } catch { showToast('Erro ao revogar', 'error'); }
                              }}
                              className="text-xs text-red-500 hover:text-red-600 underline"
                            >
                              Revogar subdomínio
                            </button>
                          )}

                          {/* Rejeitado → Reaprovar */}
                          {editingLimitsDeveloper.subdomain && !editingLimitsDeveloper.subdomain_enabled && !editingLimitsDeveloper.subdomain_approved && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  const res = await fetch(`/api/admin/developers/${editingLimitsDeveloper.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ subdomain_enabled: true, subdomain_approved: true })
                                  });
                                  if (res.ok) {
                                    showToast('Subdomínio reativado!', 'success');
                                    setShowLimitsModal(false);
                                    loadData();
                                  } else showToast((await res.json()).error || 'Erro', 'error');
                                } catch { showToast('Erro ao reativar', 'error'); }
                              }}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                            >
                              Reativar
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 bg-gray-50/50">
              <button
                type="button"
                onClick={() => setShowLimitsModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveLimits}
                disabled={savingLimits}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {savingLimits && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {cascadeDeleteOpen && developerToDelete && (
        <CascadeDeleteModal
          isOpen={cascadeDeleteOpen}
          onClose={() => {
            setCascadeDeleteOpen(false);
            setDeveloperToDelete(null);
          }}
          onSuccess={() => {
            loadData();
          }}
          type="developer"
          id={developerToDelete.id}
          name={developerToDelete.name}
        />
      )}
    </MainLayout>
  );
}
