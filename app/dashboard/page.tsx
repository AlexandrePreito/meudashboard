'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function DashboardPage() {
  const router = useRouter();
  const [screens, setScreens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScreens();
  }, []);

  async function loadScreens() {
    try {
      const res = await fetch('/api/powerbi/screens', {
        credentials: 'include'
      });
      
      if (res.ok) {
        const data = await res.json();
        const activeScreens = (data.screens || [])
          .filter((s: any) => s.is_active)
          .sort((a: any, b: any) => {
            if (a.is_first && !b.is_first) return -1;
            if (!a.is_first && b.is_first) return 1;
            return a.title.localeCompare(b.title);
          });
        
        setScreens(activeScreens);
        
        // Se houver telas, redirecionar automaticamente para a primeira
        if (activeScreens.length > 0) {
          const firstScreen = activeScreens[0];
          router.push(`/tela/${firstScreen.id}`);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar telas:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size={32} />
            <p className="text-gray-600">Carregando dashboards...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (screens.length === 0) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Nenhum dashboard disponível
            </h2>
            <p className="text-gray-600">
              Não há dashboards configurados para visualização.
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Esta página só mostra loading ou "nenhum dashboard"
  // Se houver dashboards, redireciona automaticamente para o primeiro
  return null;
}
