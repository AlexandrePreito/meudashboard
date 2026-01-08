'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import Link from 'next/link';
import {
  Bell,
  Plus,
  Search,
  Loader2,
  Edit,
  Trash2,
  Play,
  Pause,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MessageSquare,
  Calendar,
  Send
} from 'lucide-react';

interface Alert {
  id: string;
  name: string;
  description: string | null;
  is_enabled: boolean;
  alert_type: string;
  condition: string | null;
  threshold: number | null;
  check_frequency: string | null;
  check_times: string[] | null;
  notify_whatsapp: boolean;
  last_checked_at: string | null;
  last_triggered_at: string | null;
  created_at: string;
}

const alertTypeColors: Record<string, string> = {
  warning: 'bg-yellow-100 text-yellow-700',
  danger: 'bg-red-100 text-red-700',
  success: 'bg-green-100 text-green-700',
  info: 'bg-blue-100 text-blue-700'
};

const alertTypeLabels: Record<string, string> = {
  warning: 'Aviso',
  danger: 'Perigo',
  success: 'Sucesso',
  info: 'Info'
};

const conditionLabels: Record<string, string> = {
  greater_than: 'Maior que',
  less_than: 'Menor que',
  equals: 'Igual a',
  not_equals: 'Diferente de',
  greater_or_equal: 'Maior ou igual',
  less_or_equal: 'Menor ou igual'
};

const frequencyLabels: Record<string, string> = {
  daily: 'Diário',
  weekly: 'Semanal',
  monthly: 'Mensal'
};

export default function AlertasPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [triggeringId, setTriggeringId] = useState<string | null>(null);

  useEffect(() => {
    loadAlerts();
  }, []);

  async function loadAlerts() {
    try {
      const res = await fetch('/api/alertas');
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error('Erro ao carregar alertas:', err);
    } finally {
      setLoading(false);
    }
  }

  async function toggleEnabled(alert: Alert) {
    try {
      const res = await fetch('/api/alertas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: alert.id,
          is_enabled: !alert.is_enabled
        })
      });

      if (res.ok) {
        loadAlerts();
      }
    } catch (err) {
      console.error('Erro ao atualizar:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este alerta?')) return;

    try {
      const res = await fetch(`/api/alertas?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Alerta excluído!');
        loadAlerts();
      }
    } catch (err) {
      alert('Erro ao excluir');
    }
  }

  async function triggerAlert(alertItem: Alert) {
    if (!confirm(`Disparar o alerta "${alertItem.name}" agora?`)) return;
    
    setTriggeringId(alertItem.id);
    try {
      const res = await fetch(`/api/alertas/${alertItem.id}/trigger`, {
        method: 'POST'
      });
      
      if (res.ok) {
        const data = await res.json();
        alert(data.message || 'Alerta disparado com sucesso!');
        loadAlerts();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao disparar alerta');
      }
    } catch (err) {
      alert('Erro ao disparar alerta');
    } finally {
      setTriggeringId(null);
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR');
  }

  function formatThreshold(value: number | null) {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR').format(value);
  }

  const filteredAlerts = alerts.filter(a => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      a.name.toLowerCase().includes(term) ||
      a.description?.toLowerCase().includes(term)
    );
  });

  const stats = {
    total: alerts.length,
    enabled: alerts.filter(a => a.is_enabled).length,
    disabled: alerts.filter(a => !a.is_enabled).length,
    withWhatsapp: alerts.filter(a => a.notify_whatsapp).length
  };

  return (
    <MainLayout>
      <div className="space-y-6 -mt-12">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Alertas</h1>
            <p className="text-gray-500 text-sm mt-1">Gerencie alertas automáticos baseados em dados</p>
          </div>
          <Link href="/alertas/novo">
            <Button icon={<Plus size={20} />}>
              Novo Alerta
            </Button>
          </Link>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Bell className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.enabled}</p>
                <p className="text-sm text-gray-500">Ativos</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <XCircle className="text-gray-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.disabled}</p>
                <p className="text-sm text-gray-500">Inativos</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <MessageSquare className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.withWhatsapp}</p>
                <p className="text-sm text-gray-500">Com WhatsApp</p>
              </div>
            </div>
          </div>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar alertas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Lista de Alertas */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredAlerts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum alerta</h3>
            <p className="text-gray-500 mb-4">Crie alertas para monitorar seus dados automaticamente</p>
            <Link href="/alertas/novo">
              <Button icon={<Plus size={18} />}>
                Criar Alerta
              </Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Alerta</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tipo</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Condição</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Frequência</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Última Verificação</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAlerts.map((alertItem) => (
                  <tr key={alertItem.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleEnabled(alertItem)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          alertItem.is_enabled
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {alertItem.is_enabled ? <Play size={12} /> : <Pause size={12} />}
                        {alertItem.is_enabled ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{alertItem.name}</p>
                        {alertItem.description && (
                          <p className="text-sm text-gray-500 truncate max-w-xs">{alertItem.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        alertTypeColors[alertItem.alert_type] || 'bg-gray-100 text-gray-600'
                      }`}>
                        <AlertTriangle size={12} />
                        {alertTypeLabels[alertItem.alert_type] || alertItem.alert_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {alertItem.condition ? (
                        <span>
                          {conditionLabels[alertItem.condition] || alertItem.condition} {formatThreshold(alertItem.threshold)}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar size={14} />
                        {frequencyLabels[alertItem.check_frequency || ''] || alertItem.check_frequency || '-'}
                        {alertItem.check_times && alertItem.check_times.length > 0 && (
                          <span className="text-gray-400">
                            ({alertItem.check_times.join(', ')})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        {formatDate(alertItem.last_checked_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => triggerAlert(alertItem)}
                          disabled={triggeringId === alertItem.id || !alertItem.is_enabled}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                          title="Disparar agora"
                        >
                          {triggeringId === alertItem.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Send size={16} />
                          )}
                        </button>
                        <Link
                          href={`/alertas/${alertItem.id}`}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit size={16} />
                        </Link>
                        <button
                          onClick={() => handleDelete(alertItem.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={16} />
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
    </MainLayout>
  );
}

