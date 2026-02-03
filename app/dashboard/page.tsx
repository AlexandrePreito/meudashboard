'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useMenu } from '@/contexts/MenuContext';

// Componente interno que usa o contexto
function DashboardContent() {
  const router = useRouter();
  const { activeGroup } = useMenu();
  const [screens, setScreens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [attemptedLoad, setAttemptedLoad] = useState(false);

  useEffect(() => {
    // Aguardar um pouco para o activeGroup ser carregado do localStorage
    const timer = setTimeout(() => {
      if (!attemptedLoad) {
        loadScreens();
        setAttemptedLoad(true);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [activeGroup?.id, attemptedLoad]);

  async function loadScreens() {
    try {
      let groupId = activeGroup?.id;

      // Se não tem activeGroup, buscar grupo do usuário diretamente
      if (!groupId) {
        try {
          const userRes = await fetch('/api/auth/me', { credentials: 'include' });
          if (userRes.ok) {
            const userData = await userRes.json();
            console.log('[DASHBOARD] Dados do usuário:', userData);
            
            // groupIds está no nível raiz da resposta, não dentro de user
            if (userData.groupIds && userData.groupIds.length > 0) {
              groupId = userData.groupIds[0];
              console.log('[DASHBOARD] Usando groupId do usuário:', groupId);
            } else if (userData.user?.groupIds && userData.user.groupIds.length > 0) {
              // Fallback para caso esteja dentro de user
              groupId = userData.user.groupIds[0];
            } else if (userData.user?.groupId) {
              groupId = userData.user.groupId;
            }
          }
        } catch (err) {
          console.error('Erro ao buscar grupo do usuário:', err);
        }
      }
      
      console.log('[DASHBOARD] groupId final:', groupId, 'activeGroup:', activeGroup?.id);

      // Se tem grupo, buscar primeira tela baseada na ordem personalizada
      if (groupId) {
        const firstScreenRes = await fetch(`/api/user/first-screen?group_id=${groupId}`, {
          credentials: 'include'
        });
        
        if (firstScreenRes.ok) {
          const firstScreenData = await firstScreenRes.json();
          
          if (firstScreenData.firstScreen?.id) {
            console.log('[DASHBOARD] Redirecionando para primeira tela:', firstScreenData.firstScreen.id);
            router.replace(`/tela/${firstScreenData.firstScreen.id}`);
            return;
          }
        } else {
          const errorData = await firstScreenRes.json();
          console.error('[DASHBOARD] Erro ao buscar primeira tela:', errorData);
        }
      }

      // Fallback: buscar todas as telas e usar ordem padrão
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
          console.log('[DASHBOARD] Redirecionando para primeira tela (fallback):', firstScreen.id);
          router.replace(`/tela/${firstScreen.id}`);
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size={32} />
          <p className="text-gray-600">Carregando dashboards...</p>
        </div>
      </div>
    );
  }

  if (screens.length === 0) {
    return (
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
    );
  }

  // Esta página só mostra loading ou "nenhum dashboard"
  // Se houver dashboards, redireciona automaticamente para o primeiro
  return null;
}

// Componente principal exportado
export default function DashboardPage() {
  return (
    <MainLayout>
      <DashboardContent />
    </MainLayout>
  );
}
