'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, notFound } from 'next/navigation';
import {
  BarChart3,
  Brain,
  Bell,
  Shield,
  RefreshCw,
  Database,
  MessageSquare,
  ArrowRight,
  Zap,
  Maximize2,
  TrendingUp,
  Clock,
  Target,
  Eye,
  Users,
  AlertTriangle,
  FileCheck,
  Building2,
  Globe,
  Check,
  Tv,
  ChevronLeft,
  Mic,
  Send,
  Rocket,
  Star,
  Sparkles,
} from 'lucide-react';

const WHATSAPP_LINK = 'https://wa.me/556282289559?text=Olá! Gostaria de saber mais sobre o MeuDashboard.';

function StaticLogo({ size = 48 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <linearGradient id="logoGradientStaticFeature" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <g fill="url(#logoGradientStaticFeature)">
        <rect x="45" y="10" width="10" height="80" rx="5" />
        <rect x="45" y="10" width="10" height="80" rx="5" transform="rotate(60 50 50)" />
        <rect x="45" y="10" width="10" height="80" rx="5" transform="rotate(120 50 50)" />
      </g>
    </svg>
  );
}

function BrandName({ className = '', size = 'text-xl' }: { className?: string; size?: string }) {
  return (
    <span className={`brand-name ${size} ${className}`}>
      <span className="text-[1.2em]">M</span>eu<span className="text-[1.2em]">D</span>ashboard
    </span>
  );
}

function AnimatedWhatsAppChatMockup() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step < 8) {
      const delays = [300, 500, 600, 1000, 1200, 1500, 1800, 2200];
      const timer = setTimeout(() => setStep((s) => s + 1), delays[step] ?? 800);
      return () => clearTimeout(timer);
    }
  }, [step]);

  return (
    <div className="flex justify-center p-4">
      {/* Moldura do celular */}
      <div className="w-[280px] rounded-[2.5rem] border-[14px] border-slate-800 shadow-2xl overflow-hidden bg-slate-900">
        {/* Notch */}
        <div className="h-6 bg-slate-900 flex justify-center items-end pb-1">
          <div className="w-24 h-5 rounded-b-2xl bg-slate-800" />
        </div>
        {/* Status bar */}
        <div className="h-8 px-5 flex items-center justify-between bg-[#075E54] text-white/90 text-[11px]">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <span className="font-medium">IA</span>
            <div className="w-4 h-2.5 border border-white/90 rounded-sm flex items-center justify-center">
              <div className="w-1.5 h-1 bg-white/90 rounded-sm" />
            </div>
          </div>
        </div>
        {/* Header WhatsApp */}
        <div className="bg-[#075E54] px-3 py-2.5 flex items-center gap-2">
          <ChevronLeft className="w-5 h-5 text-white" />
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate">WhatsApp IA</p>
            <p className="text-white/80 text-xs">online</p>
          </div>
        </div>
        {/* Área do chat - fundo estilo WhatsApp */}
        <div className="bg-[#e5ddd5] min-h-[320px] p-3 space-y-2.5" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #e5ddd5 0%, #d5cdc5 100%)' }}>
          {step >= 1 && (
            <div className="flex justify-end animate-fadeIn">
              <div className="bg-[#d9fdd3] text-slate-900 px-3 py-2 rounded-xl rounded-tr-md shadow-sm text-[13px] max-w-[85%]">
                Qual foi o faturamento de dezembro?
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="flex items-center gap-1 px-2 py-2">
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
          {step >= 3 && (
            <div className="flex justify-start animate-fadeIn">
              <div className="bg-white text-slate-800 px-3 py-2.5 rounded-xl rounded-tl-md shadow-sm max-w-[90%]">
                <p className="text-[13px] mb-0.5 font-medium">📊 Faturamento Dez/2025</p>
                <p className="text-green-700 text-base font-bold">R$ 284.500,00</p>
                <p className="text-slate-500 text-[11px] mt-0.5">+12% vs mês anterior</p>
              </div>
            </div>
          )}
          {step >= 5 && (
            <div className="flex justify-end animate-fadeIn">
              <div className="bg-[#d9fdd3] text-slate-900 px-3 py-2 rounded-xl rounded-tr-md shadow-sm text-[13px] max-w-[85%]">
                Como aumentar minhas vendas?
              </div>
            </div>
          )}
          {step >= 7 && (
            <div className="flex justify-start animate-fadeIn">
              <div className="bg-white text-slate-800 px-3 py-2.5 rounded-xl rounded-tl-md shadow-sm max-w-[90%]">
                <p className="text-[13px] font-medium mb-1.5">🎯 Sugestões para aumentar vendas:</p>
                <p className="text-[12px] text-slate-600">1. Foque em eletrônicos (+45% margem)</p>
                <p className="text-[12px] text-slate-600">2. Região Sul tem potencial</p>
              </div>
            </div>
          )}
        </div>
        {/* Barra de input - estilo WhatsApp */}
        <div className="bg-slate-100 px-2 py-2 flex items-center gap-2 border-t border-slate-200">
          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
            <Mic className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex-1 h-9 bg-white rounded-full px-4 flex items-center text-slate-500 text-sm border border-slate-200">
            Mensagem
          </div>
          <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0">
            <Send className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MockupDashboard() {
  const items = [
    { icon: Zap, label: 'Embed', desc: 'Relatório no navegador', gradient: 'from-blue-500 to-indigo-500', iconClass: 'text-white' },
    { icon: Tv, label: 'Modo TV', desc: 'Play automático', gradient: 'from-purple-500 to-purple-600', iconClass: 'text-white' },
    { icon: Maximize2, label: 'Páginas', desc: 'Navegação configurável', gradient: 'from-cyan-500 to-blue-500', iconClass: 'text-white' },
    { icon: RefreshCw, label: 'Atualizar', desc: 'Atualizar relatório', gradient: 'from-emerald-500 to-green-600', iconClass: 'text-white' },
  ];
  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-amber-900" />
        </div>
        <span className="text-slate-800 font-semibold">Dashboards Power BI</span>
      </div>
      <p className="text-slate-600 text-sm mb-4">
        Seus relatórios integrados com <strong>embed</strong>, <strong>modo televisão</strong> e controle de páginas.
      </p>
      <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Recursos</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center mb-2`}>
                <Icon className={`w-5 h-5 ${item.iconClass}`} />
              </div>
              <p className="text-slate-800 font-medium text-sm">{item.label}</p>
              <p className="text-slate-500 text-xs mt-0.5">{item.desc}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WhatsAppAlertsMockup() {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (step < 4) {
      const timer = setTimeout(() => setStep((s) => s + 1), step === 0 ? 400 : 900);
      return () => clearTimeout(timer);
    }
  }, [step]);

  return (
    <div className="flex justify-center p-4">
      <div className="w-[280px] rounded-[2.5rem] border-[14px] border-slate-800 shadow-2xl overflow-hidden bg-slate-900">
        <div className="h-6 bg-slate-900 flex justify-center items-end pb-1">
          <div className="w-24 h-5 rounded-b-2xl bg-slate-800" />
        </div>
        <div className="h-8 px-5 flex items-center justify-between bg-[#075E54] text-white/90 text-[11px]">
          <span>9:41</span>
          <div className="flex items-center gap-1.5">
            <span className="font-medium">Alertas</span>
            <div className="w-4 h-2.5 border border-white/90 rounded-sm flex items-center justify-center">
              <div className="w-1.5 h-1 bg-white/90 rounded-sm" />
            </div>
          </div>
        </div>
        <div className="bg-[#075E54] px-3 py-2.5 flex items-center gap-2">
          <ChevronLeft className="w-5 h-5 text-white" />
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm truncate">Alertas MeuDashboard</p>
            <p className="text-white/80 text-xs">notificações</p>
          </div>
        </div>
        <div className="bg-[#e5ddd5] min-h-[320px] p-3 space-y-2.5" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #e5ddd5 0%, #d5cdc5 100%)' }}>
          {step >= 1 && (
            <div className="flex justify-start animate-fadeIn">
              <div className="bg-white text-slate-800 px-3 py-2.5 rounded-xl rounded-tl-md shadow-sm max-w-[92%]">
                <p className="text-[13px] font-medium mb-0.5 text-purple-700">🔔 Alerta enviado</p>
                <p className="text-[12px]">Faturamento &gt; R$ 100k</p>
                <p className="text-slate-500 text-[11px] mt-1">09:00 • Dentro do limite</p>
              </div>
            </div>
          )}
          {step >= 2 && (
            <div className="flex justify-start animate-fadeIn">
              <div className="bg-white text-slate-800 px-3 py-2.5 rounded-xl rounded-tl-md shadow-sm max-w-[92%] border-l-4 border-amber-500">
                <p className="text-[13px] font-medium mb-0.5 text-amber-700">⚠️ Alerta disparado</p>
                <p className="text-[12px]">Estoque crítico: 42 un.</p>
                <p className="text-slate-500 text-[11px] mt-1">08:15 • Abaixo do mínimo</p>
              </div>
            </div>
          )}
          {step >= 3 && (
            <div className="flex justify-start animate-fadeIn">
              <div className="bg-white text-slate-800 px-3 py-2.5 rounded-xl rounded-tl-md shadow-sm max-w-[92%]">
                <p className="text-[13px] font-medium mb-0.5 text-purple-700">🔔 Resumo diário</p>
                <p className="text-[12px]">2 alertas hoje • 1 OK, 1 atenção</p>
                <p className="text-slate-500 text-[11px] mt-1">Enviado às 18:00</p>
              </div>
            </div>
          )}
        </div>
        <div className="bg-slate-100 px-2 py-2 flex items-center gap-2 border-t border-slate-200">
          <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
            <Mic className="w-4 h-4 text-slate-600" />
          </div>
          <div className="flex-1 h-9 bg-white rounded-full px-4 flex items-center text-slate-500 text-sm border border-slate-200">
            Mensagem
          </div>
          <div className="w-9 h-9 rounded-full bg-[#25D366] flex items-center justify-center flex-shrink-0">
            <Send className="w-4 h-4 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MockupAccess() {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <span className="text-slate-800 font-semibold">Configurar Telas — Usuário</span>
      </div>
      <div className="space-y-3">
        {['Vendas por Região', 'Faturamento Mensal', 'Estoque'].map((name, i) => (
          <div key={i} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">
            <span className="text-slate-800 font-medium">{name}</span>
            <div className="flex items-center gap-4">
              <div className="w-10 h-6 bg-teal-500 rounded-full relative">
                <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 pt-4 border-t border-slate-200">
        <p className="text-slate-500 text-sm">RLS: Filial, Região • Role: RLS_Email</p>
      </div>
    </div>
  );
}

function MockupRefresh() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((p) => (p >= 100 ? 0 : p + 4));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-white" />
        </div>
        <span className="text-slate-800 font-semibold">Atualização monitorada</span>
      </div>
      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-700">Dataflow Vendas</span>
          <span className="text-emerald-600 font-medium">Concluído</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-700">Dataset Faturamento</span>
          <span className="text-cyan-600 font-medium">Em andamento...</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-700">Dataset Estoque</span>
          <span className="text-slate-500">Na fila</span>
        </div>
      </div>
    </div>
  );
}

function MockupMultitenant() {
  const groups = [
    { name: 'Empresa A', users: 12, color: 'from-blue-500 to-cyan-500', icon: Rocket },
    { name: 'Empresa B', users: 8, color: 'from-purple-500 to-pink-500', icon: Star },
    { name: 'Empresa C', users: 5, color: 'from-amber-500 to-orange-500', icon: Sparkles },
  ];
  return (
    <div className="bg-white rounded-3xl p-6 shadow-xl border border-slate-200">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
          <Database className="w-5 h-5 text-white" />
        </div>
        <span className="text-slate-800 font-semibold">Hierarquia multi-tenant</span>
      </div>
      <p className="text-slate-600 text-sm mb-4">
        Um <strong>developer</strong> gerencia vários <strong>grupos</strong> (empresas). Cada empresa tem seus <strong>usuários</strong>.
      </p>
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-indigo-50 border border-indigo-100 mb-4">
        <Users className="w-4 h-4 text-indigo-600" />
        <span className="text-indigo-800 text-sm font-medium">Developer</span>
        <span className="text-slate-500 text-sm">→ vários grupos</span>
      </div>
      <p className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-2">Grupos (empresas)</p>
      <div className="grid grid-cols-3 gap-3">
        {groups.map((g, i) => {
          const Icon = g.icon;
          return (
            <div key={i} className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${g.color} flex items-center justify-center text-white mb-2`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-slate-800 font-medium text-sm">{g.name}</p>
              <p className="text-slate-500 text-xs mt-0.5">{g.users} usuários</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FeatureCardLink({
  icon: Icon,
  title,
  description,
  gradient,
  href,
  isCurrentPage = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  gradient: string;
  href: string;
  isCurrentPage?: boolean;
}) {
  const cardContent = (
    <div
      className={`rounded-2xl p-6 shadow-sm border h-full transition-all duration-300 relative ${
        isCurrentPage
          ? 'bg-slate-100 border-slate-200 cursor-not-allowed opacity-80'
          : 'bg-white border-slate-100 group-hover:shadow-xl group-hover:border-cyan-200 group cursor-pointer'
      }`}
    >
      {isCurrentPage && (
        <span className="absolute top-3 right-3 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-400/90 text-white shadow-sm">
          Página atual
        </span>
      )}
      <div
        className={`w-12 h-12 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-4 ${!isCurrentPage ? 'group-hover:scale-110 transition-transform' : ''}`}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{description}</p>
      {!isCurrentPage && (
        <div className="mt-3 flex items-center gap-1.5 text-sm font-medium text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
          Saiba mais <ArrowRight className="w-4 h-4" />
        </div>
      )}
    </div>
  );

  if (isCurrentPage) {
    return <div className="block" aria-current="page">{cardContent}</div>;
  }
  return (
    <Link href={href} className="group block">
      {cardContent}
    </Link>
  );
}

type FeatureData = {
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  title: string;
  subtitle: string;
  benefits: { icon: React.ComponentType<{ className?: string }>; title: string; description: string }[];
  details: string[];
  steps: string[];
  mockupType: 'dashboard' | 'whatsapp' | 'alerts' | 'access' | 'refresh' | 'multitenant';
  slug: string;
};

const FEATURES: Record<string, FeatureData> = {
  'dashboards-power-bi': {
    slug: 'dashboards-power-bi',
    icon: BarChart3,
    gradient: 'from-yellow-400 to-amber-500',
    title: 'Dashboards Power BI',
    subtitle:
      'Integre e compartilhe seus relatórios Power BI com segurança, performance e controle total.',
    benefits: [
      {
        icon: Zap,
        title: 'Embed instantâneo',
        description:
          'Seus relatórios Power BI carregam direto no navegador dos seus usuários, sem precisar de licença Pro para cada um.',
      },
      {
        icon: Tv,
        title: 'Função Televisão',
        description:
          'Play automático das páginas do relatório. Ideal para painéis em telões e salas de reunião. Timer configurável por página.',
      },
      {
        icon: Maximize2,
        title: 'Tela cheia e apresentação',
        description:
          'Modo fullscreen e modo TV com rotação automática de páginas. Controle quais páginas entram na rotação.',
      },
    ],
    details: [
      'Token de embed gerado automaticamente com renovação',
      'Suporte a múltiplos workspaces e relatórios',
      'Controle de navegação de páginas (ocultar/mostrar)',
      'Modo televisão: play automático das páginas com timer configurável',
      'Compatível com relatórios paginados e dashboards',
      'Carregamento otimizado com SDK Power BI oficial',
    ],
    steps: [
      'Conecte seu Power BI (workspaces e relatórios).',
      'Configure as telas e permissões por usuário.',
      'Crie usuários no sistema: todos acessam sem licença Pro.',
      'Use o modo Televisão para rotação automática em telões.',
    ],
    mockupType: 'dashboard',
  },
  'ia-whatsapp': {
    slug: 'ia-whatsapp',
    icon: Brain,
    gradient: 'from-green-500 to-green-600',
    title: 'IA no WhatsApp',
    subtitle:
      'Consulte seus dados por mensagem. A IA analisa, interpreta e sugere ações em linguagem natural.',
    benefits: [
      {
        icon: MessageSquare,
        title: 'Perguntas em português',
        description:
          'Digite "Qual foi o faturamento de dezembro?" e receba a resposta com dados reais dos seus dashboards.',
      },
      {
        icon: TrendingUp,
        title: 'Insights automáticos',
        description:
          'A IA identifica padrões, tendências e anomalias nos seus dados e sugere ações concretas.',
      },
      {
        icon: Zap,
        title: 'Respostas instantâneas',
        description:
          'Sem precisar abrir o computador. Consulte KPIs importantes direto do celular, a qualquer hora.',
      },
    ],
    details: [
      'IA treinada para entender perguntas de negócio',
      'Acessa dados em tempo real dos seus dashboards',
      'Sugestões de ações baseadas em análise de dados',
      'Histórico de conversas por usuário',
      'Limite de consultas configurável por plano',
      'Funciona com qualquer WhatsApp Business',
    ],
    steps: [
      'Conecte sua instância WhatsApp Business à plataforma.',
      'A IA passa a ter acesso aos dados dos seus dashboards.',
      'Usuários enviam perguntas em português pelo WhatsApp.',
      'Respostas com dados, gráficos e sugestões em segundos.',
    ],
    mockupType: 'whatsapp',
  },
  'alertas-automaticos': {
    slug: 'alertas-automaticos',
    icon: Bell,
    gradient: 'from-purple-500 to-purple-600',
    title: 'Alertas automáticos',
    subtitle:
      'Receba notificações no WhatsApp quando métricas ultrapassarem limites. Nunca perca um dado importante.',
    benefits: [
      {
        icon: Bell,
        title: 'Alertas por WhatsApp',
        description:
          'Receba alertas diretamente no WhatsApp quando uma métrica passar do limite configurado.',
      },
      {
        icon: Clock,
        title: 'Agendamento flexível',
        description:
          'Configure alertas diários, semanais ou em tempo real. Relatórios automáticos no horário que preferir.',
      },
      {
        icon: Target,
        title: 'Limites personalizados',
        description:
          'Defina limites para cada métrica: faturamento abaixo de X, estoque crítico, meta não atingida.',
      },
    ],
    details: [
      'Alertas enviados via WhatsApp Business',
      'Configuração de limites superior e inferior',
      'Agendamento por horário, dia da semana ou intervalo',
      'Relatório diário com resumo de métricas',
      'Múltiplos destinatários por alerta',
      'Histórico de alertas disparados',
    ],
    steps: [
      'Escolha a métrica e defina o limite (ex.: faturamento < R$ 50k).',
      'Configure horário e frequência (diário, semanal, tempo real).',
      'Adicione os destinatários que receberão no WhatsApp.',
      'Receba o alerta quando a condição for atingida.',
    ],
    mockupType: 'alerts',
  },
  'controle-de-acesso': {
    slug: 'controle-de-acesso',
    icon: Shield,
    gradient: 'from-teal-500 to-cyan-600',
    title: 'Controle de acesso',
    subtitle:
      'Cada usuário vê apenas o que deve. Controle por tela, página e dados com Row-Level Security.',
    benefits: [
      {
        icon: Eye,
        title: 'Acesso por tela e página',
        description:
          'Defina quais relatórios e quais páginas cada usuário pode ver. Controle granular sem complicação.',
      },
      {
        icon: Shield,
        title: 'RLS (Row-Level Security)',
        description:
          'Filtre dados por filial, região, vendedor ou qualquer dimensão. Cada um vê apenas seus dados.',
      },
      {
        icon: Users,
        title: 'Gestão por grupos',
        description:
          'Organize usuários em grupos com permissões independentes. Ideal para múltiplos clientes ou departamentos.',
      },
    ],
    details: [
      'Controle de acesso por tela (qual relatório pode ver)',
      'Controle por página (quais páginas dentro do relatório)',
      'Row-Level Security com filtros dinâmicos',
      'Múltiplos tipos de filtro: filial, região, vendedor, etc.',
      'Ordem personalizada de telas por usuário',
      'Modo apresentação (TV) com páginas configuráveis',
      'Integração via código M (Power Query) para RLS',
      'Proteção automática contra configurações inválidas',
    ],
    steps: [
      'Crie grupos e usuários na plataforma.',
      'Em Configurar Telas, defina quais relatórios e páginas cada um vê.',
      'Para RLS: configure filtros (filial, região etc.) e use o código M no Power BI.',
      'Cada usuário acessa e vê apenas o que foi permitido.',
    ],
    mockupType: 'access',
  },
  'atualizacao-monitorada': {
    slug: 'atualizacao-monitorada',
    icon: RefreshCw,
    gradient: 'from-amber-500 to-amber-600',
    title: 'Atualização monitorada',
    subtitle:
      'Monitore datasets e dataflows em tempo real. Saiba imediatamente quando algo falhar.',
    benefits: [
      {
        icon: RefreshCw,
        title: 'Refresh automático',
        description:
          'Acompanhe o progresso da atualização de datasets e dataflows em tempo real, direto do painel.',
      },
      {
        icon: AlertTriangle,
        title: 'Alertas de falha',
        description:
          'Receba notificação imediata por WhatsApp quando uma atualização falhar ou atrasar.',
      },
      {
        icon: FileCheck,
        title: 'Relatório diário',
        description:
          'Receba um resumo diário com status de todas as atualizações: sucesso, falha e tempo de execução.',
      },
    ],
    details: [
      'Monitoramento de datasets e dataflows',
      'Ordem de atualização configurável (primeiro dataflows, depois datasets)',
      'Barra de progresso em tempo real',
      'Alertas de erro por WhatsApp',
      'Relatório diário automático',
      'Histórico de atualizações com tempo de execução',
      'Suporte a múltiplos workspaces',
      'Botão de refresh manual no dashboard',
    ],
    steps: [
      'Conecte seus workspaces e selecione datasets e dataflows.',
      'Defina a ordem de atualização (ex.: dataflows primeiro).',
      'Acompanhe o progresso em tempo real no painel.',
      'Receba alerta por WhatsApp se algo falhar ou atrasar.',
    ],
    mockupType: 'refresh',
  },
  'multi-tenant': {
    slug: 'multi-tenant',
    icon: Database,
    gradient: 'from-indigo-500 to-indigo-600',
    title: 'Multi-tenant',
    subtitle:
      'Um developer, vários grupos (empresas), cada empresa com seus usuários. Tudo isolado e seguro.',
    benefits: [
      {
        icon: Building2,
        title: 'Hierarquia clara',
        description:
          'Um developer gerencia vários grupos; cada grupo é uma empresa; cada empresa tem seus próprios usuários, telas e dados.',
      },
      {
        icon: Users,
        title: 'Gestão centralizada',
        description:
          'Como developer, gerencie todos os grupos de um único painel. Crie, edite e monitore cada empresa e seus usuários.',
      },
      {
        icon: Globe,
        title: 'Subdomínio personalizado',
        description:
          'Cada cliente pode ter seu próprio endereço (ex: cliente.meudashboard.org) com marca personalizada.',
      },
    ],
    details: [
      'Grupos de empresa completamente isolados',
      'Um developer gerencia múltiplos grupos',
      'Cada grupo com seus próprios usuários, telas e dados',
      'Subdomínio personalizado por developer',
      'White-label: logo e cores personalizados na tela de login',
      'Conexões Power BI por grupo ou compartilhadas',
      'Roles: Master, Developer, Admin, Viewer, User',
      'Escalável: adicione grupos conforme sua base de clientes cresce',
    ],
    steps: [
      'Um developer pode ter vários grupos; cada grupo é uma empresa.',
      'Dentro de cada empresa: usuários, telas e conexões Power BI próprios.',
      'Use subdomínio e white-label para a marca de cada cliente.',
      'Gerencie todos os grupos (e usuários de cada um) em um único painel.',
    ],
    mockupType: 'multitenant',
  },
};

const SLUGS = Object.keys(FEATURES);

function MockupByType({ type }: { type: FeatureData['mockupType'] }) {
  switch (type) {
    case 'dashboard':
      return <MockupDashboard />;
    case 'whatsapp':
      return <AnimatedWhatsAppChatMockup />;
    case 'alerts':
      return <WhatsAppAlertsMockup />;
    case 'access':
      return <MockupAccess />;
    case 'refresh':
      return <MockupRefresh />;
    case 'multitenant':
      return <MockupMultitenant />;
    default:
      return <MockupDashboard />;
  }
}

export default function FuncionalidadePage() {
  const params = useParams();
  const slug = typeof params?.slug === 'string' ? params.slug : '';
  const feature = slug ? FEATURES[slug] : null;

  if (!feature) notFound();

  const Icon = feature.icon;
  const allFeatures = SLUGS.map((s) => ({ slug: s, ...FEATURES[s] }));

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Exo 2', system-ui, sans-serif; }
        .brand-name { font-family: 'Orbitron', 'Exo 2', sans-serif; font-weight: 700; letter-spacing: 0.02em; color: #2563eb; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
      `}</style>

      <nav className="bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <StaticLogo size={32} />
            <BrandName size="text-xl" />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="border border-slate-300 text-slate-800 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50"
            >
              Entrar
            </Link>
            <Link
              href="/cadastro"
              className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700"
            >
              Comece grátis
            </Link>
          </div>
        </div>
      </nav>

      <section className="pt-16 pb-20 px-6" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className={`w-20 h-20 mx-auto mb-6 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
            <Icon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">{feature.title}</h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">{feature.subtitle}</p>
        </div>
      </section>

      {slug === 'dashboards-power-bi' && (
        <section className="px-6 pb-8 -mt-2">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-4 rounded-2xl border-2 border-blue-300 bg-blue-50 px-6 py-4 shadow-sm">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500 flex items-center justify-center">
                <Check className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-blue-900">Requisito simples</p>
                <p className="text-blue-800 text-sm mt-0.5">
                  Para conectar o Power BI à nossa ferramenta, basta ter uma conta com permissão de publicação (ex.: Pro). <strong>Quem visualiza os relatórios não precisa de licença Embed nem Pro</strong> — o acesso é pelo MeuDashboard.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="py-16 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">Benefícios</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {feature.benefits.map((b, i) => {
              const BIcon = b.icon;
              return (
                <div key={i} className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                  <div className={`w-12 h-12 bg-gradient-to-br ${feature.gradient} rounded-xl flex items-center justify-center mb-4`}>
                    <BIcon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{b.title}</h3>
                  <p className="text-slate-600 text-sm leading-relaxed">{b.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-slate-100">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-10">Como funciona</h2>
          <div className="rounded-3xl overflow-hidden shadow-xl border border-slate-200 mb-10">
            <MockupByType type={feature.mockupType} />
          </div>
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-8 md:p-10">
            <ol className="space-y-6">
              {feature.steps.map((step, i) => (
                <li key={i} className="flex gap-4">
                  <span
                    className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white font-bold text-lg`}
                  >
                    {i + 1}
                  </span>
                  <p className="text-slate-700 pt-1.5">{step}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-10">Detalhes</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {feature.details.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-4 rounded-xl border border-slate-200 bg-slate-50/50 px-5 py-4 hover:border-slate-300 hover:bg-slate-50 transition-colors"
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br ${feature.gradient} flex items-center justify-center`}
                >
                  <Check className="w-4 h-4 text-white" />
                </div>
                <span className="text-slate-700 text-sm leading-relaxed pt-0.5">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-slate-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Pronto para usar {feature.title}?</h2>
          <p className="text-xl text-slate-300 mb-8">Crie sua conta grátis e comece em minutos.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/cadastro"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg"
            >
              Comece grátis
            </Link>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-5 h-5" />
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-slate-900 text-center mb-10">Outras funcionalidades</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {allFeatures.map((f) => {
              const FIcon = f.icon;
              return (
                <FeatureCardLink
                  key={f.slug}
                  icon={FIcon}
                  title={f.title}
                  description={f.subtitle}
                  gradient={f.gradient}
                  href={`/funcionalidades/${f.slug}`}
                  isCurrentPage={f.slug === slug}
                />
              );
            })}
          </div>
        </div>
      </section>

      <footer className="relative overflow-hidden border-t border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100/80">
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10 md:gap-12">
            <div className="flex flex-col items-center md:items-start text-center md:text-left max-w-md">
              <Link href="/" className="flex items-center gap-3 group mb-4">
                <StaticLogo size={32} />
                <BrandName size="text-xl" />
              </Link>
              <p className="text-slate-600 text-sm leading-relaxed">
                Dashboards Power BI com IA integrada. Consulte dados por WhatsApp, receba alertas e controle o acesso.
              </p>
            </div>
            <div className="flex flex-col items-center md:items-end">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400 mb-3">Legal</p>
              <nav className="flex flex-col sm:flex-row gap-3 sm:gap-6">
                <Link href="/termos-de-uso" className="text-slate-600 hover:text-blue-600 transition-colors text-sm font-medium">
                  Termos de Uso
                </Link>
                <Link href="/politica-de-privacidade" className="text-slate-600 hover:text-blue-600 transition-colors text-sm font-medium">
                  Política de Privacidade
                </Link>
                <Link href="/politica-de-cookies" className="text-slate-600 hover:text-blue-600 transition-colors text-sm font-medium">
                  Política de Cookies
                </Link>
              </nav>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">© 2026 MeuDashboard. Todos os direitos reservados.</p>
            <p className="text-sm text-slate-600">
              Desenvolvido por{' '}
              <a href="https://vion.com.br" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-800 hover:text-blue-600 transition-colors">
                vion.com.br
              </a>
            </p>
          </div>
        </div>
      </footer>

      <a
        href={WHATSAPP_LINK}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group"
        title="Fale conosco!"
      >
        <MessageSquare className="w-6 h-6" />
        <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Fale conosco!
        </span>
      </a>
    </div>
  );
}
