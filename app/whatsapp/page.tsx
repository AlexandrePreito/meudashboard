'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import {
  MessageSquare,
  Smartphone,
  Users,
  UsersRound,
  Send,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  Loader2,
  TrendingUp,
  Clock,
  X
} from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  instances: { total: number; connected: number; disconnected: number };
  numbers: { total: number; active: number };
  groups: { total: number; active: number };
  messages: { total: number; sent: number; received: number; today: number };
}

export default function WhatsAppDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentMessages, setRecentMessages] = useState<any[]>([]);
  const [usageInfo, setUsageInfo] = useState<{ used: number; limit: number } | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [showDetailsPanel, setShowDetailsPanel] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      // Carregar estatísticas
      const [instancesRes, numbersRes, groupsRes, messagesRes, usageRes] = await Promise.all([
        fetch('/api/whatsapp/instances'),
        fetch('/api/whatsapp/authorized-numbers'),
        fetch('/api/whatsapp/groups'),
        fetch('/api/whatsapp/messages?limit=10'),
        fetch('/api/whatsapp/usage')
      ]);

      const instancesData = instancesRes.ok ? await instancesRes.json() : { instances: [] };
      const numbersData = numbersRes.ok ? await numbersRes.json() : { numbers: [] };
      const groupsData = groupsRes.ok ? await groupsRes.json() : { groups: [] };
      const messagesData = messagesRes.ok ? await messagesRes.json() : { messages: [], stats: {} };

      const instances = instancesData.instances || [];
      const numbers = numbersData.numbers || [];
      const groups = groupsData.groups || [];
      const messages = messagesData.messages || [];

      setStats({
        instances: {
          total: instances.length,
          connected: instances.filter((i: any) => i.is_connected).length,
          disconnected: instances.filter((i: any) => !i.is_connected).length
        },
        numbers: {
          total: numbers.length,
          active: numbers.filter((n: any) => n.is_active).length
        },
        groups: {
          total: groups.length,
          active: groups.filter((g: any) => g.is_active).length
        },
        messages: messagesData.stats || {
          total: messages.length,
          sent: messages.filter((m: any) => m.direction === 'outgoing').length,
          received: messages.filter((m: any) => m.direction === 'incoming').length,
          today: messages.length
        }
      });

      setRecentMessages(messages.slice(0, 5));

      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsageInfo({ used: usageData.used_this_month || 0, limit: usageData.monthly_limit || 100 });
      }
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  }

  function formatPhone(phone: string) {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
  }

  function formatDate(dateString: string) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return date.toLocaleDateString('pt-BR');
  }

  function openDetailsPanel(message: any) {
    setSelectedMessage(message);
    setShowDetailsPanel(true);
  }

  function closeDetailsPanel() {
    setShowDetailsPanel(false);
    setSelectedMessage(null);
  }

  function formatFullDate(dateString: string) {
    const date = new Date(dateString);
    return date.toLocaleString('pt-BR', { 
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
          <p className="text-gray-500 text-sm mt-1">Visão geral das integrações e mensagens</p>
        </div>

        {/* Card de Uso do Plano */}
        {usageInfo && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <Send className="text-green-600" size={20} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Mensagens este mês</p>
                  <p className="text-xl font-bold text-gray-900">
                    {usageInfo.used}
                    <span className="text-sm font-normal text-gray-400">
                      /{usageInfo.limit === 999999 ? '∞' : usageInfo.limit}
                    </span>
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`text-2xl font-bold ${
                  usageInfo.limit === 999999 ? 'text-gray-400' :
                  (usageInfo.used / usageInfo.limit) > 0.8 ? 'text-red-600' :
                  (usageInfo.used / usageInfo.limit) > 0.5 ? 'text-yellow-600' :
                  'text-green-600'
                }`}>
                  {usageInfo.limit === 999999 ? '∞' : Math.round((usageInfo.used / usageInfo.limit) * 100)}%
                </span>
              </div>
            </div>
            {usageInfo.limit !== 999999 && (
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    (usageInfo.used / usageInfo.limit) > 0.8 ? 'bg-red-500' :
                    (usageInfo.used / usageInfo.limit) > 0.5 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min((usageInfo.used / usageInfo.limit) * 100, 100)}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Instâncias */}
          <Link href="/whatsapp/instancias" className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Smartphone className="text-green-600" size={24} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                    <CheckCircle size={12} />
                    {stats?.instances.connected || 0}
                  </span>
                  <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                    <XCircle size={12} />
                    {stats?.instances.disconnected || 0}
                  </span>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats?.instances.total || 0}</p>
              <p className="text-sm text-gray-500">Instâncias</p>
            </div>
          </Link>

          {/* Números Autorizados */}
          <Link href="/whatsapp/numeros" className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="text-blue-600" size={24} />
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                  {stats?.numbers.active || 0} ativos
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats?.numbers.total || 0}</p>
              <p className="text-sm text-gray-500">Números Autorizados</p>
            </div>
          </Link>

          {/* Grupos Autorizados */}
          <Link href="/whatsapp/grupos" className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <UsersRound className="text-purple-600" size={24} />
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-700">
                  {stats?.groups.active || 0} ativos
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats?.groups.total || 0}</p>
              <p className="text-sm text-gray-500">Grupos Autorizados</p>
            </div>
          </Link>

          {/* Mensagens */}
          <Link href="/whatsapp/mensagens" className="block">
            <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <MessageSquare className="text-orange-600" size={24} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                    <ArrowUpRight size={12} />
                    {stats?.messages.sent || 0}
                  </span>
                  <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700">
                    <ArrowDownLeft size={12} />
                    {stats?.messages.received || 0}
                  </span>
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900">{stats?.messages.total || 0}</p>
              <p className="text-sm text-gray-500">Mensagens</p>
            </div>
          </Link>
        </div>

        {/* Grid de conteúdo */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Últimas Mensagens */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock size={18} className="text-gray-400" />
                Últimas Mensagens
              </h2>
              <Link href="/whatsapp/mensagens" className="text-sm text-green-600 hover:text-green-700">
                Ver todas
              </Link>
            </div>
            <div className="divide-y divide-gray-100">
              {recentMessages.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <MessageSquare className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p>Nenhuma mensagem ainda</p>
                </div>
              ) : (
                recentMessages.map((msg) => (
                  <div key={msg.id} className="p-4 hover:bg-gray-50 cursor-pointer" onClick={() => openDetailsPanel(msg)}>
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        msg.direction === 'incoming' 
                          ? 'bg-blue-100 text-blue-600' 
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {msg.direction === 'incoming' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-gray-900 text-sm">
                            {msg.sender_name || formatPhone(msg.phone_number) || 'Desconhecido'}
                          </p>
                          <span className="text-xs text-gray-400">{formatDate(msg.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {msg.message_content || '[Mídia]'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Atalhos Rápidos */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp size={18} className="text-gray-400" />
                Ações Rápidas
              </h2>
            </div>
            <div className="p-4 grid grid-cols-2 gap-3">
              <Link
                href="/whatsapp/instancias"
                className="flex items-center gap-3 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
              >
                <Smartphone className="text-green-600" size={20} />
                <div>
                  <p className="font-medium text-gray-900 text-sm">Instâncias</p>
                  <p className="text-xs text-gray-500">Gerenciar conexões</p>
                </div>
              </Link>

              <Link
                href="/whatsapp/numeros"
                className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
              >
                <Users className="text-blue-600" size={20} />
                <div>
                  <p className="font-medium text-gray-900 text-sm">Números</p>
                  <p className="text-xs text-gray-500">Autorizar contatos</p>
                </div>
              </Link>

              <Link
                href="/whatsapp/grupos"
                className="flex items-center gap-3 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
              >
                <UsersRound className="text-purple-600" size={20} />
                <div>
                  <p className="font-medium text-gray-900 text-sm">Grupos</p>
                  <p className="text-xs text-gray-500">Autorizar grupos</p>
                </div>
              </Link>

              <Link
                href="/whatsapp/webhook"
                className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <Send className="text-orange-600" size={20} />
                <div>
                  <p className="font-medium text-gray-900 text-sm">Webhook</p>
                  <p className="text-xs text-gray-500">Configurar Evolution</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {showDetailsPanel && selectedMessage && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm" onClick={closeDetailsPanel} />
          <div className="fixed inset-y-0 right-0 w-[400px] bg-white shadow-2xl z-50 flex flex-col animate-slide-in">
            <div className={`px-4 py-3 flex items-center justify-between ${
              selectedMessage.direction === 'incoming' ? 'bg-blue-600' : 'bg-green-600'
            } text-white`}>
              <div className="flex items-center gap-2">
                {selectedMessage.direction === 'incoming' ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                <span className="font-semibold">
                  {selectedMessage.direction === 'incoming' ? 'Mensagem Recebida' : 'Mensagem Enviada'}
                </span>
              </div>
              <button onClick={closeDetailsPanel} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-xs text-gray-500">Contato</span>
                <p className="font-medium text-gray-900">{selectedMessage.sender_name || formatPhone(selectedMessage.phone_number)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="text-xs text-gray-500">Data/Hora</span>
                <p className="font-medium text-gray-900">{formatFullDate(selectedMessage.created_at)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-xs text-gray-500 block mb-2">Mensagem</span>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedMessage.message_content || '[Mídia]'}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </MainLayout>
  );
}
