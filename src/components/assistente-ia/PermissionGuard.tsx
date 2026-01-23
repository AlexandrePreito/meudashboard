'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { ShieldAlert } from 'lucide-react';

interface PermissionGuardProps {
  children: React.ReactNode;
}

export default function PermissionGuard({ children }: PermissionGuardProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  const checkPermission = async () => {
    try {
      // Buscar dados do usuário
      const response = await fetch('/api/auth/me');
      const data = await response.json();

      if (!data.user || data.error) {
        router.push('/login');
        return;
      }

      // Bloquear viewer e operator
      const blockedRoles = ['viewer', 'operator'];
      if (blockedRoles.includes(data.user.role)) {
        setHasPermission(false);
        setIsChecking(false);
        return;
      }

      setHasPermission(true);
      setIsChecking(false);
    } catch (error) {
      console.error('Erro ao verificar permissão:', error);
      router.push('/login');
    }
  };

  useEffect(() => {
    setTimeout(() => {
      checkPermission();
    }, 0);
  }, []);

  if (isChecking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center justify-center text-center">
          <LoadingSpinner size={48} />
          <p className="mt-6 text-gray-600 text-base font-medium">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Acesso Restrito
          </h2>
          <p className="text-gray-600 mb-6">
            Você não tem permissão para acessar esta área. Entre em contato com o administrador se precisar de acesso.
          </p>
          <button
            onClick={() => router.push('/')}
            className="btn-primary"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
