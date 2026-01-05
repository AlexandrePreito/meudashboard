'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Loader2,
  X,
  Search,
  Phone,
  MessageSquare,
  Bell,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface AuthorizedNumber {
  id: string;
  phone_number: string;
  name: string;
  can_receive_alerts: boolean;
  can_use_chat: boolean;
  is_active: boolean;
  created_at: string;
  instance: { id: string; name: string } | null;
}

interface Instance {
  id: string;
  name: string;
}

export default function NumerosAutorizadosPage() {
  const [numbers, setNumbers] = useState<AuthorizedNumber[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editingNumber, setEditingNumber] = useState<AuthorizedNumber | null>(null);

  const [formData, setFormData] = useState({
    phone_number: '',
    name: '',
    instance_id: '',
    can_receive_alerts: true,
    can_use_chat: true
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadNumbers(), loadInstances()]);
    setLoading(false);
  }

  async function loadNumbers() {
    try {
      const res = await fetch('/api/whatsapp/authorized-numbers');
      if (res.ok) {
        const data = await res.json();
        setNumbers(data.numbers || []);
      }
    } catch (err) {
      console.error('Erro ao carregar números:', err);
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
      phone_number: '',
      name: '',
      instance_id: '',
      can_receive_alerts: true,
      can_use_chat: true
    });
    setEditingNumber(null);
  }

  function openNew() {
    resetForm();
    setShowModal(true);
  }

  function openEdit(number: AuthorizedNumber) {
    setEditingNumber(number);
    setFormData({
      phone_number: number.phone_number,
      name: number.name,
      instance_id: number.instance?.id || '',
      can_receive_alerts: number.can_receive_alerts,
      can_use_chat: number.can_use_chat
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!formData.phone_number || !formData.name) {
      alert('Telefone e nome são obrigatórios');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        phone_number: formData.phone_number,
        name: formData.name,
        instance_id: formData.instance_id || null,
        can_receive_alerts: formData.can_receive_alerts,
        can_use_chat: formData.can_use_chat
      };

      if (editingNumber) {
        payload.id = editingNumber.id;
        payload.is_active = editingNumber.is_active;
      }

      const res = await fetch('/api/whatsapp/authorized-numbers', {
        method: editingNumber ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        alert(editingNumber ? 'Número atualizado!' : 'Número autorizado!');
        setShowModal(false);
        resetForm();
        loadNumbers();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao salvar');
      }
    } catch (err) {
      alert('Erro ao salvar número');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este número autorizado?')) return;

    try {
      const res = await fetch(`/api/whatsapp/authorized-numbers?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Número removido!');
        loadNumbers();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao remover');
      }
    } catch (err) {
      alert('Erro ao remover número');
    }
  }

  async function toggleActive(number: AuthorizedNumber) {
    try {
      const res = await fetch('/api/whatsapp/authorized-numbers', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: number.id,
          phone_number: number.phone_number,
          name: number.name,
          is_active: !number.is_active
        })
      });

      if (res.ok) {
        loadNumbers();
      }
    } catch (err) {
      console.error('Erro ao atualizar:', err);
    }
  }

  function formatPhone(phone: string) {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    if (cleaned.length === 12) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 8)}-${cleaned.slice(8)}`;
    }
    return phone;
  }

  const filteredNumbers = numbers.filter(num => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      num.name.toLowerCase().includes(term) ||
      num.phone_number.includes(term)
    );
  });

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Números Autorizados</h1>
            <p className="text-gray-500 text-sm mt-1">Gerencie os números que podem interagir com o sistema</p>
          </div>
          <button
            onClick={openNew}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Novo Número
          </button>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
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
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Contato</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Instância</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Alertas</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Chat IA</th>
                  <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredNumbers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      <Phone className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      Nenhum número autorizado
                    </td>
                  </tr>
                ) : (
                  filteredNumbers.map((num) => (
                    <tr key={num.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Phone className="text-blue-600" size={18} />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{num.name}</p>
                            <p className="text-sm text-gray-500">{formatPhone(num.phone_number)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {num.instance?.name || '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {num.can_receive_alerts ? (
                          <Bell className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <Bell className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {num.can_use_chat ? (
                          <MessageSquare className="w-5 h-5 text-green-600 mx-auto" />
                        ) : (
                          <MessageSquare className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleActive(num)}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            num.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {num.is_active ? <CheckCircle size={12} /> : <XCircle size={12} />}
                          {num.is_active ? 'Ativo' : 'Inativo'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(num)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(num.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">
                  {editingNumber ? 'Editar Número' : 'Novo Número Autorizado'}
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
                    placeholder="Ex: João Silva"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefone *</label>
                  <input
                    type="tel"
                    value={formData.phone_number}
                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                    placeholder="5511999999999"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Formato: código do país + DDD + número (ex: 5511999999999)</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instância</label>
                  <select
                    value={formData.instance_id}
                    onChange={(e) => setFormData({ ...formData, instance_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                  >
                    <option value="">Todas as instâncias</option>
                    {instances.map(inst => (
                      <option key={inst.id} value={inst.id}>{inst.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
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

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="can_use_chat"
                      checked={formData.can_use_chat}
                      onChange={(e) => setFormData({ ...formData, can_use_chat: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                    <label htmlFor="can_use_chat" className="text-sm text-gray-700 flex items-center gap-2">
                      <MessageSquare size={16} className="text-gray-400" />
                      Pode usar Chat IA
                    </label>
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
                  {editingNumber ? 'Salvar' : 'Autorizar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

