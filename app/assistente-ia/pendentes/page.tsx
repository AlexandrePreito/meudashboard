'use client';

import { useState, useEffect } from 'react';
import {
  Search,
  Clock,
  List,
  CheckCircle,
  XCircle,
  MessageSquare,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import FeatureGate from '@/components/ui/FeatureGate';
import PermissionGuard from '@/components/assistente-ia/PermissionGuard';
import QuestionCard from '@/components/assistente-ia/QuestionCard';
import Pagination from '@/components/ui/Pagination';
import { useNotification } from '@/hooks/useNotification';
import { useRouter } from 'next/navigation';
import { useMenu } from '@/contexts/MenuContext';

const PAGE_SIZE = 20;

function PerguntasPendentesContent() {
  const router = useRouter();
  const { success, error } = useNotification();
  const { activeGroup, selectedGroupIds } = useMenu();

  // Fallback: para master users, activeGroup pode ser null mesmo com grupo selecionado
  const effectiveGroupId = activeGroup?.id || (selectedGroupIds?.length === 1 ? selectedGroupIds[0] : null);

  const [questions, setQuestions] = useState<any[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'trained' | 'ignored'>('pending');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    resolved: 0,
    ignored: 0,
  });

  useEffect(() => {
    setPage(1);
  }, [statusFilter, search]);

  useEffect(() => {
    if (effectiveGroupId) {
      fetchStats();
      fetchQuestions();
    } else {
      setQuestions([]);
      setTotalItems(0);
      setStats({ total: 0, pending: 0, resolved: 0, ignored: 0 });
      setLoading(false);
    }
  }, [statusFilter, effectiveGroupId, page, search]);

  const fetchStats = async () => {
    if (!effectiveGroupId) return;
    try {
      const res = await fetch(`/api/assistente-ia/pending?counts=true&group_id=${effectiveGroupId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.counts) {
          setStats({
            total: data.counts.total || 0,
            pending: data.counts.pending || 0,
            resolved: data.counts.trained || 0,
            ignored: data.counts.ignored || 0,
          });
        }
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
    }
  };

  const fetchQuestions = async () => {
    if (!effectiveGroupId) {
      setQuestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        limit: String(PAGE_SIZE),
        offset: String((page - 1) * PAGE_SIZE),
      });
      params.append('group_id', effectiveGroupId);
      if (search.trim()) params.append('search', search.trim());

      const url = `/api/assistente-ia/pending?${params.toString()}`;
      console.log('[PENDENTES] Buscando:', url);
      console.log('[PENDENTES] effectiveGroupId:', effectiveGroupId);

      const response = await fetch(url);
      const data = await response.json();

      console.log('[PENDENTES] Resposta:', {
        success: data.success,
        count: data.data?.length || 0,
        total: data.total,
        error: data.error,
        status: response.status,
      });

      if (data.success) {
        setQuestions(data.data || []);
        setTotalItems(data.total ?? 0);
      } else {
        setQuestions([]);
        setTotalItems(0);
      }
    } catch (err) {
      console.error('Erro ao buscar perguntas:', err);
      setQuestions([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };

  const handleTrain = (questionId: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (question) {
      setQuestions((prev) => prev.filter((q) => q.id !== questionId));
      setStats((prev) => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1),
      }));
      router.push(
        `/assistente-ia/treinar/novo?question=${encodeURIComponent(question.user_question)}&unanswered_id=${questionId}`
      );
    }
  };

  const handleIgnore = async (questionId: string) => {
    try {
      const response = await fetch(`/api/assistente-ia/pending`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: questionId, status: 'ignored' }),
      });
      const data = await response.json();
      if (data.success) {
        success('A pergunta foi marcada como ignorada', 'Pergunta ignorada');
        fetchQuestions();
        fetchStats();
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      error(err.message || 'Erro ao ignorar', 'Erro');
    }
  };

  return (
    <PermissionGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Perguntas Pendentes</h1>
            <p className="text-gray-500 text-sm mt-1">Perguntas que o assistente ainda não sabe responder</p>
          </div>
          <button
            onClick={() => router.push('/assistente-ia/treinar')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-colors"
            style={{ backgroundColor: 'var(--color-primary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary)'; }}
          >
            <TrendingUp size={18} />
            Treinar IA
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div
            className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${!statusFilter || statusFilter === 'pending' ? 'border-blue-200 shadow-sm' : 'border-gray-200'}`}
            onClick={() => setStatusFilter('pending')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                <List className="text-gray-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
            </div>
          </div>

          <div
            className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'pending' ? 'border-yellow-300 shadow-sm' : 'border-gray-200'}`}
            onClick={() => setStatusFilter('pending')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <Clock className="text-yellow-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                <p className="text-xs text-gray-500">Pendentes</p>
              </div>
            </div>
          </div>

          <div
            className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'trained' ? 'border-green-300 shadow-sm' : 'border-gray-200'}`}
            onClick={() => setStatusFilter('trained')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
                <p className="text-xs text-gray-500">Treinadas</p>
              </div>
            </div>
          </div>

          <div
            className={`bg-white rounded-xl border p-4 cursor-pointer transition-all hover:shadow-md ${statusFilter === 'ignored' ? 'border-red-300 shadow-sm' : 'border-gray-200'}`}
            onClick={() => setStatusFilter('ignored')}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="text-red-600" size={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.ignored}</p>
                <p className="text-xs text-gray-500">Ignoradas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Busca e Filtros */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchQuestions()}
              placeholder="Buscar por palavras-chave..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'pending' | 'trained' | 'ignored')}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 min-w-[180px]"
          >
            <option value="pending">Pendentes</option>
            <option value="trained">Treinadas</option>
            <option value="ignored">Ignoradas</option>
          </select>
        </div>

        {/* Lista de Perguntas */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : questions.length > 0 ? (
          <>
          <div className="space-y-3">
            {questions.map((question: any) => {
              const adaptedQuestion = {
                id: question.id,
                user_question: question.user_question,
                phone_number: question.user_phone || '',
                priority_score: 5,
                user_count: 1,
                attempt_count: 1,
                last_asked_at: question.created_at,
                error_message: question.failure_reason || question.ai_response?.substring(0, 100),
                status: question.status || 'pending',
                training_example_id: question.training_example_id,
              };

              return (
                <div key={question.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                  <QuestionCard
                    question={adaptedQuestion}
                    onTrain={handleTrain}
                    onIgnore={handleIgnore}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <Pagination
              totalItems={totalItems}
              currentPage={page}
              onPageChange={setPage}
              pageSize={PAGE_SIZE}
            />
          </div>
          </>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {statusFilter === 'pending' ? 'Nenhuma pergunta pendente' : `Nenhuma pergunta ${statusFilter === 'trained' ? 'treinada' : 'ignorada'}`}
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              {statusFilter === 'pending'
                ? 'Ótimo trabalho! O assistente está respondendo todas as perguntas.'
                : 'Nenhuma pergunta encontrada com este filtro.'
              }
            </p>
            {statusFilter === 'pending' && (
              <button
                onClick={() => router.push('/assistente-ia/treinar')}
                className="px-4 py-2 rounded-lg text-white transition-colors"
                style={{ backgroundColor: 'var(--color-primary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--color-primary)'; }}
              >
                Treinar Novas Perguntas
              </button>
            )}
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

export default function PerguntasPendentesPage() {
  return (
    <MainLayout>
      <FeatureGate feature="ai">
        <PerguntasPendentesContent />
      </FeatureGate>
    </MainLayout>
  );
}
