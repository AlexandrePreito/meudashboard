'use client';

import { useState } from 'react';
import { Send, Sparkles, AlertCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface TestAreaProps {
  onTest: (question: string) => Promise<any>;
  datasetId?: string;
}

export default function TestArea({ onTest, datasetId }: TestAreaProps) {
  const [question, setQuestion] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTest = async () => {
    if (!question.trim()) return;

    setTesting(true);
    setError(null);
    setResult(null);

    try {
      const data = await onTest(question);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Erro ao testar pergunta');
    } finally {
      setTesting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTest();
    }
  };

  return (
    <div className="space-y-4">
      {/* Área de Input */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          💬 Faça uma pergunta para testar
        </label>
        <div className="flex gap-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ex: Quanto faturamos em dezembro?"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            disabled={testing}
          />
          <Button
            onClick={handleTest}
            loading={testing}
            disabled={!question.trim() || testing}
            icon={<Send className="w-4 h-4" />}
          >
            Testar
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Dica: Pressione Enter para testar rapidamente
        </p>
      </div>

      {/* Loading */}
      {testing && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 text-center">
          <LoadingSpinner size={32} className="mx-auto mb-3" />
          <p className="text-blue-700 font-medium">Processando sua pergunta...</p>
          <p className="text-blue-600 text-sm mt-1">Isso pode levar alguns segundos</p>
        </div>
      )}

      {/* Erro */}
      {error && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-1">Erro ao Testar</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Resultado */}
      {result && !testing && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-3">
            <div className="flex items-center gap-2 text-white">
              <Sparkles className="w-5 h-5" />
              <h3 className="font-semibold">Resposta do Assistente</h3>
            </div>
          </div>

          {/* Resposta */}
          <div className="p-4 space-y-4">
            {/* Resposta Formatada */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-2">
                💬 Resposta (como o usuário verá)
              </label>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <pre className="whitespace-pre-wrap text-sm text-gray-900 font-sans">
                  {result.response || 'Sem resposta'}
                </pre>
              </div>
            </div>

            {/* Query DAX */}
            {result.dax_query && (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2">
                  💻 Consulta gerada (DAX)
                </label>
                <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                  <pre className="text-xs text-green-400 font-mono">
                    {result.dax_query}
                  </pre>
                </div>
              </div>
            )}

            {/* Tempo de Execução */}
            {result.execution_time_ms && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>⏱️ Tempo de resposta:</span>
                <span className="font-semibold text-gray-900">
                  {result.execution_time_ms}ms
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
