'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  RefreshCw,
  Maximize2,
  Loader2,
  ArrowLeft,
  AlertCircle,
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  Download,
  Trash2
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

  // Chat states
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);

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
              <p className="text-gray-500 mb-4">{error}</p>
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors mx-auto"
              >
                <ArrowLeft size={18} />
                Voltar
              </button>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-8rem)]">
        {/* Área do Dashboard */}
        <div className={`flex flex-col flex-1 transition-all duration-300 ${chatOpen ? 'mr-4' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-bold text-gray-900">
                {embedConfig?.screenTitle || 'Dashboard'}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                title="Recarregar"
              >
                <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={handleFullscreen}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Tela cheia"
              >
                <Maximize2 size={18} />
              </button>
              <button
                onClick={() => setChatOpen(!chatOpen)}
                className={`p-2 rounded-lg transition-colors ${
                  chatOpen 
                    ? 'bg-blue-600 text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                title="Chat IA"
              >
                <MessageSquare size={18} />
              </button>
            </div>
          </div>

          <div
            ref={embedContainerRef}
            className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden"
            style={{ minHeight: '500px' }}
          />
        </div>

        {/* Painel de Chat */}
        {chatOpen && (
          <div className="w-96 flex flex-col bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            {/* Header do Chat */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
              <div className="flex items-center gap-2">
                <Bot size={20} />
                <span className="font-semibold">Assistente IA</span>
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
        )}
      </div>
    </MainLayout>
  );
}
