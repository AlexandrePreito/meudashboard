'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MenuProvider, useMenu } from '@/contexts/MenuContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Sidebar from './Sidebar';
import Header from './Header';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { showToast } from '@/lib/toast';
import PasswordChangeModal from '@/components/PasswordChangeModal';

interface User {
  id: string;
  email: string;
  full_name?: string;
  is_master?: boolean;
  is_developer?: boolean;
  role?: string;
  needsPasswordChange?: boolean;
}

interface MainLayoutProps {
  children: React.ReactNode;
}

function MainContent({ children, user }: MainLayoutProps & { user: User | null }) {
  const { isCollapsed, setUser: setContextUser } = useMenu();

  useEffect(() => {
    if (user) {
      setContextUser({
        id: user.id,
        is_master: user.is_master,
        is_developer: user.is_developer,
        role: user.role
      });
    }
  }, [user, setContextUser]);

  // Heartbeat a cada 5 minutos para manter sessão (Tempo Online)
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      fetch('/api/auth/heartbeat', { method: 'POST', credentials: 'include' }).catch(() => {});
    }, 5 * 60 * 1000);

    const handleBeforeUnload = () => {
      fetch('/api/auth/heartbeat', { method: 'POST', credentials: 'include', keepalive: true }).catch(() => {});
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);
  
  return (
    <main className={`pt-16 min-h-screen bg-[#f8f9fb] transition-all duration-300 ${
      isCollapsed ? 'lg:pl-[5.5rem]' : 'lg:pl-56'
    }`}>
      <div className="p-6">
        {children}
      </div>
    </main>
  );
}

export default function MainLayout({ children }: MainLayoutProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  useEffect(() => {
    checkAuth();
    
    // Substituir alert() nativo por toasts bonitos
    if (typeof window !== 'undefined' && !(window as any).__alertReplaced) {
      (window as any).__originalAlert = window.alert;
      window.alert = (message: string) => {
        // Detectar tipo de mensagem pelo conteúdo
        let type: 'success' | 'error' | 'warning' | 'info' = 'info';
        const msg = message.toLowerCase();
        if (msg.includes('sucesso') || msg.includes('salvo') || msg.includes('criado') || msg.includes('atualizado')) {
          type = 'success';
        } else if (msg.includes('erro') || msg.includes('falhou') || msg.includes('inválido')) {
          type = 'error';
        } else if (msg.includes('atenção') || msg.includes('aviso')) {
          type = 'warning';
        }
        showToast(message, type);
      };
      (window as any).__alertReplaced = true;
    }
  }, []);

  async function checkAuth() {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        // Mostrar modal se precisar trocar senha (não mostrar se usuário pulou nesta sessão)
        if (data.user?.needsPasswordChange) {
          const skipped = sessionStorage.getItem('password-change-skipped');
          if (!skipped) {
            setShowPasswordModal(true);
          }
        }
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Erro ao verificar autenticação:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }

  function handlePasswordChanged() {
    setShowPasswordModal(false);
    sessionStorage.removeItem('password-change-skipped');
    // Recarregar dados do usuário
    checkAuth();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <LoadingSpinner size={40} />
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <ThemeProvider>
      <MenuProvider>
        <div className="min-h-screen bg-[#f8f9fb]">
          <Header user={user} />
          <Sidebar />
          <MainContent user={user}>{children}</MainContent>
          {showPasswordModal && (
            <PasswordChangeModal
              onClose={() => {
                setShowPasswordModal(false);
                sessionStorage.setItem('password-change-skipped', 'true');
              }}
              onPasswordChanged={handlePasswordChanged}
            />
          )}
        </div>
      </MenuProvider>
    </ThemeProvider>
  );
}
