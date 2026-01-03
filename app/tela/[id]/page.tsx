'use client';

import { useState, useEffect, useRef, use, useCallback } from 'react';
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
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [embedConfig, setEmbedConfig] = useState<EmbedConfig | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const renderReport = useCallback(() => {
    if (!embedConfig || !embedContainerRef.current || !window.powerbi) {
      return;
    }

    try {
      const powerbi = window.powerbi;
      
      // Limpa instância anterior
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

  // Carrega o SDK e o embed
  useEffect(() => {
    let mounted = true;

    async function init() {
      // 1. Carrega o SDK se não existir
      if (!window.powerbi) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/powerbi-client@2.22.0/dist/powerbi.min.js';
          script.onload = () => {
            // Aguarda o SDK inicializar
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

      // 2. Busca config do embed
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

  // Renderiza quando tiver config
  useEffect(() => {
    if (embedConfig && embedContainerRef.current && window.powerbi) {
      renderReport();
    }
  }, [embedConfig, renderReport]);

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
          </div>
        </div>

        <div 
          ref={embedContainerRef}
          className="flex-1 bg-white rounded-lg shadow-sm overflow-hidden"
          style={{ minHeight: '500px' }}
        />
      </div>
    </MainLayout>
  );
}

