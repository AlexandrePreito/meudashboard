'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  RefreshCw,
  Maximize2,
  Loader2,
  AlertCircle,
  X,
  Send,
  Bot,
  User,
  Download,
  Trash2,
  Sparkles,
  Database
} from 'lucide-react';

interface EmbedConfig {
  embedToken: string;
  embedUrl: string;
  reportId: string;
  expiration: string;
  defaultPage: string | null;
  showPageNavigation: boolean;
  screenTitle: string;
  screenIcon: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

declare global {
  interface Window {
    powerbi: any;
  }
}

export default function TelaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const embedContainerRef = useRef<HTMLDivElement>(null);
  const embedInstanceRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [embedConfig, setEmbedConfig] = useState<EmbedConfig | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingData, setRefreshingData] = useState(false);
  const [refreshProgress, setRefreshProgress] = useState<string>('');

  // Chat states
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [usageInfo, setUsageInfo] = useState<{ used: number; limit: number } | null>(null);

  const renderReport = useCallback(() => {
    if (!embedConfig || !embedContainerRef.current || !window.powerbi) {
      return;
    }

    try {
      const powerbi = window.powerbi;

      if (embedContainerRef.current.innerHTML) {
        powerbi.reset(embedContainerRef.current);
      }

      const config = {
        type: 'report',
        tokenType: 1,
        accessToken: embedConfig.embedToken,
        embedUrl: embedConfig.embedUrl,
        id: embedConfig.reportId,
        permissions: 0,
        settings: {
          panes: {
            filters: { visible: false },
            pageNavigation: { visible: embedConfig.showPageNavigation !== false }
          }
        }
      };

      embedInstanceRef.current = powerbi.embed(embedContainerRef.current, config);

      embedInstanceRef.current.on('loaded', () => {
        console.log('Relatório carregado com sucesso');
      });

      embedInstanceRef.current.on('error', (event: any) => {
        console.error('Erro no Power BI:', event.detail);
      });

    } catch (err) {
      console.error('Erro ao renderizar:', err);
      setError('Erro ao renderizar o relatório');
    }
  }, [embedConfig]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!window.powerbi) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/powerbi-client@2.22.0/dist/powerbi.min.js';
          script.onload = () => {
            const check = setInterval(() => {
              if (window.powerbi && typeof window.powerbi.embed === 'function') {
                clearInterval(check);
                resolve();
              }
            }, 50);
            setTimeout(() => {
              clearInterval(check);
              reject(new Error('Timeout ao carregar SDK'));
            }, 10000);
          };
          script.onerror = () => reject(new Error('Falha ao carregar SDK'));
          document.head.appendChild(script);
        });
      }

      if (!mounted) return;

      try {
        const res = await fetch('/api/powerbi/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ screen_id: id })
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Erro ao carregar relatório');
        }

        const data = await res.json();
        if (mounted) {
          setEmbedConfig(data);
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [id]);

  useEffect(() => {
    if (embedConfig && embedContainerRef.current && window.powerbi) {
      renderReport();
    }
  }, [embedConfig, renderReport]);

  // Scroll do chat
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Função para buscar uso
  async function fetchUsageInfo() {
    try {
      const res = await fetch('/api/ai/usage');
      if (res.ok) {
        const data = await res.json();
        setUsageInfo({ used: data.used_today || 0, limit: data.daily_limit || 50 });
      }
    } catch (error) {
      console.error('Erro ao buscar uso:', error);
    }
  }

  // Buscar uso quando chat abrir
  useEffect(() => {
    if (chatOpen) {
      fetchUsageInfo();
    }
  }, [chatOpen]);

  function handleRefresh() {
    setRefreshing(true);
    setEmbedConfig(null);
    setLoading(true);
    setError(null);

    fetch('/api/powerbi/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ screen_id: id })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) throw new Error(data.error);
        setEmbedConfig(data);
      })
      .catch(err => setError(err.message))
      .finally(() => {
        setLoading(false);
        setRefreshing(false);
      });
  }

  function handleFullscreen() {
    if (!embedContainerRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      embedContainerRef.current.requestFullscreen();
    }
  }

  async function handleRefreshData() {
    if (refreshingData) return;
    
    setRefreshingData(true);
    setRefreshProgress('Buscando ordem de atualização...');

    try {
      // Buscar informações da tela para pegar o company_group_id
      const screenRes = await fetch(`/api/powerbi/screens/${id}`);
      if (!screenRes.ok) throw new Error('Erro ao buscar informações da tela');
      
      const screenData = await screenRes.json();
      const groupId = screenData.screen?.company_group_id;
      
      if (!groupId) throw new Error('Grupo não encontrado para esta tela');

      // Buscar ordem de atualização
      setRefreshProgress('Carregando itens para atualização...');
      const orderRes = await fetch(`/api/powerbi/refresh-order?group_id=${groupId}`);
      if (!orderRes.ok) throw new Error('Erro ao buscar ordem de atualização');
      
      const orderData = await orderRes.json();
      const items = orderData.items || [];

      if (items.length === 0) {
        alert('Nenhum item configurado para atualização');
        return;
      }

      // Executar atualização de cada item na ordem
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        setRefreshProgress(`Atualizando ${i + 1}/${items.length}: ${item.name}`);

        try {
          const itemId = item.type === 'dataflow' ? item.dataflow_id : item.dataset_id;
          
          const refreshRes = await fetch('/api/powerbi/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              [item.type === 'dataflow' ? 'dataflow_id' : 'dataset_id']: itemId,
              connection_id: item.connection_id
            })
          });

          if (!refreshRes.ok) {
            const errorData = await refreshRes.json();
            console.error(`Erro ao atualizar ${item.name}:`, errorData.error);
            // Continua para o próximo item mesmo com erro
          }

          // Aguardar 2 segundos entre atualizações
          if (i < items.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (err: any) {
          console.error(`Erro ao atualizar ${item.name}:`, err.message);
        }
      }

      setRefreshProgress('Atualização concluída!');
      setTimeout(() => {
        setRefreshProgress('');
      }, 3000);

    } catch (err: any) {
      console.error('Erro ao atualizar dados:', err);
      alert(err.message || 'Erro ao atualizar dados');
      setRefreshProgress('');
    } finally {
      setRefreshingData(false);
    }
  }

  // Extrair sugestões da resposta
  function extractSuggestions(content: string): { text: string; suggestions: string[] } {
    const match = content.match(/\[SUGESTOES\]([\s\S]*?)\[\/SUGESTOES\]/);
    if (match) {
      const suggestionsText = match[1];
      const suggestionsList = suggestionsText
        .split('\n')
        .map(s => s.replace(/^-\s*/, '').trim())
        .filter(s => s.length > 0);
      const cleanText = content.replace(/\[SUGESTOES\][\s\S]*?\[\/SUGESTOES\]/, '').trim();
      return { text: cleanText, suggestions: suggestionsList };
    }
    return { text: content, suggestions: [] };
  }

  async function sendMessage(text?: string) {
    const messageText = text || inputMessage.trim();
    if (!messageText || sending) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setSending(true);
    setSuggestions([]);
    
    // Simular fases de processamento
    setProcessingStatus('Analisando sua pergunta...');
    
    const statusMessages = [
      'Analisando sua pergunta...',
      'Consultando os dados...',
      'Processando informações...',
      'Gerando resposta...'
    ];
    
    let statusIndex = 0;
    const statusInterval = setInterval(() => {
      statusIndex = (statusIndex + 1) % statusMessages.length;
      setProcessingStatus(statusMessages[statusIndex]);
    }, 2000);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          conversation_id: conversationId,
          screen_id: id
        })
      });

      clearInterval(statusInterval);

      const data = await res.json();
      console.log('Resposta da API:', data);

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar mensagem');
      }

      if (data.conversation_id) {
        setConversationId(data.conversation_id);
      }

      const { text: cleanText, suggestions: newSuggestions } = extractSuggestions(data.message);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: cleanText,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setSuggestions(newSuggestions);

      // Atualizar uso após enviar mensagem
      fetchUsageInfo();

    } catch (err: any) {
      clearInterval(statusInterval);
      console.error('Erro no chat:', err);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `😕 Desculpe, ocorreu um erro: ${err.message}. Tente novamente.`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setSending(false);
      setProcessingStatus('');
    }
  }

  function handleKeyPress(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function exportChat() {
    if (messages.length === 0) {
      alert('Nenhuma mensagem para exportar');
      return;
    }

    const header = `Chat - ${embedConfig?.screenTitle || 'Dashboard'}
Exportado em: ${new Date().toLocaleString('pt-BR')}
${'='.repeat(50)}

`;

    const content = messages.map(msg => {
      const time = msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const role = msg.role === 'user' ? 'Você' : 'Assistente';
      return `[${time}] ${role}:\n${msg.content}\n`;
    }).join('\n' + '-'.repeat(30) + '\n\n');

    const blob = new Blob([header + content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${embedConfig?.screenTitle || 'dashboard'}-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function clearChat() {
    if (messages.length === 0) return;
    if (!confirm('Limpar todo o histórico do chat?')) return;
    
    setMessages([]);
    setConversationId(null);
    setSuggestions([]);
  }

  function formatMessageContent(content: string) {
    // Formatar markdown básico
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            <p className="text-gray-500">Carregando dashboard...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="p-4 bg-red-100 rounded-full">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Erro ao carregar</h2>
              <p className="text-gray-500">{error}</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Toast de progresso de atualização */}
      {refreshProgress && (
        <div className="fixed top-20 right-6 z-50 bg-blue-600 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-down">
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm font-medium">{refreshProgress}</span>
        </div>
      )}

      <div className="flex h-[calc(100vh-5.5rem)] -mt-6 -mx-6 px-6">
        {/* Área do Dashboard */}
        <div className="flex flex-col flex-1 transition-all duration-300">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">
                {embedConfig?.screenTitle || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshData}
                disabled={refreshingData}
                className="p-2 bg-white text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                title={refreshProgress || 'Atualizar Dados'}
              >
                <Database size={18} className={refreshingData ? 'animate-pulse' : ''} />
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 bg-white text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                title="Recarregar"
              >
                <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={handleFullscreen}
                className="p-2 bg-white text-gray-600 hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
                title="Tela cheia"
              >
                <Maximize2 size={18} />
              </button>
              <button
                onClick={() => setChatOpen(!chatOpen)}
                className={`relative p-2 rounded-lg transition-all shadow-md overflow-hidden ${
                  chatOpen 
                    ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white' 
                    : 'bg-gradient-to-r from-blue-400 to-blue-600 text-white hover:from-blue-500 hover:to-blue-700'
                }`}
                title="Chat IA"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
                <Sparkles size={18} className="relative z-10" />
              </button>
            </div>
          </div>

          <div
            ref={embedContainerRef}
            className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden"
          />
        </div>

        {/* Painel de Chat - Overlay */}
        {chatOpen && (
          <>
            {/* Overlay escuro de fundo */}
            <div 
              className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
              onClick={() => setChatOpen(false)}
            />
            
            {/* Painel de Chat */}
            <div className="fixed right-0 top-0 h-full w-96 flex flex-col bg-white shadow-2xl overflow-hidden z-50 animate-slide-in">
            {/* Header do Chat */}
            <div className="flex items-center justify-between px-4 h-16 bg-blue-700 text-white">
              <div className="flex items-center gap-2">
                <Sparkles size={20} />
                <span className="font-semibold">Assistente IA</span>
                {usageInfo && (
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">
                    {usageInfo.used}/{usageInfo.limit === 999999 ? '∞' : usageInfo.limit}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={exportChat}
                  className="p-1.5 hover:bg-white/20 rounded transition-colors"
                  title="Exportar conversa"
                >
                  <Download size={16} />
                </button>
                <button
                  onClick={clearChat}
                  className="p-1.5 hover:bg-white/20 rounded transition-colors"
                  title="Limpar chat"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={() => setChatOpen(false)}
                  className="p-1.5 hover:bg-white/20 rounded transition-colors"
                  title="Fechar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    Olá! Sou seu assistente de BI.
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    Pergunte sobre os dados deste dashboard.
                  </p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Bot size={14} className="text-blue-600" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      <div 
                        dangerouslySetInnerHTML={{ __html: formatMessageContent(msg.content) }}
                      />
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <User size={14} className="text-gray-600" />
                      </div>
                    )}
                  </div>
                ))
              )}
              
              {sending && (
                <div className="flex gap-2 justify-start">
                  <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                    <Bot size={14} className="text-blue-600 animate-pulse" />
                  </div>
                  <div className="bg-gray-100 px-4 py-3 rounded-lg max-w-[85%]">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{processingStatus}</p>
                  </div>
                </div>
              )}
              
              <div ref={chatEndRef} />
            </div>

            {/* Sugestões */}
            {suggestions.length > 0 && (
              <div className="px-4 pb-2">
                <div className="flex flex-wrap gap-2">
                  {suggestions.slice(0, 3).map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => sendMessage(suggestion)}
                      disabled={sending}
                      className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors disabled:opacity-50"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Pergunte sobre os dados..."
                  disabled={sending}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 disabled:bg-gray-50"
                />
                <button
                  onClick={() => sendMessage()}
                  disabled={sending || !inputMessage.trim()}
                  className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </div>
          </>
        )}
      </div>
    </MainLayout>
  );
}
