'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MenuProvider, useMenu } from '@/contexts/MenuContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Sidebar from './Sidebar';
import Header from './Header';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { showToast } from '@/lib/toast';

interface User {
  id: string;
  email: string;
  full_name?: string;
  is_master?: boolean;
  is_developer?: boolean;
  role?: string;
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
  
  return (
    <main className={`pt-16 min-h-screen transition-all duration-300 ${
      isCollapsed ? 'lg:pl-16' : 'lg:pl-64'
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
        <div className="min-h-screen bg-gray-50">
          <Header user={user} />
          <Sidebar />
          <MainContent user={user}>{children}</MainContent>
        </div>
      </MenuProvider>
    </ThemeProvider>
  );
}
