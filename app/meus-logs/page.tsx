'use client';

import { useEffect, useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { ScrollText, Clock } from 'lucide-react';

interface LogEntry {
  id: string;
  action_type: string;
  description: string;
  metadata?: Record<string, unknown>;
  ip_address?: string | null;
  created_at: string;
}

function getActionLabel(actionType: string): string {
  const labels: Record<string, string> = {
    login: '🔐 Login realizado',
    logout: '🚪 Logout',
    view: '📊 Dashboard visualizado',
    view_screen: '📊 Dashboard visualizado',
    query: '📋 Relatório acessado',
    change_password: '🔑 Senha alterada',
    update: '👤 Perfil atualizado',
    create: '➕ Registro criado',
    delete: '🗑️ Registro excluído',
    alert: '🔔 Alerta',
    message: '💬 Mensagem',
  };
  return labels[actionType] || actionType;
}

export default function MeusLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  async function loadLogs() {
    try {
      const res = await fetch('/api/auth/my-logs', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <LoadingSpinner size={32} />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
            <ScrollText className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Meus Logs</h1>
            <p className="text-sm text-gray-500">Histórico das suas atividades</p>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <ScrollText className="w-12 h-12 mx-auto text-gray-200 mb-3" />
            <h3 className="text-lg font-semibold text-gray-900 mb-1">Nenhum log encontrado</h3>
            <p className="text-gray-500 text-sm">Suas atividades aparecerão aqui.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <ul className="divide-y divide-gray-50">
              {logs.map((log) => (
                <li key={log.id} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{getActionLabel(log.action_type)}</p>
                      {log.description && (
                        <p className="text-sm text-gray-500 mt-0.5">{log.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-400">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDate(log.created_at)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
