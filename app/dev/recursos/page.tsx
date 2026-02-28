'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { Share2, Link as LinkIcon, Smartphone, Brain } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';

interface SharedResourceResponse {
  connection: (Record<string, unknown> & { usage?: { total: number; usingShared: number }; _source?: string; _label?: string }) | null;
  whatsappInstance: (Record<string, unknown> & { usage?: { total: number; usingShared: number }; _source?: string; _label?: string }) | null;
  training: { contextsCount: number; examplesCount: number; queryLearningCount: number; groupsTotal: number };
  groupsTotal: number;
  usage: {
    connection: { total: number; usingShared: number };
    whatsapp: { total: number; usingShared: number };
  };
}

export default function DevRecursosPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SharedResourceResponse | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await fetch('/api/dev/shared-resources', { credentials: 'include' });
      if (res.status === 403) {
        router.push('/dashboard');
        return;
      }
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao carregar recursos');
      }
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center min-h-[40vh]">
          <LoadingSpinner size={32} />
        </div>
      </MainLayout>
    );
  }

  const conn = data?.connection;
  const wa = data?.whatsappInstance;
  const training = data?.training ?? { contextsCount: 0, examplesCount: 0, queryLearningCount: 0, groupsTotal: 0 };
  const total = data?.groupsTotal ?? 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Share2 className="w-6 h-6 text-sky-600" />
            Recursos Compartilhados
          </h1>
          <p className="text-gray-500 mt-1">
            Recursos configurados aqui são herdados automaticamente por todos os seus grupos.
            Grupos podem ter recursos próprios que substituem o compartilhado.
          </p>
        </div>

        <div className="space-y-6">
          {/* Conexão Power BI */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-gray-800 font-semibold mb-3">
              <LinkIcon className="w-5 h-5 text-blue-600" />
              Conexão Power BI
              {conn?._source === 'developer' && (
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-normal">
                  Compartilhado
                </span>
              )}
            </div>
            {conn ? (
              <>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium text-green-600">Configurada</span> · {String(conn.name)}
                </p>
                <p className="text-xs text-gray-500">
                  Client ID: {String(conn.client_id).slice(0, 8)}****-{String(conn.client_id).slice(-4)}
                </p>
                {conn.workspace_id && (
                  <p className="text-xs text-gray-500">Workspace: {String(conn.workspace_id)}</p>
                )}
                <p className="text-xs text-gray-500 mt-2">
                  Usada por: {conn.usage?.usingShared ?? 0} de {conn.usage?.total ?? total} grupos
                  {(conn.usage?.total ?? 0) - (conn.usage?.usingShared ?? 0) > 0 && (
                    <span> ({(conn.usage?.total ?? 0) - (conn.usage?.usingShared ?? 0)} grupos têm conexão própria)</span>
                  )}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/powerbi/conexoes')}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={async () => {
                      if (!confirm('Remover conexão compartilhada? Os grupos passarão a não ter conexão até configurar uma.')) return;
                      const r = await fetch(`/api/dev/shared-resources?type=connection&id=${conn.id}`, { method: 'DELETE', credentials: 'include' });
                      if (r.ok) load();
                      else alert((await r.json()).error || 'Erro ao remover');
                    }}
                  >
                    Remover
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-3">Nenhuma conexão compartilhada configurada.</p>
                <Button
                  size="sm"
                  onClick={() => router.push('/powerbi/conexoes?shared=1')}
                >
                  Configurar conexão
                </Button>
              </>
            )}
          </section>

          {/* Instância WhatsApp */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-gray-800 font-semibold mb-3">
              <Smartphone className="w-5 h-5 text-green-600" />
              Instância WhatsApp
              {wa?._source === 'developer' && (
                <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-normal">
                  Compartilhado
                </span>
              )}
            </div>
            {wa ? (
              <>
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium text-green-600">Conectada</span> · {String(wa.instance_name)}
                </p>
                <p className="text-xs text-gray-500">
                  Usada por: {wa.usage?.usingShared ?? 0} de {wa.usage?.total ?? total} grupos
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push('/whatsapp/instancias')}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={async () => {
                      if (!confirm('Remover instância compartilhada?')) return;
                      const r = await fetch(`/api/dev/shared-resources?type=whatsapp&id=${wa.id}`, { method: 'DELETE', credentials: 'include' });
                      if (r.ok) load();
                      else alert((await r.json()).error || 'Erro ao remover');
                    }}
                  >
                    Remover
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-500 mb-3">Nenhuma instância compartilhada configurada.</p>
                <Button
                  size="sm"
                  onClick={() => router.push('/whatsapp/instancias')}
                >
                  Configurar instância
                </Button>
              </>
            )}
          </section>

          {/* Treinamento IA */}
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 text-gray-800 font-semibold mb-3">
              <Brain className="w-5 h-5 text-violet-600" />
              Treinamento IA
            </div>
            <p className="text-sm text-gray-600 mb-1">
              {training.contextsCount} contextos, {training.examplesCount} exemplos, {training.queryLearningCount} queries aprendidas
            </p>
            <p className="text-xs text-gray-500">
              Compartilhado com: todos os {training.groupsTotal} grupos (exemplos de grupo são somados, não substituídos)
            </p>
            <div className="mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/assistente-ia/treinar')}
              >
                Gerenciar Treinamento
              </Button>
            </div>
          </section>
        </div>
      </div>
    </MainLayout>
  );
}
