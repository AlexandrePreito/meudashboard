'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { 
  Copy,
  Check,
  Webhook,
  Shield,
  MessageSquare,
  X,
  FileText
} from 'lucide-react';

export default function WebhookPage() {
  const [copied, setCopied] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  
  useEffect(() => {
    const baseUrl = window.location.origin;
    setWebhookUrl(`${baseUrl}/api/whatsapp/webhook`);
  }, []);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      alert('Erro ao copiar');
    }
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Webhook</h1>
            <p className="text-gray-500 text-sm mt-1">Configure a Evolution API para enviar mensagens ao sistema</p>
          </div>
          <button
            onClick={() => setShowInstructions(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <FileText size={18} />
            Ver Instruções
          </button>
        </div>

        {/* Card URL do Webhook */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
              <Webhook className="text-orange-600" size={24} />
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
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                copied 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>

        {/* Como Funciona */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="text-orange-600" size={20} />
            Como Funciona
          </h3>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-3 font-bold">
                1
              </div>
              <h4 className="font-medium text-gray-900 mb-1">Mensagem Recebida</h4>
              <p className="text-sm text-gray-600">
                Usuário envia mensagem para o WhatsApp conectado
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mb-3 font-bold">
                2
              </div>
              <h4 className="font-medium text-gray-900 mb-1">Verificação</h4>
              <p className="text-sm text-gray-600">
                Sistema verifica se o número/grupo está autorizado
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3 font-bold">
                3
              </div>
              <h4 className="font-medium text-gray-900 mb-1">Resposta IA</h4>
              <p className="text-sm text-gray-600">
                Se autorizado, a IA processa e responde automaticamente
              </p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-white rounded-lg border border-orange-100">
            <div className="flex items-start gap-3">
              <Shield className="text-orange-600 flex-shrink-0" size={20} />
              <div>
                <p className="font-medium text-gray-900">Segurança</p>
                <p className="text-sm text-gray-600">
                  Apenas números e grupos cadastrados em "Números Autorizados" e "Grupos Autorizados" 
                  poderão interagir com o sistema. Mensagens de contatos não autorizados são ignoradas.
                </p>
              </div>
            </div>
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
                  <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
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
                  <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
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
                  <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
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
                  <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
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
                  <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center font-bold flex-shrink-0">
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
                <button
                  onClick={() => setShowInstructions(false)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                >
                  Entendi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

