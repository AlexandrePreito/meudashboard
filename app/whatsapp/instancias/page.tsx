'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import {
  Smartphone,
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Power,
  Eye,
  EyeOff,
  QrCode
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

export default function InstanciasPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [checkingStatus, setCheckingStatus] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [editingInstance, setEditingInstance] = useState<Instance | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    api_url: '',
    api_key: '',
    instance_name: ''
  });

  useEffect(() => {
    loadInstances();
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

  function resetForm() {
    setFormData({ name: '', api_url: '', api_key: '', instance_name: '' });
    setEditingInstance(null);
    setShowApiKey(false);
  }

  function openNew() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(instance: Instance) {
    setEditingInstance(instance);
    setFormData({
      name: instance.name,
      api_url: instance.api_url,
      api_key: '',
      instance_name: instance.instance_name
    });
    setShowApiKey(false);
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.name || !formData.api_url || !formData.instance_name) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }
    if (!editingInstance && !formData.api_key) {
      alert('API Key é obrigatória');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name: formData.name,
        api_url: formData.api_url,
        instance_name: formData.instance_name
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
      const res = await fetch(`/api/whatsapp/instances?id=${id}`, { method: 'DELETE' });
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

  async function checkStatus(id: string) {
    setCheckingStatus(id);
    try {
      const res = await fetch(`/api/whatsapp/instances/${id}?action=status`);
      if (res.ok) {
        loadInstances();
      }
    } catch (err) {
      console.error('Erro ao verificar status:', err);
    } finally {
      setCheckingStatus(null);
    }
  }

  async function getQRCode(id: string) {
    setCheckingStatus(id);
    try {
      const res = await fetch(`/api/whatsapp/instances/${id}?action=qrcode`);
      if (res.ok) {
        const data = await res.json();
        setQrCode(data.qrcode || null);
        setPairingCode(data.pairingCode || null);
        setShowQRModal(true);
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao gerar QR Code');
      }
    } catch (err) {
      alert('Erro ao gerar QR Code');
    } finally {
      setCheckingStatus(null);
    }
  }

  async function disconnect(id: string) {
    if (!confirm('Desconectar esta instância?')) return;

    try {
      const res = await fetch(`/api/whatsapp/instances/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });
      if (res.ok) {
        alert('Instância desconectada!');
        loadInstances();
      }
    } catch (err) {
      alert('Erro ao desconectar');
    }
  }

  function formatPhone(phone: string | null) {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR');
  }

  const filteredInstances = instances.filter(instance => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      instance.name.toLowerCase().includes(term) ||
      instance.instance_name.toLowerCase().includes(term)
    );
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Instâncias WhatsApp</h1>
            <p className="text-gray-500 text-sm mt-1">Gerencie as conexões com a Evolution API</p>
          </div>
          <Button onClick={openNew} icon={<Plus size={20} />}>
            Nova Instância
          </Button>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar instâncias..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
          />
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : filteredInstances.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Smartphone className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma instância</h3>
            <p className="text-gray-500 mb-4">Conecte sua primeira instância WhatsApp</p>
            <Button onClick={openNew}>
              Criar Instância
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredInstances.map((instance) => (
              <div key={instance.id} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      instance.is_connected ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <Smartphone className={instance.is_connected ? 'text-green-600' : 'text-red-600'} size={24} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{instance.name}</h3>
                      <p className="text-sm text-gray-500">{instance.instance_name}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                    instance.is_connected
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {instance.is_connected ? <CheckCircle size={12} /> : <XCircle size={12} />}
                    {instance.is_connected ? 'Conectado' : 'Desconectado'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Telefone:</span>
                    <span className="font-medium text-gray-900">{formatPhone(instance.phone_number)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Última conexão:</span>
                    <span className="text-gray-600">{formatDate(instance.last_connected_at)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => checkStatus(instance.id)}
                      disabled={checkingStatus === instance.id}
                      className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Verificar status"
                    >
                      <RefreshCw size={16} className={checkingStatus === instance.id ? 'animate-spin' : ''} />
                    </button>
                    {!instance.is_connected && (
                      <button
                        onClick={() => getQRCode(instance.id)}
                        disabled={checkingStatus === instance.id}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="QR Code"
                      >
                        <QrCode size={16} />
                      </button>
                    )}
                    {instance.is_connected && (
                      <button
                        onClick={() => disconnect(instance.id)}
                        className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Desconectar"
                      >
                        <Power size={16} />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(instance)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(instance.id)}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">URL da API *</label>
                  <input
                    type="url"
                    value={formData.api_url}
                    onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
                    placeholder="https://api.evolution.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Instância *</label>
                  <input
                    type="text"
                    value={formData.instance_name}
                    onChange={(e) => setFormData({ ...formData, instance_name: e.target.value })}
                    placeholder="nome-instancia"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    API Key {editingInstance ? '(deixe vazio para manter)' : '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={formData.api_key}
                      onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
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
              </div>

              <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
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
                  {editingInstance ? 'Salvar' : 'Criar'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal QR Code */}
        {showQRModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-md">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">Conectar WhatsApp</h2>
                <button
                  onClick={() => { setShowQRModal(false); setQrCode(null); setPairingCode(null); }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 text-center">
                {qrCode ? (
                  <>
                    <p className="text-gray-600 mb-4">Escaneie o QR Code com seu WhatsApp</p>
                    <div className="inline-block p-4 bg-white border-2 border-gray-200 rounded-xl">
                      <img src={qrCode} alt="QR Code" className="w-64 h-64" />
                    </div>
                    {pairingCode && (
                      <div className="mt-4 p-3 bg-gray-100 rounded-lg">
                        <p className="text-sm text-gray-500">Ou use o código:</p>
                        <p className="text-2xl font-mono font-bold text-gray-900">{pairingCode}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-8">
                    <Loader2 className="w-12 h-12 animate-spin text-green-600 mx-auto mb-4" />
                    <p className="text-gray-500">Gerando QR Code...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

