'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Search, Clock, List, CheckCircle } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import PermissionGuard from '@/components/assistente-ia/PermissionGuard';
import QuestionCard from '@/components/assistente-ia/QuestionCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import { useNotification } from '@/hooks/useNotification';
import { useRouter } from 'next/navigation';

// Componente interno que usa o contexto
function PerguntasPendentesContent() {
  const router = useRouter();
  const { success, error } = useNotification();
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'resolved' | 'ignored'>('pending');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    resolved: 0,
    ignored: 0
  });

  useEffect(() => {
    fetchStats();
    fetchQuestions();
  }, [statusFilter]);

  const fetchStats = async () => {
    try {
      const [totalRes, pendingRes, resolvedRes, ignoredRes] = await Promise.all([
        fetch('/api/assistente-ia/questions?limit=1'),
        fetch('/api/assistente-ia/questions?status=pending&limit=1'),
        fetch('/api/assistente-ia/questions?status=resolved&limit=1'),
        fetch('/api/assistente-ia/questions?status=ignored&limit=1')
      ]);

      const totalData = totalRes.ok ? await totalRes.json() : { total: 0 };
      const pendingData = pendingRes.ok ? await pendingRes.json() : { total: 0 };
      const resolvedData = resolvedRes.ok ? await resolvedRes.json() : { total: 0 };
      const ignoredData = ignoredRes.ok ? await ignoredRes.json() : { total: 0 };

      setStats({
        total: totalData.total || 0,
        pending: pendingData.total || 0,
        resolved: resolvedData.total || 0,
        ignored: ignoredData.total || 0
      });
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        limit: '50'
      });

      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/assistente-ia/questions?${params}`);
      const data = await response.json();

      if (data.success) {
        setQuestions(data.data || []);
      }
    } catch (err) {
      console.error('Erro ao buscar perguntas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchQuestions();
  };

  const handleTrain = (questionId: string) => {
    // Redirecionar para página de treinar com a pergunta E o ID
    const question = questions.find(q => q.id === questionId);
    if (question) {
      router.push(
        `/assistente-ia/treinar/novo?question=${encodeURIComponent(question.user_question)}&unanswered_id=${questionId}`
      );
    }
  };

  const handleIgnore = async (questionId: string) => {
    try {
      const response = await fetch(`/api/assistente-ia/questions/${questionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ignore' })
      });

      const data = await response.json();

      if (data.success) {
        success('A pergunta foi marcada como ignorada', 'Pergunta ignorada');
        fetchQuestions();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      error(err.message, 'Erro');
    }
  };

  return (
    <PermissionGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Perguntas Pendentes</h1>
            <p className="text-gray-500">Perguntas que o assistente ainda não sabe responder</p>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                <List className="text-gray-600" size={24} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-500">Total</p>
          </div>

          {/* Pendentes */}
          <div 
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setStatusFilter('pending')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="text-yellow-600" size={24} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
            <p className="text-sm text-gray-500">Pendentes</p>
          </div>

          {/* Resolvidas */}
          <div 
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setStatusFilter('resolved')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="text-green-600" size={24} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
            <p className="text-sm text-gray-500">Resolvidas</p>
          </div>

          {/* Ignoradas */}
          <div 
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setStatusFilter('ignored')}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertCircle className="text-red-600" size={24} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.ignored}</p>
            <p className="text-sm text-gray-500">Ignoradas</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Busca */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar pergunta
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Digite palavras-chave..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <Button
                  onClick={handleSearch}
                  icon={<Search className="w-4 h-4" />}
                >
                  Buscar
                </Button>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="pending">Pendentes</option>
                <option value="resolved">Resolvidas</option>
                <option value="ignored">Ignoradas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <LoadingSpinner size={40} />
              <p className="mt-4 text-gray-600">Carregando perguntas...</p>
            </div>
          </div>
        )}

        {/* Lista de Perguntas */}
        {!loading && questions.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {questions.map((question) => (
              <QuestionCard
                key={question.id}
                question={question}
                onTrain={handleTrain}
                onIgnore={handleIgnore}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && questions.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {statusFilter === 'pending' ? '🎉 Nenhuma pergunta pendente!' : 'Nenhuma pergunta encontrada'}
            </h3>
            <p className="text-gray-600 mb-6">
              {statusFilter === 'pending' 
                ? 'Ótimo trabalho! O assistente está conseguindo responder todas as perguntas.'
                : 'Tente ajustar os filtros de busca.'
              }
            </p>
            {statusFilter === 'pending' && (
              <Button
                onClick={() => router.push('/assistente-ia/treinar')}
                variant="primary"
              >
                Treinar Novas Perguntas
              </Button>
            )}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

// Componente principal exportado
export default function PerguntasPendentesPage() {
  return (
    <MainLayout>
      <PerguntasPendentesContent />
    </MainLayout>
  );
}
