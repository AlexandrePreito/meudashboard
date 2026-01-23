'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import { useMenu } from '@/contexts/MenuContext';
import { 
  Copy,
  Check,
  Webhook,
  X,
  FileText,
  Search,
  AlertCircle,
  Loader2
} from 'lucide-react';

function WebhookContent() {
  const router = useRouter();
  const { activeGroup } = useMenu();
  const [userRole, setUserRole] = useState<string>('loading');
  
  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  async function checkAccess() {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      
      if (!data.user) {
        router.push('/login');
        return;
      }
      
      if (data.user.is_master) {
        setUserRole('master');
      } else if (data.user.role === 'admin') {
        setUserRole('admin'); // Só leitura
      } else {
        // User sem acesso - redirecionar
        router.push('/');
        return;
      }
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      router.push('/login');
    }
  }

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('Erro ao copiar');
    }
  }

  useEffect(() => {
    setTimeout(() => {
      checkAccess();
    }, 0);
  }, []);

  useEffect(() => {
    const baseUrl = window.location.origin;
    setTimeout(() => {
      setWebhookUrl(`${baseUrl}/api/whatsapp/webhook`);
    }, 0);
  }, []);

  // Loading state
  if (userRole === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-12 h-12 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Webhook</h1>
              <p className="text-gray-500 text-sm mt-1">Configure a Evolution API para enviar mensagens ao sistema</p>
            </div>
            <Button onClick={() => setShowInstructions(true)} icon={<FileText size={18} />}>
              Ver Instruções
            </Button>
          </div>

          {/* Aviso para Admin (Só Leitura) */}
          {userRole === 'admin' && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-yellow-800 text-sm font-medium">Modo somente leitura</p>
                <p className="text-yellow-700 text-sm mt-1">
                  Apenas o administrador do sistema pode alterar configurações de webhook.
                  Você pode visualizar e copiar a URL.
                </p>
              </div>
            </div>
          )}

          {/* Barra de Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              disabled={userRole === 'admin'}
            />
          </div>
        </div>

        {/* Card URL do Webhook */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
              <Webhook className="text-green-600" size={24} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">URL do Webhook</h2>
              <p className="text-sm text-gray-500">Use esta URL na configuração da Evolution API</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <code className="text-sm text-gray-800 break-all">{webhookUrl}</code>
            </div>
            <button
              onClick={copyToClipboard}
              className={`p-3 rounded-lg transition-colors ${
                copied 
                  ? 'text-green-600 hover:bg-green-50' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
              title={copied ? 'Copiado!' : 'Copiar URL'}
            >
              {copied ? <Check size={20} /> : <Copy size={20} />}
            </button>
          </div>
        </div>

        {/* Modal de Instruções */}
        {showInstructions && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 sticky top-0 bg-white">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  📋 Passos para Configurar
                </h2>
                <button 
                  onClick={() => setShowInstructions(false)} 
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Passo 1 */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Acesse o painel da Evolution API</h3>
                    <p className="text-gray-600 mt-1">
                      Abra o gerenciador da sua instância Evolution API (geralmente em <code className="bg-gray-100 px-1 rounded">:8080/manager</code>)
                    </p>
                  </div>
                </div>

                {/* Passo 2 */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Selecione sua instância</h3>
                    <p className="text-gray-600 mt-1">
                      Clique na instância que você configurou no sistema
                    </p>
                  </div>
                </div>

                {/* Passo 3 */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Vá em Webhooks</h3>
                    <p className="text-gray-600 mt-1">
                      No menu lateral, clique em "Webhooks" ou "Settings" → "Webhooks"
                    </p>
                  </div>
                </div>

                {/* Passo 4 */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Configure a URL</h3>
                    <p className="text-gray-600 mt-1">
                      Cole a URL do webhook copiada no campo "Webhook URL"
                    </p>
                    <div className="mt-2 bg-gray-50 border rounded-lg p-3">
                      <code className="text-sm text-gray-800 break-all">{webhookUrl}</code>
                    </div>
                  </div>
                </div>

                {/* Passo 5 */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    5
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Selecione os eventos</h3>
                    <p className="text-gray-600 mt-1 mb-3">
                      Marque pelo menos o evento <code className="bg-green-100 text-green-700 px-2 py-0.5 rounded">messages.upsert</code>
                    </p>
                    <div className="bg-gray-50 border rounded-lg p-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Eventos recomendados:</p>
                      <div className="flex flex-wrap gap-2">
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                          ✓ messages.upsert
                        </span>
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                          connection.update (opcional)
                        </span>
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                          messages.update (opcional)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Passo 6 */}
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                    ✓
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">Salve as configurações</h3>
                    <p className="text-gray-600 mt-1">
                      Clique em "Save" e pronto! As mensagens serão enviadas ao sistema automaticamente.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end p-4 border-t border-gray-200 sticky bottom-0 bg-white">
                <Button onClick={() => setShowInstructions(false)}>
                  Entendi
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function WebhookPage() {
  return (
    <MainLayout>
      <WebhookContent />
    </MainLayout>
  );
}
