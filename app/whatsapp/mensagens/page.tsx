'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import {
  MessageSquare,
  Loader2,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Filter,
  Phone,
  Users,
  X,
  Calendar,
  Clock
} from 'lucide-react';

interface Message {
  id: string;
  direction: string;
  phone_number: string | null;
  group_id: string | null;
  sender_name: string | null;
  message_content: string | null;
  message_type: string | null;
  media_url: string | null;
  status: string | null;
  created_at: string;
  instance: { id: string; name: string } | null;
}

interface Instance {
  id: string;
  name: string;
}

export default function MensagensPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDirection, setFilterDirection] = useState<string>('');
  const [filterInstance, setFilterInstance] = useState<string>('');
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    loadData();
  }, [filterDirection]);

  async function loadData() {
    setLoading(true);
    await Promise.all([loadMessages(), loadInstances()]);
    setLoading(false);
  }

  async function loadMessages() {
    try {
      let url = '/api/whatsapp/messages?limit=100';
      if (filterDirection) {
        url += `&direction=${filterDirection}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Erro ao carregar mensagens:', err);
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

  function openDetailsPanel(message: Message) {
    setSelectedMessage(message);
    setShowDetailsPanel(true);
  }

  function closeDetailsPanel() {
    setShowDetailsPanel(false);
    setSelectedMessage(null);
  }

  function formatPhone(phone: string | null) {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatFullDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  function truncateMessage(msg: string | null, maxLength: number = 100) {
    if (!msg) return '[Mídia]';
    if (msg.length <= maxLength) return msg;
    return msg.substring(0, maxLength) + '...';
  }

  const filteredMessages = messages.filter(msg => {
    // Filtro de busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesSearch = (msg.sender_name?.toLowerCase().includes(term)) ||
        (msg.phone_number?.includes(term)) ||
        (msg.message_content?.toLowerCase().includes(term));
      if (!matchesSearch) return false;
    }
    
    // Filtro de instância
    if (filterInstance) {
      if (filterInstance === 'sem-instancia') {
        return !msg.instance;
      }
      return msg.instance?.id === filterInstance;
    }
    
    return true;
  });

  const stats = {
    total: messages.length,
    incoming: messages.filter(m => m.direction === 'incoming').length,
    outgoing: messages.filter(m => m.direction === 'outgoing').length
  };

  // Paginação
  const totalPages = Math.ceil(filteredMessages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMessages = filteredMessages.slice(startIndex, endIndex);

  // Reset para página 1 quando mudar filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterDirection, filterInstance]);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mensagens</h1>
            <p className="text-gray-500 text-sm mt-1">Histórico de mensagens do WhatsApp</p>
          </div>
          <Button
            onClick={loadData}
            disabled={loading}
            loading={loading}
            icon={<RefreshCw size={18} />}
          >
            Atualizar
          </Button>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <MessageSquare className="text-gray-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <ArrowDownLeft className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.incoming}</p>
                <p className="text-sm text-gray-500">Recebidas</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <ArrowUpRight className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.outgoing}</p>
                <p className="text-sm text-gray-500">Enviadas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou conteúdo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <select
              value={filterDirection}
              onChange={(e) => setFilterDirection(e.target.value)}
              className="pl-10 pr-8 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 appearance-none min-w-[140px]"
            >
              <option value="">Todas</option>
              <option value="incoming">Recebidas</option>
              <option value="outgoing">Enviadas</option>
            </select>
          </div>
          <select
            value={filterInstance}
            onChange={(e) => setFilterInstance(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 min-w-[200px]"
          >
            <option value="">Todas as instâncias</option>
            <option value="sem-instancia">Sem instância</option>
            {instances.map(inst => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>
        </div>

        {/* Lista de Mensagens */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
          </div>
        ) : filteredMessages.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma mensagem</h3>
            <p className="text-gray-500">As mensagens aparecerão aqui quando chegarem</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {paginatedMessages.map((msg) => (
                <div 
                  key={msg.id} 
                  onClick={() => openDetailsPanel(msg)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedMessage?.id === msg.id ? 'bg-orange-50 border-l-4 border-orange-500' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      msg.direction === 'incoming' 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-green-100 text-green-600'
                    }`}>
                      {msg.direction === 'incoming' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">
                            {msg.sender_name || formatPhone(msg.phone_number) || 'Desconhecido'}
                          </p>
                          {msg.group_id && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">
                              <Users size={10} />
                              Grupo
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-xs ${
                            msg.direction === 'incoming'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}>
                            {msg.direction === 'incoming' ? 'Recebida' : 'Enviada'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">{formatDate(msg.created_at)}</span>
                      </div>
                      {msg.phone_number && msg.sender_name && (
                        <p className="text-xs text-gray-500 mb-1">{formatPhone(msg.phone_number)}</p>
                      )}
                      <p className="text-sm text-gray-700">
                        {truncateMessage(msg.message_content)}
                      </p>
                      {msg.message_type && msg.message_type !== 'text' && (
                        <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                          {msg.message_type}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="text-sm text-gray-600">
                  Mostrando {startIndex + 1} a {Math.min(endIndex, filteredMessages.length)} de {filteredMessages.length} mensagens
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                      // Mostrar apenas algumas páginas ao redor da atual
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 text-sm rounded-lg ${
                              currentPage === page
                                ? 'bg-green-600 text-white'
                                : 'border border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (page === currentPage - 2 || page === currentPage + 2) {
                        return <span key={page} className="px-1 text-gray-400">...</span>;
                      }
                      return null;
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Painel Lateral de Detalhes */}
        {showDetailsPanel && selectedMessage && (
          <div className="fixed inset-y-0 right-0 w-[450px] bg-white shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className={`px-4 py-3 flex items-center justify-between ${
              selectedMessage.direction === 'incoming' ? 'bg-blue-600' : 'bg-green-600'
            } text-white`}>
              <div className="flex items-center gap-2">
                {selectedMessage.direction === 'incoming' ? (
                  <ArrowDownLeft size={20} />
                ) : (
                  <ArrowUpRight size={20} />
                )}
                <span className="font-semibold">
                  {selectedMessage.direction === 'incoming' ? 'Mensagem Recebida' : 'Mensagem Enviada'}
                </span>
              </div>
              <button
                onClick={closeDetailsPanel}
                className={`p-2 rounded-lg transition-colors ${
                  selectedMessage.direction === 'incoming' ? 'hover:bg-blue-500' : 'hover:bg-green-500'
                }`}
              >
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Remetente/Destinatário */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Phone size={16} />
                  {selectedMessage.direction === 'incoming' ? 'Remetente' : 'Destinatário'}
                </h3>
                <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                  <div>
                    <span className="text-xs text-gray-500">Nome</span>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedMessage.sender_name || 'Não informado'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Telefone</span>
                    <p className="text-sm font-medium text-gray-900">
                      {formatPhone(selectedMessage.phone_number)}
                    </p>
                  </div>
                  {selectedMessage.group_id && (
                    <div>
                      <span className="text-xs text-gray-500">Grupo</span>
                      <p className="text-sm font-medium text-gray-900 flex items-center gap-2">
                        <Users size={14} />
                        {selectedMessage.group_id}
                      </p>
                    </div>
                  )}
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
                      {formatFullDate(selectedMessage.created_at)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Instância */}
              {selectedMessage.instance && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Instância</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-900">{selectedMessage.instance.name}</p>
                  </div>
                </div>
              )}

              {/* Tipo de Mensagem */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Tipo</h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <span className="inline-block px-2 py-1 rounded text-xs bg-gray-200 text-gray-700 font-medium">
                    {selectedMessage.message_type || 'text'}
                  </span>
                </div>
              </div>

              {/* Conteúdo da Mensagem */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MessageSquare size={16} />
                  Conteúdo
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  {selectedMessage.message_content ? (
                    <p className="text-sm text-gray-900 whitespace-pre-wrap break-words">
                      {selectedMessage.message_content}
                    </p>
                  ) : selectedMessage.media_url ? (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Mídia anexada</p>
                      <a 
                        href={selectedMessage.media_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Abrir mídia
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Sem conteúdo de texto</p>
                  )}
                </div>
              </div>

              {/* Status */}
              {selectedMessage.status && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Status</h3>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700">{selectedMessage.status}</p>
                  </div>
                </div>
              )}

              {/* ID */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">ID da Mensagem</h3>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-mono text-gray-600 break-all">{selectedMessage.id}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
