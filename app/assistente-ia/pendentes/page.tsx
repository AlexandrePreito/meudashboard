'use client';

import { useState, useEffect } from 'react';
import { AlertCircle, Search, Clock, List, CheckCircle, XCircle, User, Calendar, TrendingUp, MessageSquare } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import PermissionGuard from '@/components/assistente-ia/PermissionGuard';
import QuestionCard from '@/components/assistente-ia/QuestionCard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Button from '@/components/ui/Button';
import { useNotification } from '@/hooks/useNotification';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useMenu } from '@/contexts/MenuContext';

// Componente interno que usa o contexto
function PerguntasPendentesContent() {
  const router = useRouter();
  const { success, error } = useNotification();
  const { activeGroup } = useMenu();
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
    if (activeGroup?.id) {
      fetchStats();
      fetchQuestions();
    } else {
      setQuestions([]);
      setStats({ total: 0, pending: 0, resolved: 0, ignored: 0 });
      setLoading(false);
    }
  }, [statusFilter, activeGroup?.id]);

  const fetchStats = async () => {
    if (!activeGroup?.id) return;
    
    try {
      const res = await fetch(`/api/assistente-ia/questions?counts=true&group_id=${activeGroup.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.counts) {
          setStats(data.counts);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar estatísticas:', err);
    }
  };

  const fetchQuestions = async () => {
    if (!activeGroup?.id) {
      setQuestions([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        status: statusFilter,
        limit: '50',
        group_id: activeGroup.id
      });

      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/assistente-ia/questions?${params}`);
      const data = await response.json();

      if (data.success) {
        setQuestions(data.data || []);
      } else {
        setQuestions([]);
      }
    } catch (err) {
      console.error('Erro ao buscar perguntas:', err);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchQuestions();
  };

  const handleTrain = (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      // Remove da lista imediatamente
      setQuestions(prev => prev.filter(q => q.id !== questionId));
      // Atualiza stats
      setStats(prev => ({
        ...prev,
        pending: Math.max(0, prev.pending - 1)
      }));
      // Redireciona
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
        fetchStats();
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Perguntas Pendentes</h1>
          <p className="text-gray-500 text-sm mt-1">Perguntas que o assistente ainda não sabe responder</p>
        </div>

        {/* Cards de Estatísticas - Estilo WhatsApp */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
                <List className="text-gray-600" size={24} />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-500">Perguntas no total</p>
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
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-700">
                Aguardando
              </span>
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
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                <CheckCircle size={12} />
                {stats.resolved}
              </span>
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
                <XCircle className="text-red-600" size={24} />
              </div>
              <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 text-red-700">
                <XCircle size={12} />
                {stats.ignored}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.ignored}</p>
            <p className="text-sm text-gray-500">Ignoradas</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Digite palavras-chave..."
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-[42px]"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-[42px] w-[180px]"
          >
            <option value="pending">Pendentes</option>
            <option value="resolved">Resolvidas</option>
            <option value="ignored">Ignoradas</option>
          </select>
          <button
            onClick={handleSearch}
            className="px-3 py-2 rounded-lg transition-colors flex items-center justify-center h-[42px] w-[42px] text-white"
            style={{ 
              backgroundColor: 'var(--color-primary)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary)';
            }}
            title="Buscar"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Lista de Perguntas */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <List size={18} className="text-gray-400" />
              Perguntas {statusFilter === 'pending' ? 'Pendentes' : statusFilter === 'resolved' ? 'Resolvidas' : 'Ignoradas'}
            </h2>
            {questions.length > 0 && (
              <span className="text-sm text-gray-500">{questions.length} {questions.length === 1 ? 'pergunta' : 'perguntas'}</span>
            )}
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Carregando perguntas...</p>
              </div>
            </div>
          ) : questions.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {questions.map((question) => (
                <div key={question.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <QuestionCard
                    question={question}
                    onTrain={handleTrain}
                    onIgnore={handleIgnore}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center">
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
