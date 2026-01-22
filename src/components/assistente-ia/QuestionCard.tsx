'use client';

import { MessageSquare, User, Calendar, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import Button from '@/components/ui/Button';

interface QuestionCardProps {
  question: {
    id: string;
    user_question: string;
    phone_number: string;
    priority_score: number;
    user_count: number;
    attempt_count: number;
    last_asked_at: string;
    error_message?: string;
    status?: string;  // ← NOVO
    training_example_id?: string;  // ← NOVO
  };
  onTrain: (questionId: string) => void;
  onIgnore: (questionId: string) => void;
}

export default function QuestionCard({ question, onTrain, onIgnore }: QuestionCardProps) {
  const getPriorityColor = (score: number) => {
    if (score >= 30) return 'bg-red-100 text-red-700 border-red-200';
    if (score >= 10) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-green-100 text-green-700 border-green-200';
  };

  const getPriorityLabel = (score: number) => {
    if (score >= 30) return '🔴 Alta';
    if (score >= 10) return '🟡 Média';
    return '🟢 Baixa';
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}min atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-blue-300 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            {question.status === 'resolved' ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                <CheckCircle className="w-3 h-3" />
                Resolvida
              </span>
            ) : (
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${getPriorityColor(question.priority_score)}`}>
                {getPriorityLabel(question.priority_score)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pergunta */}
      <div className="mb-4">
        <p className="text-gray-900 font-medium leading-relaxed">
          "{question.user_question}"
        </p>
      </div>

      {/* Erro (se houver) */}
      {question.error_message && (
        <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
          <p className="text-xs text-red-700 font-mono">
            ⚠️ {question.error_message}
          </p>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
            <User className="w-3 h-3" />
            <span className="text-xs">Usuários</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{question.user_count}</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
            <TrendingUp className="w-3 h-3" />
            <span className="text-xs">Tentativas</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{question.attempt_count}</p>
        </div>
        <div className="text-center p-2 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-center gap-1 text-gray-600 mb-1">
            <Calendar className="w-3 h-3" />
            <span className="text-xs">Última vez</span>
          </div>
          <p className="text-xs font-semibold text-gray-900">
            {formatDate(question.last_asked_at)}
          </p>
        </div>
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        <Button
          onClick={() => onTrain(question.id)}
          variant="primary"
          size="sm"
          icon={<CheckCircle className="w-4 h-4" />}
          className="flex-1"
        >
          Ensinar Resposta
        </Button>
        <Button
          onClick={() => onIgnore(question.id)}
          variant="ghost"
          size="sm"
          icon={<XCircle className="w-4 h-4" />}
        >
          Ignorar
        </Button>
      </div>
    </div>
  );
}
