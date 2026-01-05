'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import {
  MessageSquare,
  Loader2,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Filter,
  Phone,
  Users
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

export default function MensagensPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDirection, setFilterDirection] = useState<string>('');

  useEffect(() => {
    loadMessages();
  }, [filterDirection]);

  async function loadMessages() {
    setLoading(true);
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
    } finally {
      setLoading(false);
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

  function truncateMessage(msg: string | null, maxLength: number = 100) {
    if (!msg) return '[Mídia]';
    if (msg.length <= maxLength) return msg;
    return msg.substring(0, maxLength) + '...';
  }

  const filteredMessages = messages.filter(msg => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (msg.sender_name?.toLowerCase().includes(term)) ||
      (msg.phone_number?.includes(term)) ||
      (msg.message_content?.toLowerCase().includes(term))
    );
  });

  const stats = {
    total: messages.length,
    incoming: messages.filter(m => m.direction === 'incoming').length,
    outgoing: messages.filter(m => m.direction === 'outgoing').length
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Mensagens</h1>
            <p className="text-gray-500 text-sm mt-1">Histórico de mensagens do WhatsApp</p>
          </div>
          <button
            onClick={loadMessages}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
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
              className="pl-10 pr-8 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-orange-500 appearance-none"
            >
              <option value="">Todas</option>
              <option value="incoming">Recebidas</option>
              <option value="outgoing">Enviadas</option>
            </select>
          </div>
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
              {filteredMessages.map((msg) => (
                <div key={msg.id} className="p-4 hover:bg-gray-50">
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
          </div>
        )}
      </div>
    </MainLayout>
  );
}
