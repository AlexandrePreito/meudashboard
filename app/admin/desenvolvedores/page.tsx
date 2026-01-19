'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import CascadeDeleteModal from '@/components/CascadeDeleteModal';
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
  Crown,
  FileText,
  Key,
  Settings,
  LayoutDashboard,
  MessageSquare,
  RefreshCw,
  Bell
} from 'lucide-react';

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
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDeveloper, setEditingDeveloper] = useState<Developer | null>(null);
  const [activeTab, setActiveTab] = useState<'dados' | 'responsavel' | 'endereco' | 'personalizacao' | 'acesso'>('dados');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cascadeDeleteOpen, setCascadeDeleteOpen] = useState(false);
  const [developerToDelete, setDeveloperToDelete] = useState<{id: string, name: string} | null>(null);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [editingLimitsDeveloper, setEditingLimitsDeveloper] = useState<Developer | null>(null);
  const [savingLimits, setSavingLimits] = useState(false);
  const [limitsFormData, setLimitsFormData] = useState({
    max_companies: 5,
    max_users: 50,
    max_powerbi_screens: 10,
    max_daily_refreshes: 20,
    max_chat_messages_per_day: 1000,
    max_alerts: 20,
    monthly_price: 0
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
    login_password_confirm: ''
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
      login_password_confirm: ''
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
      login_password_confirm: ''
    });
    setActiveTab('dados');
    setShowModal(true);
  }

  function openLimitsModal(developer: Developer) {
    setEditingLimitsDeveloper(developer);
    setLimitsFormData({
      max_companies: developer.max_companies ?? 5,
      max_users: developer.max_users ?? 50,
      max_powerbi_screens: developer.max_powerbi_screens ?? 10,
      max_daily_refreshes: developer.max_daily_refreshes ?? 20,
      max_chat_messages_per_day: developer.max_chat_messages_per_day ?? 1000,
      max_alerts: developer.max_alerts ?? 20,
      monthly_price: developer.monthly_price ?? 0
    });
    setShowLimitsModal(true);
  }

  async function handleSaveLimits() {
    if (!editingLimitsDeveloper) return;
    
    try {
      setSavingLimits(true);
      const res = await fetch(`/api/admin/developers/${editingLimitsDeveloper.id}/limits`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(limitsFormData)
      });

      if (res.ok) {
        setShowLimitsModal(false);
        setEditingLimitsDeveloper(null);
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar limites');
      }
    } catch (error) {
      console.error('Erro ao salvar limites:', error);
      alert('Erro ao salvar limites');
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
        <div className="bg-white rounded-xl border border-gray-200 p-4">
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
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Desenvolvedor</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Contato</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Grupos</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Usuarios</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Status</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Criado em</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-700">Acoes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredDevelopers.map((dev) => (
                    <tr key={dev.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {dev.logo_url ? (
                            <img src={dev.logo_url} alt={dev.name} className="w-10 h-10 rounded-lg object-contain bg-gray-100" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: dev.primary_color || '#8B5CF6' }}>
                              <Code className="w-5 h-5 text-white" />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{dev.name}</p>
                            <p className="text-xs text-gray-500">{dev.max_users ?? 0} usuários | {dev.max_companies ?? 0} grupos</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{dev.email}</p>
                        <p className="text-xs text-gray-500">{dev.phone || '-'}</p>
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
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openLimitsModal(dev)}
                            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Configurar Limites"
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

      {/* Modal de Limites */}
      {showLimitsModal && editingLimitsDeveloper && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Configurar Limites</h2>
                <p className="text-sm text-gray-500 mt-1">{editingLimitsDeveloper.name}</p>
              </div>
              <button 
                onClick={() => setShowLimitsModal(false)} 
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Preço - Card destacado */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="w-5 h-5 text-purple-600" />
                  <h3 className="text-sm font-semibold text-gray-900">Preço Mensal</h3>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">R$</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={limitsFormData.monthly_price}
                    onChange={(e) => setLimitsFormData({ ...limitsFormData, monthly_price: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-10 pr-4 py-3 border border-purple-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg font-semibold"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">Valor cobrado mensalmente deste desenvolvedor</p>
              </div>

              {/* Limites Principais */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Building2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Limites Principais</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Máx. Grupos/Empresas</label>
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min="1"
                        value={limitsFormData.max_companies}
                        onChange={(e) => setLimitsFormData({ ...limitsFormData, max_companies: parseInt(e.target.value) || 1 })}
                        className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">Número máximo de grupos/empresas</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Máx. Usuários Total</label>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min="1"
                        value={limitsFormData.max_users}
                        onChange={(e) => setLimitsFormData({ ...limitsFormData, max_users: parseInt(e.target.value) || 1 })}
                        className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-medium"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">Total de usuários em todos os grupos</p>
                  </div>
                </div>
              </div>

              {/* Power BI */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <LayoutDashboard className="w-5 h-5 text-yellow-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">Power BI</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Máx. Telas Power BI</label>
                    <div className="flex items-center gap-2">
                      <LayoutDashboard className="w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min="0"
                        value={limitsFormData.max_powerbi_screens}
                        onChange={(e) => setLimitsFormData({ ...limitsFormData, max_powerbi_screens: parseInt(e.target.value) || 0 })}
                        className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 font-medium"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">Dashboards Power BI disponíveis</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Máx. Refreshes por Dia</label>
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min="0"
                        value={limitsFormData.max_daily_refreshes}
                        onChange={(e) => setLimitsFormData({ ...limitsFormData, max_daily_refreshes: parseInt(e.target.value) || 0 })}
                        className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 font-medium"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">Atualizações diárias permitidas</p>
                  </div>
                </div>
              </div>

              {/* IA e Alertas */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <MessageSquare className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900">IA e Alertas</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Máx. Msgs Chat IA/Dia</label>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min="0"
                        value={limitsFormData.max_chat_messages_per_day}
                        onChange={(e) => setLimitsFormData({ ...limitsFormData, max_chat_messages_per_day: parseInt(e.target.value) || 0 })}
                        className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-medium"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">Mensagens de chat IA por dia</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">Máx. Alertas</label>
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-gray-400" />
                      <input
                        type="number"
                        min="0"
                        value={limitsFormData.max_alerts}
                        onChange={(e) => setLimitsFormData({ ...limitsFormData, max_alerts: parseInt(e.target.value) || 0 })}
                        className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-medium"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">Alertas configurados simultaneamente</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
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
                Salvar Limites
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
