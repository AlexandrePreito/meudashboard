'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { useRefreshContextOptional } from '@/contexts/RefreshContext';
import { 
  RefreshCw,
  Maximize2,
  AlertCircle,
  X,
  Send,
  Bot,
  User,
  Download,
  Trash2,
  Asterisk,
  Database,
  Loader2,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  SkipForward
} from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

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
  const isNavigatingRef = useRef(false);
  const allowedPagesRef = useRef<string[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [embedConfig, setEmbedConfig] = useState<EmbedConfig | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingData, setRefreshingData] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<{
    active: boolean;
    progress: number;
    message: string;
    status: 'idle' | 'refreshing' | 'success' | 'error';
    current?: number;
    total?: number;
    succeeded?: number;
    failed?: number;
  }>({
    active: false,
    progress: 0,
    message: '',
    status: 'idle',
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Modo apresentação (TV) — navega entre PÁGINAS do relatório Power BI
  interface PresentationPage {
    name: string;
    displayName: string;
    is_enabled: boolean;
    display_order: number;
    duration_seconds: number;
  }
  const [presentationMode, setPresentationMode] = useState(false);
  const [presentationPages, setPresentationPages] = useState<PresentationPage[]>([]);
  const [currentPresentationIndex, setCurrentPresentationIndex] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [loadingPresentation, setLoadingPresentation] = useState(false);

  // Controle de páginas permitidas
  const [hasPageRestriction, setHasPageRestriction] = useState(false);
  const [allowedPages, setAllowedPages] = useState<{ name: string; displayName: string }[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Chat states
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [usageInfo, setUsageInfo] = useState<{ used: number; limit: number } | null>(null);
  const [userPermissions, setUserPermissions] = useState<{ can_use_ai: boolean; can_refresh: boolean }>({ can_use_ai: false, can_refresh: false });
  const refreshContext = useRefreshContextOptional();

  async function fetchUserPermissions() {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        // Se for master ou developer, tem todas as permissões
        if (data.user?.is_master || data.user?.is_developer) {
          setUserPermissions({ can_use_ai: true, can_refresh: true });
        } else {
          // Buscar permissões do membership
          setUserPermissions({
            can_use_ai: data.user?.can_use_ai ?? false,
            can_refresh: data.user?.can_refresh ?? false
          });
        }
      }
    } catch (error) {
      console.error('Erro ao buscar permissões:', error);
    }
  }

  async function startPresentation() {
    if (!embedInstanceRef.current) {
      alert('Relatório ainda não carregou. Aguarde e tente novamente.');
      return;
    }

    setLoadingPresentation(true);
    try {
      const report = embedInstanceRef.current;
      const pages = await report.getPages();

      let visiblePages = pages.filter((p: any) => p.visibility === 0 || p.visibility === undefined);

      if (visiblePages.length === 0) {
        alert('Nenhuma página encontrada no relatório.');
        return;
      }

      try {
        const pageAccessRes = await fetch(`/api/user/page-access?screen_id=${id}`);
        if (pageAccessRes.ok) {
          const pageAccessData = await pageAccessRes.json();
          if (
            pageAccessData.has_custom_config &&
            pageAccessData.allowed_pages.length > 0
          ) {
            const allowedSet = new Set(pageAccessData.allowed_pages);
            visiblePages = visiblePages.filter((p: any) => allowedSet.has(p.name));
          }
        }
      } catch {}

      if (visiblePages.length === 0) {
        alert('Nenhuma página permitida para apresentação.');
        return;
      }

      const screenRes = await fetch(`/api/powerbi/screens/${id}`);
      const screenData = await screenRes.json();
      const groupId = screenData.screen?.company_group_id;

      let savedConfig: any[] = [];
      if (groupId) {
        try {
          const res = await fetch(`/api/user/presentation?group_id=${groupId}&screen_id=${id}`);
          const data = await res.json();
          if (data.hasPresentation && data.pages?.length > 0) {
            savedConfig = data.pages;
          }
        } catch {}
      }

      const configMap = new Map(savedConfig.map((c: any) => [c.page_name, c]));

      const presentationList: PresentationPage[] = visiblePages
        .map((page: any, index: number) => {
          const config = configMap.get(page.name);
          return {
            name: page.name,
            displayName: page.displayName || page.name,
            is_enabled: config?.is_enabled ?? true,
            display_order: config?.display_order ?? index,
            duration_seconds: config?.duration_seconds ?? 10,
          };
        })
        .sort((a: PresentationPage, b: PresentationPage) => a.display_order - b.display_order);

      const enabledPages = presentationList.filter(p => p.is_enabled);

      if (enabledPages.length === 0) {
        alert('Nenhuma página habilitada para apresentação.');
        return;
      }

      setPresentationPages(enabledPages);
      setCurrentPresentationIndex(0);
      setCountdown(enabledPages[0].duration_seconds);

      await report.setPage(enabledPages[0].name);

      if (embedContainerRef.current && !document.fullscreenElement) {
        await embedContainerRef.current.requestFullscreen();
      }

      const newSettings = {
        panes: {
          filters: { visible: false },
          pageNavigation: { visible: false },
        },
      };
      await report.updateSettings(newSettings);

      setPresentationMode(true);
    } catch (err) {
      console.error('Erro ao iniciar apresentação:', err);
      alert('Erro ao iniciar modo apresentação. Verifique se o relatório está carregado.');
    } finally {
      setLoadingPresentation(false);
    }
  }

  function stopPresentation() {
    setPresentationMode(false);
    setPresentationPages([]);
    setCurrentPresentationIndex(0);
    setCountdown(0);

    if (embedInstanceRef.current && embedConfig) {
      embedInstanceRef.current.updateSettings({
        panes: {
          filters: { visible: false },
          pageNavigation: {
            visible: hasPageRestriction ? false : (embedConfig.showPageNavigation !== false),
          },
        },
      });
    }

    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  }

  async function skipToNext() {
    if (presentationPages.length === 0 || !embedInstanceRef.current) return;
    const nextIndex = (currentPresentationIndex + 1) % presentationPages.length;
    const nextPage = presentationPages[nextIndex];
    setCurrentPresentationIndex(nextIndex);
    setCountdown(nextPage.duration_seconds);

    try {
      await embedInstanceRef.current.setPage(nextPage.name);
    } catch (err) {
      console.error('Erro ao navegar para página:', err);
    }
  }

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

      embedInstanceRef.current.on('loaded', async () => {
        console.log('Relatório carregado com sucesso');

        try {
          const report = embedInstanceRef.current;
          if (!report) return;

          const pageAccessRes = await fetch(`/api/user/page-access?screen_id=${id}`);
          if (pageAccessRes.ok) {
            const pageAccessData = await pageAccessRes.json();

            if (
              pageAccessData.has_custom_config &&
              pageAccessData.allowed_pages.length > 0
            ) {
              const pages = await report.getPages();
              const allowedSet = new Set(pageAccessData.allowed_pages);

              const activePage = pages.find((p: any) => p.isActive);
              if (activePage && !allowedSet.has(activePage.name)) {
                const firstAllowed = pages.find((p: any) => allowedSet.has(p.name));
                if (firstAllowed) await report.setPage(firstAllowed.name);
              }

              await report.updateSettings({
                panes: {
                  filters: { visible: false },
                  pageNavigation: { visible: false },
                },
              });

              const visiblePages = pages
                .filter(
                  (p: any) =>
                    allowedSet.has(p.name) &&
                    (p.visibility === 0 || p.visibility === undefined)
                )
                .map((p: any) => ({
                  name: p.name,
                  displayName: p.displayName || p.name,
                }));

              setAllowedPages(visiblePages);
              setHasPageRestriction(true);
              const allowedNames = visiblePages.map((p) => p.name);
              allowedPagesRef.current = allowedNames;
              const active = pages.find((p: any) => p.isActive);
              const idx =
                active && allowedSet.has(active.name)
                  ? visiblePages.findIndex((p) => p.name === active.name)
                  : 0;
              setCurrentPageIndex(idx >= 0 ? idx : 0);

              console.log(
                `[Page Access] ${visiblePages.length}/${pages.length} páginas permitidas`
              );

              report.off('pageChanged');
              report.on('pageChanged', async (event: any) => {
                if (isNavigatingRef.current) return;
                const newPage = event.detail?.newPage;
                if (!newPage) return;

                const allowed = allowedPagesRef.current;
                if (allowed.length === 0) return;

                if (!allowed.includes(newPage.name)) {
                  console.warn(
                    `[Page Access] Bloqueado acesso à página "${newPage.displayName}". Redirecionando...`
                  );
                  isNavigatingRef.current = true;
                  try {
                    const firstAllowedName = allowed[0];
                    await report.setPage(firstAllowedName);
                    setCurrentPageIndex(0);
                  } catch (err) {
                    console.error('Erro ao redirecionar página:', err);
                  } finally {
                    setTimeout(() => {
                      isNavigatingRef.current = false;
                    }, 500);
                  }
                } else {
                  const idx = allowed.indexOf(newPage.name);
                  if (idx >= 0) setCurrentPageIndex(idx);
                }
              });
            } else {
              setHasPageRestriction(false);
              setAllowedPages([]);
              allowedPagesRef.current = [];
            }
          }
        } catch (err) {
          console.error('Erro ao aplicar filtro de páginas:', err);
        }
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
        fetchUserPermissions();
        
        // Primeiro, buscar informações da tela para pegar o group_id
        const screenRes = await fetch(`/api/powerbi/screens/${id}`);
        if (!screenRes.ok) {
          const screenData = await screenRes.json();
          throw new Error(screenData.error || 'Tela não encontrada');
        }

        const screenData = await screenRes.json();
        const groupId = screenData.screen?.company_group_id;

        if (groupId) {
          // Verificar se o usuário tem ordem personalizada e qual é a primeira tela
          const firstScreenRes = await fetch(`/api/user/first-screen?group_id=${groupId}`);
          if (firstScreenRes.ok) {
            const firstScreenData = await firstScreenRes.json();
            
            // Se tem ordem personalizada e a tela acessada não é a primeira, redirecionar
            if (firstScreenData.firstScreen && firstScreenData.firstScreen.id !== id) {
              console.log('[REDIRECT] Redirecionando para primeira tela da ordem personalizada:', {
                acessada: id,
                primeira: firstScreenData.firstScreen.id
              });
              router.replace(`/tela/${firstScreenData.firstScreen.id}`);
              return;
            }
          }
        }
        
        // Se chegou aqui, pode carregar a tela normalmente
        const res = await fetch('/api/powerbi/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ screen_id: id })
        });

        if (!res.ok) {
          const data = await res.json();
          
          // Se for erro de permissão, tentar redirecionar para a primeira tela correta
          if (res.status === 403 && groupId) {
            console.warn('[TELA] Erro de permissão, buscando primeira tela correta...');
            try {
              const firstScreenRes = await fetch(`/api/user/first-screen?group_id=${groupId}`, {
                credentials: 'include'
              });
              
              if (firstScreenRes.ok) {
                const firstScreenData = await firstScreenRes.json();
                if (firstScreenData.firstScreen?.id && firstScreenData.firstScreen.id !== id) {
                  console.log('[TELA] Redirecionando para primeira tela correta:', firstScreenData.firstScreen.id);
                  router.replace(`/tela/${firstScreenData.firstScreen.id}`);
                  return;
                }
              }
            } catch (redirectError) {
              console.error('[TELA] Erro ao buscar primeira tela:', redirectError);
            }
          }
          
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

  // Countdown do modo apresentação: ao chegar em 0, vai para próxima página do relatório
  useEffect(() => {
    if (!presentationMode || presentationPages.length === 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          const nextIndex = (currentPresentationIndex + 1) % presentationPages.length;
          const nextPage = presentationPages[nextIndex];
          setCurrentPresentationIndex(nextIndex);

          if (embedInstanceRef.current) {
            embedInstanceRef.current.setPage(nextPage.name).catch((err: any) => {
              console.error('Erro ao trocar página:', err);
            });
          }

          return nextPage.duration_seconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [presentationMode, currentPresentationIndex, presentationPages]);

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

  // Detectar mudança de fullscreen
  useEffect(() => {
    function handleFullscreenChange() {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      
      // Tentar travar orientação em landscape quando fullscreen
      if (isFs && screen.orientation && (screen.orientation as any).lock) {
        (screen.orientation as any).lock('landscape').catch(() => {
          // Alguns navegadores não suportam, ignora erro
        });
      }
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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

  async function handleFullscreen() {
    if (!embedContainerRef.current) return;

    if (document.fullscreenElement) {
      // Sair do fullscreen
      await document.exitFullscreen();
      // Desbloquear orientação
      if (screen.orientation && (screen.orientation as any).unlock) {
        (screen.orientation as any).unlock();
      }
    } else {
      // Entrar em fullscreen
      try {
        await embedContainerRef.current.requestFullscreen();
        // Tentar forçar landscape
        if (screen.orientation && (screen.orientation as any).lock) {
          await (screen.orientation as any).lock('landscape').catch(() => {});
        }
      } catch (err) {
        console.error('Erro ao entrar em fullscreen:', err);
      }
    }
  }

  function exitFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      if (screen.orientation && (screen.orientation as any).unlock) {
        (screen.orientation as any).unlock();
      }
    }
  }

  async function refreshSingleItem(item: { type: string; dataset_id?: string; dataflow_id?: string; connection_id?: string; name: string }): Promise<boolean> {
    const itemId = item.type === 'dataflow' ? item.dataflow_id : item.dataset_id;
    if (!itemId || !item.connection_id) return false;

    const res = await fetch('/api/powerbi/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataset_id: item.type === 'dataset' ? item.dataset_id : undefined,
        dataflow_id: item.type === 'dataflow' ? item.dataflow_id : undefined,
        connection_id: item.connection_id
      })
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Erro ao atualizar');
    }

    const maxAttempts = 120;
    let attempts = 0;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;

      const statusRes = await fetch(
        `/api/powerbi/refresh?${item.type === 'dataset' ? 'dataset_id' : 'dataflow_id'}=${itemId}&connection_id=${item.connection_id}`
      );

      if (statusRes.ok) {
        const data = await statusRes.json();
        const status = data.status;

        if (status === 'Completed' || status === 'Success') return true;
        if (status === 'Failed' || status === 'Disabled') throw new Error(`Atualização falhou: ${status}`);
      }
    }

    return true;
  }

  async function handleRefreshData() {
    if (refreshingData) return;

    setRefreshingData(true);
    setRefreshStatus({
      active: true,
      progress: 5,
      message: 'Buscando ordem de atualização...',
      status: 'refreshing',
    });

    refreshContext?.addRefresh({
      screenId: id,
      screenName: embedConfig?.screenTitle || 'Dashboard',
      status: 'refreshing',
      startedAt: new Date(),
    });

    try {
      const screenRes = await fetch(`/api/powerbi/screens/${id}`);
      if (!screenRes.ok) throw new Error('Erro ao buscar informações da tela');

      const screenData = await screenRes.json();
      const groupId = screenData.screen?.company_group_id;

      if (!groupId) throw new Error('Grupo não encontrado para esta tela');

      setRefreshStatus(prev => ({ ...prev, progress: 10, message: 'Carregando itens...' }));

      const orderRes = await fetch(`/api/powerbi/refresh-order?group_id=${groupId}`);
      if (!orderRes.ok) throw new Error('Erro ao buscar ordem de atualização');

      const orderData = await orderRes.json();
      const items = orderData.items || [];

      if (items.length === 0) {
        alert('Nenhum item configurado para atualização');
        return;
      }

      let succeeded = 0;
      let failed = 0;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const progressPct = 10 + Math.round(((i + 1) / items.length) * 85);
        setRefreshStatus(prev => ({
          ...prev,
          progress: progressPct,
          message: `Atualizando ${i + 1}/${items.length}: ${item.name}`,
          current: i + 1,
          total: items.length,
          succeeded,
          failed,
        }));

        try {
          const success = await refreshSingleItem(item);
          if (success) succeeded++;
          else failed++;
        } catch (err: any) {
          console.error(`Erro ao atualizar ${item.name}:`, err.message);
          failed++;
        }
      }

      setRefreshStatus({
        active: true,
        progress: 100,
        message: 'Atualização concluída!',
        status: 'success',
        current: items.length,
        total: items.length,
        succeeded,
        failed,
      });

      refreshContext?.updateRefresh(id, 'success');

      setTimeout(() => {
        setRefreshStatus({ active: false, progress: 0, message: '', status: 'idle' });
        handleRefresh();
      }, 3000);
    } catch (err: any) {
      console.error('Erro ao atualizar dados:', err);
      setRefreshStatus({
        active: true,
        progress: 100,
        message: err.message || 'Erro na atualização',
        status: 'error',
      });

      refreshContext?.updateRefresh(id, 'error');

      setTimeout(() => {
        setRefreshStatus(prev =>
          prev.status === 'error' ? { active: false, progress: 0, message: '', status: 'idle' } : prev
        );
      }, 5000);
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
            <LoadingSpinner size={40} />
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {embedConfig?.screenTitle || 'Dashboard'}
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {userPermissions.can_refresh && (
              <button
                onClick={handleRefreshData}
                disabled={refreshingData}
                className="p-2 bg-white text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
                title={refreshStatus.message || 'Atualizar Dados'}
              >
                <Database size={18} className={refreshingData ? 'animate-pulse' : ''} />
              </button>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 bg-white text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 shadow-sm"
              title="Recarregar"
            >
              <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={presentationMode ? stopPresentation : startPresentation}
              disabled={loadingPresentation}
              className={`p-2 rounded-lg transition-colors shadow-sm ${
                presentationMode
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
              title={presentationMode ? 'Parar apresentação' : 'Modo TV'}
            >
              {loadingPresentation ? (
                <Loader2 size={18} className="animate-spin" />
              ) : presentationMode ? (
                <Pause size={18} />
              ) : (
                <Play size={18} />
              )}
            </button>
            <button
              onClick={handleFullscreen}
              className="p-2 bg-white text-gray-600 hover:bg-gray-50 rounded-lg transition-colors shadow-sm"
              title="Tela cheia"
            >
              <Maximize2 size={18} />
            </button>
            {userPermissions.can_use_ai && (
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
                <Asterisk size={18} className="relative z-10" />
              </button>
            )}
          </div>
        </div>

        {/* Barra de Progresso de Atualização */}
        {refreshStatus.active && (
          <div className={`rounded-xl border p-4 transition-all ${
            refreshStatus.status === 'success'
              ? 'bg-green-50 border-green-200'
              : refreshStatus.status === 'error'
                ? 'bg-red-50 border-red-200'
                : 'bg-blue-50 border-blue-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {refreshStatus.status === 'refreshing' && (
                  <Loader2 size={16} className="animate-spin text-blue-600" />
                )}
                {refreshStatus.status === 'success' && (
                  <CheckCircle size={16} className="text-green-600" />
                )}
                {refreshStatus.status === 'error' && (
                  <XCircle size={16} className="text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  refreshStatus.status === 'success' ? 'text-green-700'
                    : refreshStatus.status === 'error' ? 'text-red-700'
                      : 'text-blue-700'
                }`}>
                  {refreshStatus.message}
                </span>
              </div>
              <span className="text-xs text-gray-500">{refreshStatus.progress}%</span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${
                  refreshStatus.status === 'success' ? 'bg-green-500'
                    : refreshStatus.status === 'error' ? 'bg-red-500'
                      : 'bg-blue-500'
                }`}
                style={{ width: `${refreshStatus.progress}%` }}
              />
            </div>

            {refreshStatus.total !== undefined && refreshStatus.total > 0 && (
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                {refreshStatus.succeeded !== undefined && refreshStatus.succeeded > 0 && (
                  <span className="flex items-center gap-1 text-green-600">
                    <CheckCircle size={14} /> {refreshStatus.succeeded} concluídos
                  </span>
                )}
                {refreshStatus.failed !== undefined && refreshStatus.failed > 0 && (
                  <span className="flex items-center gap-1 text-red-600">
                    <XCircle size={14} /> {refreshStatus.failed} com erro
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Container do Dashboard */}
        <div className="h-[calc(100vh-16rem)] min-h-[600px]">
          <div
            ref={embedContainerRef}
            className="h-full bg-white rounded-lg shadow-sm overflow-hidden relative"
          >
            {/* Botão para sair do fullscreen - aparece só em fullscreen */}
            {isFullscreen && (
              <button
                onClick={exitFullscreen}
                className="absolute top-4 right-4 z-50 p-3 bg-black/70 hover:bg-black/90 text-white rounded-full shadow-lg transition-all"
                title="Sair da tela cheia"
              >
                <X size={24} />
              </button>
            )}

            {/* Overlay controles modo apresentação (fullscreen) */}
            {presentationMode && isFullscreen && (
              <div className="absolute bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 hover:opacity-100 transition-opacity duration-300">
                <div className="flex items-center justify-between max-w-md mx-auto">
                  <button
                    onClick={stopPresentation}
                    className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg"
                    title="Parar"
                  >
                    <Pause size={20} />
                  </button>

                  <div className="flex items-center gap-3 text-white">
                    <span className="text-sm font-medium">
                      {presentationPages[currentPresentationIndex]?.displayName}
                    </span>
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                      {currentPresentationIndex + 1}/{presentationPages.length}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full border-2 border-white/50 flex items-center justify-center text-white text-sm font-bold">
                      {countdown}
                    </div>
                    <button
                      onClick={skipToNext}
                      className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg"
                      title="Próxima"
                    >
                      <SkipForward size={20} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navegação customizada de páginas (quando há restrição de acesso) */}
          {hasPageRestriction && allowedPages.length > 1 && !presentationMode && (
            <div className="flex items-center gap-1 px-4 py-2 bg-white border-t border-gray-200 overflow-x-auto">
              {allowedPages.map((page, index) => (
                <button
                  key={page.name}
                  onClick={async () => {
                    if (embedInstanceRef.current) {
                      isNavigatingRef.current = true;
                      try {
                        await embedInstanceRef.current.setPage(page.name);
                        setCurrentPageIndex(index);
                      } catch (err) {
                        console.error('Erro ao navegar:', err);
                      } finally {
                        setTimeout(() => {
                          isNavigatingRef.current = false;
                        }, 500);
                      }
                    }
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap transition-colors ${
                    currentPageIndex === index
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {page.displayName}
                </button>
              ))}
            </div>
          )}
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
            <div className="fixed inset-0 lg:inset-auto lg:right-0 lg:top-0 lg:h-full lg:w-96 flex flex-col bg-white shadow-2xl overflow-hidden z-50 animate-slide-in">
            {/* Header do Chat */}
            <div className="flex items-center justify-between px-4 h-16 text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setChatOpen(false)}
                  className="lg:hidden p-1 hover:bg-white/20 rounded transition-colors mr-1"
                >
                  <X size={20} />
                </button>
                <Asterisk size={20} className="hidden lg:block" />
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
                  className="hidden lg:block p-1.5 hover:bg-white/20 rounded transition-colors"
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
                  className="p-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  style={{ 
                    backgroundColor: 'var(--color-primary)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                  }}
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
