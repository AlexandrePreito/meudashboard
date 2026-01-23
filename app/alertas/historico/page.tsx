'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import { useMenu } from '@/contexts/MenuContext';
import { 
  History, 
  Bell, 
  CheckCircle, 
  XCircle, 
  Clock,
  Filter,
  RefreshCw,
  X,
  Phone,
  Users,
  Calendar,
  MessageSquare,
  Send
} from 'lucide-react';

interface HistoryItem {
  id: string;
  alert_id: string;
  triggered_at: string;
  alert_value: string | null;
  alert_message: string;
  email_sent: boolean | null;
  webhook_sent: boolean | null;
  webhook_response: any;
  ai_alerts: {
    name: string;
    description: string;
  };
}

interface WhatsAppGroup {
  group_id: string;
  group_name: string;
}

function HistoricoContent() {
  const { activeGroup } = useMenu();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState('');
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState<HistoryItem | null>(null);
  const [whatsappGroups, setWhatsappGroups] = useState<Map<string, string>>(new Map());
  const [whatsappNumbers, setWhatsappNumbers] = useState<Map<string, string>>(new Map());
  const limit = 20;

  useEffect(() => {
    // Resetar página quando o grupo ou filtro mudar
    setPage(0);
  }, [filter, activeGroup?.id]);

  useEffect(() => {
    // Carregar histórico quando página, filtro ou grupo mudar
    fetchHistory(activeGroup);
    loadWhatsAppGroups();
    loadWhatsAppNumbers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filter, activeGroup?.id]);

  async function loadWhatsAppGroups() {
    try {
      const res = await fetch('/api/whatsapp/groups');
      if (res.ok) {
        const data = await res.json();
        const groupsMap = new Map<string, string>();
        (data.groups || []).forEach((group: any) => {
          // A API retorna group_id e group_name
          if (group.group_id && group.group_name) {
            groupsMap.set(group.group_id, group.group_name);
          }
        });
        setWhatsappGroups(groupsMap);
      }
    } catch (err) {
      console.error('Erro ao carregar grupos WhatsApp:', err);
    }
  }

  async function loadWhatsAppNumbers() {
    try {
      const url = activeGroup ? `/api/whatsapp/authorized-numbers?group_id=${activeGroup.id}` : '/api/whatsapp/authorized-numbers';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const numbersMap = new Map<string, string>();
        (data.numbers || []).forEach((number: any) => {
          // A API retorna phone_number e name
          if (number.phone_number && number.name) {
            // Normalizar o número (remover caracteres não numéricos para comparação)
            const normalizedPhone = number.phone_number.replace(/\D/g, '');
            numbersMap.set(normalizedPhone, number.name);
          }
        });
        setWhatsappNumbers(numbersMap);
      }
    } catch (err) {
      console.error('Erro ao carregar números WhatsApp:', err);
    }
  }

  async function fetchHistory(currentGroup?: { id: string; name: string } | null) {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString()
      });
      if (filter) params.append('alert_id', filter);
      if (currentGroup) params.append('group_id', currentGroup.id);

      const res = await fetch(`/api/alertas/historico?${params}`);
      if (res.ok) {
        const data = await res.json();
        console.log('[Historico] Dados recebidos:', {
          total: data.total,
          historyCount: data.history?.length || 0,
          groupId: currentGroup?.id || 'nenhum',
          history: data.history?.slice(0, 2) || [],
          fullHistory: data.history || []
        });
        console.log('[Historico] Primeiro item (se houver):', data.history?.[0]);
        const historyData = data.history || [];
        console.log('[Historico] Processando histórico:', {
          count: historyData.length,
          firstItem: historyData[0],
          allItems: historyData
        });
        setHistory(historyData);
        setTotal(data.total || 0);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Erro desconhecido' }));
        console.error('Erro ao buscar histórico:', res.status, errorData);
        setHistory([]);
        setTotal(0);
      }
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      setHistory([]);
      setTotal(0);
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

  function getNotificationCount(item: HistoryItem): number {
    if (item.webhook_response && typeof item.webhook_response === 'object') {
      return item.webhook_response.success_count || item.webhook_response.sent || 0;
    }
    return 0;
  }

  function getTriggerType(item: HistoryItem): 'manual' | 'scheduled' {
    if (item.webhook_response && typeof item.webhook_response === 'object') {
      return item.webhook_response.type === 'scheduled' ? 'scheduled' : 'manual';
    }
    return 'manual';
  }

  function openDetailsPanel(item: HistoryItem) {
    setSelectedHistory(item);
    setShowDetailsPanel(true);
  }

  function closeDetailsPanel() {
    setShowDetailsPanel(false);
    setSelectedHistory(null);
  }

  function formatPhone(phone: string) {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  }

  function formatFullDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function getRecipients(item: HistoryItem) {
    if (!item.webhook_response || typeof item.webhook_response !== 'object') {
      return { numbers: [], groups: [] };
    }

    const response = item.webhook_response;
    
    // Para disparos manuais
    if (response.results) {
      return {
        numbers: response.results.numbers || [],
        groups: response.results.groups || []
      };
    }

    // Para disparos agendados (pode não ter detalhes)
    return {
      numbers: [],
      groups: []
    };
  }

  function getNumberName(phone: string): string {
    if (!phone) return '';
    // Normalizar o número para comparação
    const normalizedPhone = phone.replace(/\D/g, '');
    return whatsappNumbers.get(normalizedPhone) || '';
  }

  function getActualMessage(item: HistoryItem): string {
    // Prioridade: webhook_response.message > alert_message
    // A mensagem real enviada deve estar salva em um desses campos
    if (item.webhook_response && typeof item.webhook_response === 'object') {
      if (item.webhook_response.message && typeof item.webhook_response.message === 'string') {
        return item.webhook_response.message;
      }
    }
    
    // Se não tiver no webhook_response, usar o alert_message
    if (item.alert_message && item.alert_message.trim()) {
      return item.alert_message;
    }
    
    return 'Mensagem não disponível';
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Histórico de Alertas</h1>
            <p className="text-gray-500 mt-1">Registro de todos os alertas disparados</p>
          </div>

          <Button
            onClick={() => fetchHistory(activeGroup)}
            disabled={loading}
            loading={loading}
            icon={<RefreshCw size={16} />}
          >
            Atualizar
          </Button>
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
                  {history.filter(h => h.webhook_sent).length}
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
                  {history.filter(h => getTriggerType(h) === 'scheduled').length}
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
                  {history.filter(h => getTriggerType(h) === 'manual').length}
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
                      <p className="font-medium">Nenhum alerta disparado ainda</p>
                      <p className="text-xs mt-1 text-gray-400">
                        {activeGroup 
                          ? `Para o grupo "${activeGroup.name}"` 
                          : 'Para seus grupos'}
                      </p>
                      <p className="text-xs mt-2 text-gray-400">
                        Dispare um alerta manualmente ou aguarde o agendamento automático
                      </p>
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr 
                      key={item.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => openDetailsPanel(item)}
                    >
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
                          {item.alert_value || 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          getTriggerType(item) === 'scheduled' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-purple-100 text-purple-700'
                        }`}>
                          {getTriggerType(item) === 'scheduled' ? 'Agendado' : 'Manual'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {item.webhook_sent ? (
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
                        {getNotificationCount(item)} destinatário(s)
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
              <div className="text-sm text-gray-600">
                Mostrando {page * limit + 1} a {Math.min((page + 1) * limit, total)} de {total} alertas
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i).map(pageNum => {
                    // Mostrar apenas algumas páginas ao redor da atual
                    if (
                      pageNum === 0 ||
                      pageNum === totalPages - 1 ||
                      (pageNum >= page - 1 && pageNum <= page + 1)
                    ) {
                      return (
                        <Button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          variant={page === pageNum ? 'primary' : 'secondary'}
                          size="sm"
                          className={page === pageNum ? '' : 'border border-gray-300'}
                        >
                          {pageNum + 1}
                        </Button>
                      );
                    } else if (pageNum === page - 2 || pageNum === page + 2) {
                      return <span key={pageNum} className="px-1 text-gray-400">...</span>;
                    }
                    return null;
                  })}
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Painel Lateral de Detalhes */}
        {showDetailsPanel && selectedHistory && (
          <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="px-4 h-16 flex items-center justify-between text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
              <div className="flex items-center gap-2">
                <Bell size={20} />
                <span className="font-semibold">Detalhes do Alerta</span>
              </div>
              <button
                onClick={closeDetailsPanel}
                className="p-2 rounded-lg transition-colors"
                style={{ 
                  backgroundColor: 'transparent',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Informações do Alerta */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Bell size={16} />
                  Alerta
                </h3>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div>
                    <span className="text-xs text-gray-500">Nome</span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedHistory.ai_alerts?.name || 'Alerta'}
                    </p>
                  </div>
                  {selectedHistory.ai_alerts?.description && (
                    <div>
                      <span className="text-xs text-gray-500">Descrição</span>
                      <p className="text-sm text-gray-700">
                        {selectedHistory.ai_alerts.description}
                      </p>
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-gray-500">Valor no Disparo</span>
                    <p className="text-sm font-medium text-green-600">
                      {selectedHistory.alert_value || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Tipo</span>
                    <p className="text-sm">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        getTriggerType(selectedHistory) === 'scheduled' 
                          ? 'bg-blue-100 text-blue-700' 
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {getTriggerType(selectedHistory) === 'scheduled' ? 'Agendado' : 'Manual'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Data e Hora */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Calendar size={16} />
                  Data e Hora
                </h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-sm font-medium">
                      {formatFullDate(selectedHistory.triggered_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status de Envio */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Send size={16} />
                  Status de Envio
                </h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  {selectedHistory.webhook_sent ? (
                    <span className="inline-flex items-center gap-1 text-green-600">
                      <CheckCircle size={16} />
                      <span className="text-sm font-medium">Enviado com Sucesso</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-600">
                      <XCircle size={16} />
                      <span className="text-sm font-medium">Falha no Envio</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Destinatários - Números */}
              {(() => {
                const recipients = getRecipients(selectedHistory);
                return recipients.numbers && recipients.numbers.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Phone size={16} />
                      Números ({recipients.numbers.length})
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      {recipients.numbers.map((num: any, idx: number) => {
                        const phoneNumber = num.phone || '';
                        const numberName = getNumberName(phoneNumber);
                        return (
                          <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                            <div className="flex-1">
                              {numberName ? (
                                <>
                                  <p className="text-sm font-medium text-gray-900">
                                    {numberName}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {formatPhone(phoneNumber)}
                                  </p>
                                </>
                              ) : (
                                <p className="text-sm font-medium text-gray-900">
                                  {formatPhone(phoneNumber)}
                                </p>
                              )}
                              {num.error && (
                                <p className="text-xs text-red-600 mt-1">{num.error}</p>
                              )}
                            </div>
                            {num.success ? (
                              <CheckCircle size={16} className="text-green-600" />
                            ) : (
                              <XCircle size={16} className="text-red-600" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Destinatários - Grupos */}
              {(() => {
                const recipients = getRecipients(selectedHistory);
                return recipients.groups && recipients.groups.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <Users size={16} />
                      Grupos ({recipients.groups.length})
                    </h3>
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      {recipients.groups.map((group: any, idx: number) => {
                        const groupId = group.groupId || group.group_id || '';
                        const groupName = whatsappGroups.get(groupId) || groupId || 'Grupo';
                        return (
                          <div key={idx} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-gray-900">
                                {groupName}
                              </p>
                              {groupId && groupName !== groupId && (
                                <p className="text-xs text-gray-500 mt-1">{groupId}</p>
                              )}
                              {group.error && (
                                <p className="text-xs text-red-600 mt-1">{group.error}</p>
                              )}
                            </div>
                            {group.success ? (
                              <CheckCircle size={16} className="text-green-600" />
                            ) : (
                              <XCircle size={16} className="text-red-600" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Mensagem */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MessageSquare size={16} />
                  Mensagem Enviada (Texto Completo)
                </h3>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="max-h-96 overflow-y-auto">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap break-words leading-relaxed">
                      {getActualMessage(selectedHistory)}
                    </p>
                  </div>
                </div>
              </div>

              {/* ID */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">ID do Registro</h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-mono text-gray-600 break-all">{selectedHistory.id}</p>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default function HistoricoAlertasPage() {
  return (
    <MainLayout>
      <HistoricoContent />
    </MainLayout>
  );
}

