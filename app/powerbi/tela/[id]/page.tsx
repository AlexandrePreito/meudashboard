'use client';

import { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { 
  RefreshCw, 
  Maximize2, 
  Loader2, 
  ArrowLeft,
  AlertCircle
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

export default function TelaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const embedContainerRef = useRef<HTMLDivElement>(null);
  const embedInstanceRef = useRef<any>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [embedConfig, setEmbedConfig] = useState<EmbedConfig | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);

  // Carrega o SDK do Power BI
  useEffect(() => {
    if ((window as any).powerbi) {
      setSdkLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/powerbi-client@2.22.0/dist/powerbi.min.js';
    script.async = true;
    script.onload = () => {
      const checkSdk = setInterval(() => {
        if ((window as any).powerbi) {
          clearInterval(checkSdk);
          setSdkLoaded(true);
        }
      }, 100);
      setTimeout(() => clearInterval(checkSdk), 10000);
    };
    script.onerror = () => {
      setError('Falha ao carregar Power BI SDK');
      setLoading(false);
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  // Carrega a configuração do embed
  useEffect(() => {
    if (sdkLoaded) {
      loadEmbed();
    }
  }, [sdkLoaded, id]);

  // Renderiza o relatório quando tiver config e SDK
  useEffect(() => {
    if (embedConfig && sdkLoaded && embedContainerRef.current) {
      renderReport();
    }
  }, [embedConfig, sdkLoaded]);

  // Agenda refresh do token
  useEffect(() => {
    if (!embedConfig?.expiration) return;

    const expirationTime = new Date(embedConfig.expiration).getTime();
    const now = Date.now();
    const timeUntilExpiry = expirationTime - now - (2 * 60 * 1000);

    if (timeUntilExpiry > 0) {
      refreshTimerRef.current = setTimeout(() => {
        refreshToken();
      }, Math.max(timeUntilExpiry, 30000));
    }

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [embedConfig?.expiration]);

  // Listener de fullscreen
  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  async function loadEmbed() {
    setLoading(true);
    setError(null);

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
      setEmbedConfig(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function renderReport() {
    if (!embedConfig || !embedContainerRef.current) return;

    const powerbi = (window as any).powerbi;
    if (!powerbi) return;

    // Limpa instância anterior
    powerbi.reset(embedContainerRef.current);

    const config = {
      type: 'report',
      tokenType: powerbi.models.TokenType.Embed,
      accessToken: embedConfig.embedToken,
      embedUrl: embedConfig.embedUrl,
      id: embedConfig.reportId,
      permissions: powerbi.models.Permissions.Read,
      settings: {
        panes: {
          filters: { visible: false },
          pageNavigation: { visible: embedConfig.showPageNavigation }
        },
        background: powerbi.models.BackgroundType.Transparent,
        layoutType: powerbi.models.LayoutType.Custom,
        customLayout: {
          displayOption: powerbi.models.DisplayOption.FitToPage
        }
      }
    };

    if (embedConfig.defaultPage) {
      (config as any).pageName = embedConfig.defaultPage;
    }

    embedInstanceRef.current = powerbi.embed(embedContainerRef.current, config);
  }

  async function refreshToken() {
    try {
      const res = await fetch('/api/powerbi/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screen_id: id })
      });

      if (res.ok) {
        const data = await res.json();
        setEmbedConfig(data);
        
        if (embedInstanceRef.current) {
          await embedInstanceRef.current.setAccessToken(data.embedToken);
        }
      }
    } catch (error) {
      console.error('Erro ao renovar token:', error);
    }
  }

  function handleRefresh() {
    setRefreshing(true);
    loadEmbed().finally(() => setRefreshing(false));
  }

  function handleFullscreen() {
    if (!embedContainerRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      embedContainerRef.current.requestFullscreen();
    }
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
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header da tela */}
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
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
          </div>
        </div>

        {/* Container do relatório */}
        <div 
          ref={embedContainerRef}
          className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden"
          style={{ minHeight: '500px' }}
        />

        <style jsx global>{`
          iframe {
            border: none !important;
          }
        `}</style>
      </div>
    </MainLayout>
  );
}

