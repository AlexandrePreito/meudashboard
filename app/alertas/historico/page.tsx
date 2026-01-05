'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { 
  History, 
  Bell, 
  CheckCircle, 
  XCircle, 
  Clock,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface HistoryItem {
  id: string;
  alert_id: string;
  triggered_at: string;
  trigger_type: string;
  value_at_trigger: string;
  notification_sent: boolean;
  notification_details: string;
  ai_alerts: {
    name: string;
    description: string;
  };
}

export default function HistoricoAlertasPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const limit = 20;

  useEffect(() => {
    fetchHistory();
  }, [page, filter]);

  async function fetchHistory() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString()
      });
      if (filter) params.append('alert_id', filter);

      const res = await fetch(`/api/alertas/historico?${params}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history);
        setTotal(data.total);
      }
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function parseNotificationDetails(details: string) {
    try {
      const parsed = JSON.parse(details);
      return parsed.sent || 0;
    } catch {
      return 0;
    }
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <MainLayout>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <History className="text-purple-600" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Histórico de Alertas</h1>
              <p className="text-gray-500 text-sm">Registro de todos os alertas disparados</p>
            </div>
          </div>

          <button
            onClick={() => fetchHistory()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{total}</p>
                <p className="text-sm text-gray-500">Total Disparados</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {history.filter(h => h.notification_sent).length}
                </p>
                <p className="text-sm text-gray-500">Enviados com Sucesso</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Clock size={20} className="text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {history.filter(h => h.trigger_type === 'scheduled').length}
                </p>
                <p className="text-sm text-gray-500">Agendados</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Filter size={20} className="text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {history.filter(h => h.trigger_type === 'manual').length}
                </p>
                <p className="text-sm text-gray-500">Manuais</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Data/Hora</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Alerta</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Valor</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Tipo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Enviados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                      Carregando...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      <History size={32} className="mx-auto mb-2 text-gray-300" />
                      Nenhum alerta disparado ainda
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(item.triggered_at)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-800">
                          {item.ai_alerts?.name || 'Alerta'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {item.ai_alerts?.description?.substring(0, 50) || ''}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-green-600">
                          {item.value_at_trigger || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          item.trigger_type === 'scheduled' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {item.trigger_type === 'scheduled' ? 'Agendado' : 'Manual'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.notification_sent ? (
                          <span className="inline-flex items-center gap-1 text-green-600">
                            <CheckCircle size={16} />
                            <span className="text-sm">Enviado</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600">
                            <XCircle size={16} />
                            <span className="text-sm">Falhou</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {parseNotificationDetails(item.notification_details)} destinatário(s)
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                Mostrando {page * limit + 1} - {Math.min((page + 1) * limit, total)} de {total}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="text-sm text-gray-600">
                  Página {page + 1} de {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}

