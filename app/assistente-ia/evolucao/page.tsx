'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, BookOpen, AlertCircle, CheckCircle, XCircle, MessageSquare, Clock, BarChart3 } from 'lucide-react';
import MainLayout from '@/components/layout/MainLayout';
import PermissionGuard from '@/components/assistente-ia/PermissionGuard';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Componente interno que usa o contexto
function EvolucaoContent() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'day' | 'month'>('day');

  useEffect(() => {
    fetchStats();
  }, [selectedMonth, selectedYear, viewMode]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const url = viewMode === 'month' 
        ? `/api/assistente-ia/stats?year=${selectedYear}&view=month`
        : `/api/assistente-ia/stats?month=${selectedMonth}&year=${selectedYear}&view=day`;
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatRate = (rate: number) => {
    return `${rate.toFixed(1)}%`;
  };

  // Gerar dados para o gráfico diário (1-31)
  const generateDailyData = () => {
    if (!stats?.daily) return [];
    
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const dailyMap = new Map();
    
    // Mapear dados existentes
    stats.daily.forEach((day: any) => {
      const date = new Date(day.stat_date);
      const dayNum = date.getDate();
      dailyMap.set(dayNum, day);
    });

    // Gerar array completo (1-31)
    const result = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = dailyMap.get(day) || {
        stat_date: new Date(selectedYear, selectedMonth - 1, day).toISOString(),
        questions_asked: 0,
        questions_answered: 0,
        questions_failed: 0
      };
      result.push({
        day,
        label: day.toString(),
        ...dayData
      });
    }
    
    return result;
  };

  // Gerar dados para o gráfico mensal (jan, fev, mar...)
  const generateMonthlyData = () => {
    if (!stats?.monthly) return [];
    
    const monthlyMap = new Map();
    
    // Mapear dados existentes
    stats.monthly.forEach((month: any) => {
      const date = new Date(month.stat_date);
      const monthNum = date.getMonth() + 1;
      monthlyMap.set(monthNum, month);
    });

    // Gerar array completo (1-12)
    const result = [];
    const monthLabels = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    for (let month = 1; month <= 12; month++) {
      const monthData = monthlyMap.get(month) || {
        stat_date: new Date(selectedYear, month - 1, 1).toISOString(),
        questions_asked: 0,
        questions_answered: 0,
        questions_failed: 0
      };
      result.push({
        month,
        day: month, // Para compatibilidade com o gráfico
        label: monthLabels[month - 1],
        ...monthData
      });
    }
    
    return result;
  };

  const chartData = viewMode === 'month' ? generateMonthlyData() : generateDailyData();
  const maxQuestions = Math.max(...chartData.map((d: any) => d.questions_asked), 1);

  // Calcular médias
  const avgQuestions = chartData.length > 0 
    ? (chartData.reduce((sum: number, d: any) => sum + d.questions_asked, 0) / chartData.length).toFixed(1)
    : 0;
  const avgAnswered = chartData.length > 0
    ? (chartData.reduce((sum: number, d: any) => sum + d.questions_answered, 0) / chartData.length).toFixed(1)
    : 0;
  const avgSuccessRate = chartData.length > 0
    ? chartData.reduce((sum: number, d: any) => {
        const rate = d.questions_asked > 0 ? (d.questions_answered / d.questions_asked) * 100 : 0;
        return sum + rate;
      }, 0) / chartData.length
    : 0;

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

  return (
    <PermissionGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Evolução do Assistente</h1>
            <p className="text-gray-500">Acompanhe o desempenho e aprendizado do assistente</p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <LoadingSpinner size={40} />
              <p className="mt-4 text-gray-600">Carregando estatísticas...</p>
            </div>
          </div>
        )}

        {/* Stats */}
        {!loading && stats && (
          <>
            {/* Cards Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Exemplos Treinados */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <BookOpen className="text-blue-600" size={24} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.summary?.total_examples || 0}</p>
                <p className="text-sm text-gray-500">Exemplos Treinados</p>
              </div>

              {/* Perguntas Pendentes */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                    <Clock className="text-yellow-600" size={24} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.summary?.total_pending || 0}</p>
                <p className="text-sm text-gray-500">Perguntas Pendentes</p>
              </div>

              {/* Taxa de Sucesso (7 dias) */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle className="text-green-600" size={24} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatRate(stats.summary?.success_rate_7d || 0)}</p>
                <p className="text-sm text-gray-500">Taxa de Sucesso (7d)</p>
              </div>

              {/* Taxa de Sucesso (30 dias) */}
              <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="text-purple-600" size={24} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-gray-900">{formatRate(stats.summary?.success_rate_30d || 0)}</p>
                <p className="text-sm text-gray-500">Taxa de Sucesso (30d)</p>
              </div>
            </div>

            {/* Gráfico de Evolução */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Evolução {viewMode === 'month' ? 'Mensal' : 'Diária'}</h2>
                  <p className="text-sm text-gray-500">
                    {viewMode === 'month' ? 'Perguntas e respostas por mês' : 'Perguntas e respostas por dia'}
                  </p>
                </div>
                <div className="flex gap-3">
                  <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                    <button
                      onClick={() => setViewMode('day')}
                      className={`px-4 py-2 transition-colors ${
                        viewMode === 'day'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Dia
                    </button>
                    <button
                      onClick={() => setViewMode('month')}
                      className={`px-4 py-2 border-l border-gray-300 transition-colors ${
                        viewMode === 'month'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Mês
                    </button>
                  </div>
                  {viewMode === 'day' && (
                    <>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                        {months.map((month, index) => (
                          <option key={index + 1} value={index + 1}>{month}</option>
                        ))}
                      </select>
                    </>
                  )}
                  <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  >
                    {years.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Gráfico de Barras */}
              <div className="mt-6">
                <div className="flex items-end justify-between gap-1 h-64 border-b border-gray-200 pb-4">
                  {chartData.map((item: any, index: number) => {
                    const heightAsked = maxQuestions > 0 ? (item.questions_asked / maxQuestions) * 100 : 0;
                    const heightAnswered = maxQuestions > 0 ? (item.questions_answered / maxQuestions) * 100 : 0;
                    const rate = item.questions_asked > 0 ? (item.questions_answered / item.questions_asked) * 100 : 0;

                    return (
                      <div key={index} className="flex-1 flex flex-col items-center group relative">
                        <div className="w-full flex items-end justify-center gap-0.5 h-full">
                          {/* Barra de perguntas feitas */}
                          <div
                            className="w-full bg-blue-200 rounded-t hover:bg-blue-300 transition-colors relative"
                            style={{ height: `${heightAsked}%` }}
                            title={viewMode === 'day' 
                              ? `${item.day}/${selectedMonth}: ${item.questions_asked} perguntas`
                              : `${item.label}: ${item.questions_asked} perguntas`
                            }
                          >
                            {/* Barra de perguntas respondidas (sobreposta) */}
                            <div
                              className="w-full bg-green-500 rounded-t absolute bottom-0"
                              style={{ height: `${heightAnswered}%` }}
                              title={`${item.questions_answered} respondidas (${formatRate(rate)})`}
                            />
                          </div>
                        </div>
                        {/* Label */}
                        <span className="text-xs text-gray-500 mt-2">{item.label || item.day}</span>
                        {/* Tooltip no hover */}
                        <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap z-10">
                          <div className="font-semibold mb-1">
                            {viewMode === 'day' ? `Dia ${item.day}` : item.label}
                          </div>
                          <div>Perguntas: {item.questions_asked}</div>
                          <div>Respondidas: {item.questions_answered}</div>
                          <div>Taxa: {formatRate(rate)}</div>
                          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Legenda */}
                <div className="flex items-center justify-center gap-6 mt-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-blue-200 rounded"></div>
                    <span className="text-sm text-gray-600">Perguntas Feitas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 rounded"></div>
                    <span className="text-sm text-gray-600">Perguntas Respondidas</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Cards de Métricas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Média Diária */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <BarChart3 className="text-blue-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Média Diária</p>
                    <p className="text-xl font-bold text-gray-900">{avgQuestions}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {viewMode === 'day' 
                    ? `Perguntas por dia em ${months[selectedMonth - 1]}`
                    : `Perguntas por mês em ${selectedYear}`
                  }
                </p>
              </div>

              {/* Média de Respostas */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <CheckCircle className="text-green-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Média de Respostas</p>
                    <p className="text-xl font-bold text-gray-900">{avgAnswered}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {viewMode === 'day' 
                    ? `Respostas por dia em ${months[selectedMonth - 1]}`
                    : `Respostas por mês em ${selectedYear}`
                  }
                </p>
              </div>

              {/* Taxa Média de Sucesso */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Taxa Média</p>
                    <p className="text-xl font-bold text-gray-900">{formatRate(avgSuccessRate)}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  {viewMode === 'day' 
                    ? `Taxa de sucesso em ${months[selectedMonth - 1]}`
                    : `Taxa de sucesso em ${selectedYear}`
                  }
                </p>
              </div>
            </div>

            {/* Insights */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Insight Positivo */}
              {stats.summary?.success_rate_7d >= 80 && (
                <div className="bg-green-50 rounded-xl border border-green-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-green-900 mb-1">Ótimo desempenho! 🎉</h4>
                      <p className="text-sm text-green-700">
                        O assistente está respondendo mais de 80% das perguntas corretamente. Continue treinando novos exemplos para manter a qualidade.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Insight de Melhoria */}
              {stats.summary?.success_rate_7d < 80 && stats.summary?.total_pending > 5 && (
                <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-yellow-900 mb-1">Atenção necessária! ⚠️</h4>
                      <p className="text-sm text-yellow-700">
                        Há {stats.summary.total_pending} perguntas pendentes. Treine essas respostas para melhorar a taxa de sucesso.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Insight de Crescimento */}
              {stats.summary?.total_examples > 0 && stats.summary?.total_examples < 20 && (
                <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-1">Continue treinando! 💪</h4>
                      <p className="text-sm text-blue-700">
                        Você tem {stats.summary.total_examples} exemplos treinados. Quanto mais exemplos, melhor o assistente responde!
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && !stats && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhuma estatística disponível
            </h3>
            <p className="text-gray-600">
              Comece a usar o assistente para gerar estatísticas
            </p>
          </div>
        )}
      </div>
    </PermissionGuard>
  );
}

// Componente principal exportado
export default function EvolucaoPage() {
  return (
    <MainLayout>
      <EvolucaoContent />
    </MainLayout>
  );
}
