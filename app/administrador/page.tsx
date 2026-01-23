'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Loader2 } from 'lucide-react';

export default function AdministradorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function detectAndRedirect() {
    try {
      setLoading(true);

      // Buscar usuário atual
      const userRes = await fetch('/api/auth/me');
      if (!userRes.ok) {
        router.push('/login');
        return;
      }

      const { user } = await userRes.json();

      // Se for master, redirecionar para /admin
      if (user.is_master) {
        router.push('/admin');
        return;
      }

      // Se for developer, redirecionar para /dev
      if (user.is_developer) {
        router.push('/dev');
        return;
      }

      // Buscar grupos onde é admin via API
      const groupsRes = await fetch('/api/admin-group');
      if (!groupsRes.ok) {
        const errorData = await groupsRes.json();
        if (groupsRes.status === 403) {
          setError('Você não é administrador de nenhum grupo.');
        } else {
          setError(errorData.error || 'Erro ao carregar informações. Tente novamente.');
        }
        setLoading(false);
        return;
      }

      const groupsData = await groupsRes.json();
      const groups = groupsData.groups || [];

      if (groups.length === 0) {
        setError('Você não é administrador de nenhum grupo.');
        setLoading(false);
        return;
      }

      // Se tem apenas 1 grupo, redirecionar diretamente
      if (groups.length === 1) {
        router.push(`/administrador/${groups[0].id}`);
        return;
      }

      // Se tem múltiplos grupos, redirecionar para o primeiro (por enquanto)
      // TODO: Criar tela de seleção de grupos
      router.push(`/administrador/${groups[0].id}`);

    } catch (err: any) {
      console.error('Erro ao detectar grupos:', err);
      setError('Erro ao carregar informações. Tente novamente.');
      setLoading(false);
    }
  }

  useEffect(() => {
    detectAndRedirect();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-blue-600 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <p className="text-gray-600 font-medium">Carregando seu grupo...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 text-center mb-2">
            Acesso Restrito
          </h2>
          <p className="text-gray-600 text-center mb-6">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Ir para Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
}
