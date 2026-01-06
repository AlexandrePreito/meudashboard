'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MenuProvider, useMenu } from '@/contexts/MenuContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import Sidebar from './Sidebar';
import Header from './Header';
import { Loader2 } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name?: string;
  is_master?: boolean;
}

interface MainLayoutProps {
  children: React.ReactNode;
}

function MainContent({ children }: MainLayoutProps) {
  const { isCollapsed } = useMenu();
  
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
          <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
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
          <MainContent>{children}</MainContent>
        </div>
      </MenuProvider>
    </ThemeProvider>
  );
}
