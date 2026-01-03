'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  MessageSquare,
  Wifi,
  WifiOff,
  RefreshCw,
  Phone,
  X,
  LogOut,
  RotateCcw,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface Instance {
  id: string;
  name: string;
  instance_name: string;
  api_url: string;
  phone_number: string | null;
  is_connected: boolean;
  last_connected_at: string | null;
  created_at: string;
}

interface Group {
  id: string;
  name: string;
}

export default function WhatsAppPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingInstance, setEditingInstance] = useState<Instance | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    api_url: '',
    api_key: '',
    instance_name: '',
    company_group_id: ''
  });

  useEffect(() => {
    loadInstances();
    loadGroups();
  }, []);

  async function loadInstances() {
    try {
      const res = await fetch('/api/whatsapp/instances');
      if (res.ok) {
        const data = await res.json();
        setInstances(data.instances || []);
      }
    } catch (err) {
      console.error('Erro ao carregar instâncias:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadGroups() {
    try {
      const res = await fetch('/api/user/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.error('Erro ao carregar grupos:', err);
    }
  }

  async function checkStatus(instance: Instance) {
    setCheckingStatus(instance.id);
    try {
      const res = await fetch(`/api/whatsapp/instances/${instance.id}?action=status`);
      if (res.ok) {
        const data = await res.json();
        setInstances(prev => prev.map(i => 
          i.id === instance.id 
            ? { ...i, is_connected: data.isConnected, phone_number: data.phoneNumber || i.phone_number }
            : i
        ));
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err);
    } finally {
      setCheckingStatus(null);
    }
  }

  async function handleAction(instanceId: string, action: 'logout' | 'restart') {
    if (!confirm(`Confirma a ação "${action === 'logout' ? 'Desconectar' : 'Reiniciar'}"?`)) return;

    try {
      const res = await fetch(`/api/whatsapp/instances/${instanceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (res.ok) {
        alert('Ação executada com sucesso!');
        loadInstances();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao executar ação');
      }
    } catch (err) {
      alert('Erro ao executar ação');
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      api_url: '',
      api_key: '',
      instance_name: '',
      company_group_id: ''
    });
    setEditingInstance(null);
    setShowApiKey(false);
  }

  function openNewInstance() {
    resetForm();
    setShowModal(true);
  }

  function handleEdit(instance: Instance) {
    setEditingInstance(instance);
    setFormData({
      name: instance.name,
      api_url: instance.api_url,
      api_key: '',
      instance_name: instance.instance_name,
      company_group_id: ''
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      alert('O nome é obrigatório');
      return;
    }
    if (!formData.api_url.trim()) {
      alert('A URL da API é obrigatória');
      return;
    }
    if (!editingInstance && !formData.api_key.trim()) {
      alert('A API Key é obrigatória');
      return;
    }
    if (!formData.instance_name.trim()) {
      alert('O nome da instância é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name: formData.name,
        api_url: formData.api_url,
        instance_name: formData.instance_name,
        company_group_id: formData.company_group_id || null
      };

      if (formData.api_key) {
        payload.api_key = formData.api_key;
      }

      if (editingInstance) {
        payload.id = editingInstance.id;
      }

      const res = await fetch('/api/whatsapp/instances', {
        method: editingInstance ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(editingInstance ? 'Instância atualizada!' : 'Instância criada!');
        setShowModal(false);
        resetForm();
        loadInstances();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar');
      }
    } catch (err) {
      alert('Erro ao salvar instância');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta instância?')) return;

    try {
      const res = await fetch(`/api/whatsapp/instances?id=${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert('Instância excluída!');
        loadInstances();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir');
      }
    } catch (err) {
      alert('Erro ao excluir instância');
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatPhone(phone: string | null) {
    if (!phone) return '-';
    // Formatar número brasileiro
    if (phone.startsWith('55') && phone.length >= 12) {
      const ddd = phone.substring(2, 4);
      const rest = phone.substring(4);
      if (rest.length === 9) {
        return `(${ddd}) ${rest.substring(0, 5)}-${rest.substring(5)}`;
      }
      return `(${ddd}) ${rest.substring(0, 4)}-${rest.substring(4)}`;
    }
    return phone;
  }

  const connectedCount = instances.filter(i => i.is_connected).length;
  const disconnectedCount = instances.filter(i => !i.is_connected).length;

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
            <p className="text-gray-500 text-sm mt-1">Gerencie suas instâncias do WhatsApp (Evolution API)</p>
          </div>
          <button
            onClick={openNewInstance}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus size={20} />
            Nova Instância
          </button>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-3xl font-bold text-gray-900">{instances.length}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Conectadas</p>
                <p className="text-3xl font-bold text-green-600">{connectedCount}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Wifi className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Desconectadas</p>
                <p className="text-3xl font-bold text-red-600">{disconnectedCount}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-full">
                <WifiOff className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Instâncias */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : instances.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma instância configurada</h3>
            <p className="text-gray-500 mb-4">Configure sua primeira instância do WhatsApp</p>
            <button
              onClick={openNewInstance}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Criar Instância
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {instances.map((instance) => (
              <div
                key={instance.id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${instance.is_connected ? 'bg-green-100' : 'bg-red-100'}`}>
                      {instance.is_connected ? (
                        <Wifi className="w-6 h-6 text-green-600" />
                      ) : (
                        <WifiOff className="w-6 h-6 text-red-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{instance.name}</h3>
                        {instance.is_connected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle size={12} />
                            Conectado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                            <XCircle size={12} />
                            Desconectado
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        <Phone size={14} className="inline mr-1" />
                        {formatPhone(instance.phone_number)}
                        <span className="mx-2">•</span>
                        Instância: {instance.instance_name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Última conexão: {formatDate(instance.last_connected_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => checkStatus(instance)}
                      disabled={checkingStatus === instance.id}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                      title="Verificar status"
                    >
                      <RefreshCw className={`w-4 h-4 ${checkingStatus === instance.id ? 'animate-spin' : ''}`} />
                    </button>
                    {instance.is_connected && (
                      <button
                        onClick={() => handleAction(instance.id, 'logout')}
                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Desconectar"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleAction(instance.id, 'restart')}
                      className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Reiniciar"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(instance)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(instance.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

        {/* Modal Criar/Editar */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingInstance ? 'Editar Instância' : 'Nova Instância'}
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
                    placeholder="Ex: WhatsApp Principal"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL da API (Evolution) *</label>
                  <input
                    type="text"
                    value={formData.api_url}
                    onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
                    placeholder="https://evolution.seudominio.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key * {editingInstance && '(deixe vazio para manter)'}
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={formData.api_key}
                      onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                      placeholder="Sua API Key da Evolution"
                      className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                    >
                      {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Instância *</label>
                  <input
                    type="text"
                    value={formData.instance_name}
                    onChange={(e) => setFormData({ ...formData, instance_name: e.target.value })}
                    placeholder="Ex: principal"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Nome configurado na Evolution API</p>
                </div>

                {groups.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grupo (opcional)</label>
                    <select
                      value={formData.company_group_id}
                      onChange={(e) => setFormData({ ...formData, company_group_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                    >
                      <option value="">Selecione um grupo</option>
                      {groups.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </select>
                  </div>
                )}
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
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 size={16} className="animate-spin" />}
                  {editingInstance ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
