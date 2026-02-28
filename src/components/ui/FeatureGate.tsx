'use client';

import { useFeatures } from '@/hooks/useFeatures';
import {
  Sparkles,
  MessageSquare,
  Bell,
  Brain,
  ArrowRight,
  Send,
  Users,
  Zap,
  Activity,
  Code,
  MessageCircle,
  TrendingUp,
  Shield,
} from 'lucide-react';

interface FeatureGateProps {
  feature: 'whatsapp' | 'alerts' | 'ai';
  children: React.ReactNode;
}

const UPGRADE_LINK =
  'https://wa.me/5562982289559?text=Olá!%20Tenho%20interesse%20em%20fazer%20upgrade%20do%20meu%20plano%20no%20MeuDashboard.';

const featureConfig = {
  whatsapp: {
    icon: MessageSquare,
    iconGradient: 'from-emerald-400 to-green-500',
    title: 'Desbloqueie o WhatsApp Integrado',
    subtitle:
      'Envie alertas e relatórios automaticamente pelo WhatsApp para toda a sua equipe.',
    cards: [
      {
        icon: Send,
        iconBg: 'bg-emerald-100 text-emerald-600',
        title: 'Envio Automático',
        description: 'Relatórios enviados no horário que você definir',
      },
      {
        icon: Users,
        iconBg: 'bg-emerald-100 text-emerald-600',
        title: 'Grupos e Listas',
        description: 'Organize destinatários por equipe ou departamento',
      },
      {
        icon: Zap,
        iconBg: 'bg-emerald-100 text-emerald-600',
        title: 'Tempo Real',
        description: 'Alertas instantâneos quando KPIs mudarem',
      },
    ],
  },
  alerts: {
    icon: Bell,
    iconGradient: 'from-blue-400 to-indigo-500',
    title: 'Desbloqueie os Alertas Inteligentes',
    subtitle:
      'Configure alertas automáticos com DAX e receba notificações quando seus KPIs mudarem.',
    cards: [
      {
        icon: Activity,
        iconBg: 'bg-blue-100 text-blue-600',
        title: 'Monitoramento 24/7',
        description: 'Seus dados verificados automaticamente',
      },
      {
        icon: Code,
        iconBg: 'bg-blue-100 text-blue-600',
        title: 'Consultas DAX',
        description: 'Regras personalizadas com DAX puro',
      },
      {
        icon: Bell,
        iconBg: 'bg-blue-100 text-blue-600',
        title: 'Multi-canal',
        description: 'Notificações por email e WhatsApp',
      },
    ],
  },
  ai: {
    icon: Brain,
    iconGradient: 'from-violet-400 to-purple-500',
    title: 'Desbloqueie o Assistente com IA',
    subtitle:
      'Seu assistente inteligente que responde perguntas sobre seus dados em linguagem natural.',
    cards: [
      {
        icon: MessageCircle,
        iconBg: 'bg-violet-100 text-violet-600',
        title: 'Chat Natural',
        description: 'Pergunte em português sobre seus dados',
      },
      {
        icon: TrendingUp,
        iconBg: 'bg-violet-100 text-violet-600',
        title: 'Insights',
        description: 'Descubra tendências e anomalias automaticamente',
      },
      {
        icon: Shield,
        iconBg: 'bg-violet-100 text-violet-600',
        title: 'Contexto Seguro',
        description: 'IA treinada apenas com seus dados',
      },
    ],
  },
};

export default function FeatureGate({ feature, children }: FeatureGateProps) {
  const { loading, hasWhatsapp, hasAlerts, hasAI } = useFeatures();

  const featureEnabled = {
    whatsapp: hasWhatsapp,
    alerts: hasAlerts,
    ai: hasAI,
  }[feature];

  if (loading) {
    return <>{children}</>;
  }

  if (featureEnabled) {
    return <>{children}</>;
  }

  const config = featureConfig[feature];
  const Icon = config.icon;

  const animStyles = `
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse-soft {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.05); opacity: 0.9; }
    }
    .featuregate-fade-in-up { animation: fadeInUp 0.6s ease-out forwards; }
    .featuregate-fade-in-up-1 { animation: fadeInUp 0.6s ease-out 0.1s forwards; opacity: 0; }
    .featuregate-fade-in-up-2 { animation: fadeInUp 0.6s ease-out 0.2s forwards; opacity: 0; }
    .featuregate-fade-in-up-3 { animation: fadeInUp 0.6s ease-out 0.3s forwards; opacity: 0; }
    .featuregate-pulse-soft { animation: pulse-soft 3s ease-in-out infinite; }
  `;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-white to-slate-50 flex items-center justify-center p-6">
      <style dangerouslySetInnerHTML={{ __html: animStyles }} />
      <div className="max-w-2xl w-full flex flex-col items-center text-center">
        {/* Badge */}
        <span className="featuregate-fade-in-up inline-flex items-center gap-1.5 bg-slate-100 text-slate-600 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
          <Sparkles className="w-3.5 h-3.5" />
          Plano Free
        </span>

        {/* Ícone grande animado */}
        <div
          className={`featuregate-fade-in-up-1 featuregate-pulse-soft w-20 h-20 rounded-2xl bg-gradient-to-br ${config.iconGradient} flex items-center justify-center mb-8 shadow-lg`}
        >
          <Icon className="w-10 h-10 text-white" />
        </div>

        {/* Título */}
        <h1 className="featuregate-fade-in-up-2 text-3xl font-bold text-slate-900 tracking-tight mb-3">
          {config.title}
        </h1>

        {/* Subtítulo */}
        <p className="featuregate-fade-in-up-2 text-base text-slate-500 max-w-md mx-auto leading-relaxed mb-10">
          {config.subtitle}
        </p>

        {/* Cards de benefícios */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-10">
          {config.cards.map((card, i) => {
            const CardIcon = card.icon;
            return (
              <div
                key={i}
                className="featuregate-fade-in-up-3 bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 text-left"
              >
                <div
                  className={`w-9 h-9 rounded-lg ${card.iconBg} flex items-center justify-center mb-3`}
                >
                  <CardIcon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-slate-800 mb-1">
                  {card.title}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <a
          href={UPGRADE_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-8 py-3.5 rounded-xl font-semibold text-base shadow-lg hover:shadow-xl transition-all"
        >
          Falar com especialista
          <ArrowRight className="w-4 h-4" />
        </a>

        {/* Texto auxiliar */}
        <p className="text-xs text-slate-400 mt-5">
          Upgrade disponível para todos os planos · Sem compromisso
        </p>
      </div>
    </div>
  );
}
