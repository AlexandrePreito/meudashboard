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
    return 'Baixa';
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
    <div className="flex items-start gap-4">
      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <MessageSquare className="w-5 h-5 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <p className="text-gray-900 font-medium leading-relaxed">
                "{question.user_question}"
              </p>
              {question.error_message && (
                <div className="inline-block max-w-xs px-2 py-0.5 bg-red-50 rounded border border-red-200">
                  <p className="text-[10px] text-red-700 font-mono leading-tight truncate">
                    ⚠️ {question.error_message}
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
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
              <span className="flex items-center gap-4 text-xs text-gray-500 whitespace-nowrap">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {question.user_count} usuários
                </span>
                <span className="flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {question.attempt_count} tentativas
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatDate(question.last_asked_at)}
                </span>
              </span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button
              onClick={() => onTrain(question.id)}
              variant="primary"
              size="sm"
              icon={<CheckCircle className="w-4 h-4" />}
            >
              Ensinar
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
      </div>
    </div>
  );
}
