'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { BarChart3, MessageSquare, Bell, Shield, ArrowRight, Brain, RefreshCw, ChevronDown, Users, Building2, TrendingUp, Database, FileCheck, Zap, Sparkles, Crown, FolderOpen, LayoutDashboard, Globe, Check } from 'lucide-react';
import { useSubdomain } from '@/hooks/useSubdomain';
import PropostaModal from '@/components/landing/PropostaModal';

// Componente do Asterisco Animado
function AnimatedLogo({ size = 48, scrollY = 0, isInitialSpin = false }: { size?: number; scrollY?: number; isInitialSpin?: boolean }) {
  const rotation = isInitialSpin ? 0 : scrollY * 0.8;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ transform: `rotate(${rotation}deg)`, transition: isInitialSpin ? 'none' : 'transform 0.05s linear', animation: isInitialSpin ? 'initialSpin 2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards' : 'none' }}>
      <defs>
        <linearGradient id={`logoGrad${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <g fill={`url(#logoGrad${size})`}>
        <rect x="45" y="10" width="10" height="80" rx="5" />
        <rect x="45" y="10" width="10" height="80" rx="5" transform="rotate(60 50 50)" />
        <rect x="45" y="10" width="10" height="80" rx="5" transform="rotate(120 50 50)" />
      </g>
    </svg>
  );
}

function StaticLogo({ size = 48 }: { size?: number }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      <defs>
        <linearGradient id="logoGradientStatic" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <g fill="url(#logoGradientStatic)">
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

// Contador animado
function AnimatedCounter({ end, suffix = '', duration = 2000 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const start = 0;
          const startTime = Date.now();
          const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(start + (end - start) * easeOut));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration, hasAnimated]);

  return <span ref={ref}>{count}{suffix}</span>;
}

function FeatureCard({ icon: Icon, title, description, gradient = 'from-cyan-500 to-blue-600' }: { icon: any; title: string; description: string; gradient?: string }) {
  return (
    <div className="group bg-white rounded-2xl p-8 shadow-sm border border-slate-100 hover:shadow-xl hover:border-cyan-200 transition-all duration-300">
      <div className={`w-14 h-14 bg-gradient-to-br ${gradient} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </div>
  );
}

function ParaQuemCard({ icon: Icon, title, description, tag }: { icon: any; title: string; description: string; tag: string }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:border-cyan-200 transition-all duration-300">
      <span className="inline-block px-3 py-1.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-700 mb-4">{tag}</span>
      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 text-sm">{description}</p>
    </div>
  );
}

function AnimatedBarChart({ isVisible }: { isVisible: boolean }) {
  const [heights, setHeights] = useState([40, 55, 45, 70, 50, 85, 65]);
  useEffect(() => {
    if (!isVisible) return;
    const interval = setInterval(() => {
      setHeights(prev => prev.map(h => {
        const change = (Math.random() - 0.5) * 20;
        return Math.max(25, Math.min(95, h + change));
      }));
    }, 1500);
    return () => clearInterval(interval);
  }, [isVisible]);
  return (
    <div className="flex items-end justify-between h-32 gap-2">
      {heights.map((height, i) => (
        <div key={i} className="flex-1 bg-gradient-to-t from-cyan-500 to-cyan-400/60 rounded-t transition-all duration-1000 ease-out" style={{ height: isVisible ? `${height}%` : '10%' }} />
      ))}
    </div>
  );
}

function AnimatedWhatsAppChat({ isVisible }: { isVisible: boolean }) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!isVisible) return;
    if (step < 8) {
      const delays = [300, 500, 600, 1000, 1200, 1500, 1800, 2200];
      const timer = setTimeout(() => setStep(s => s + 1), delays[step] || 800);
      return () => clearTimeout(timer);
    }
  }, [isVisible, step]);

  return (
    <div className="bg-slate-800/50 backdrop-blur rounded-xl p-4 border border-slate-700/50 min-h-[400px]">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
        <span className="text-sm text-green-400 font-medium">WhatsApp IA</span>
      </div>
      <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2">
        {step >= 1 && (
          <div className="flex justify-end animate-fadeIn">
            <div className="bg-green-600/30 text-white/90 px-4 py-2 rounded-2xl rounded-tr-sm text-sm max-w-[85%]">Qual foi o faturamento de dezembro?</div>
          </div>
        )}
        {step === 2 && (
          <div className="flex items-center gap-1 px-2 py-2">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
        {step >= 3 && (
          <div className="flex justify-start animate-fadeIn">
            <div className="bg-slate-700/50 text-white/90 px-4 py-3 rounded-2xl rounded-tl-sm text-sm max-w-[90%]">
              <p className="mb-1">📊 <strong>Faturamento Dez/2025</strong></p>
              <p className="text-cyan-300 text-lg font-bold">💰 R$ 284.500,00</p>
              <p className="text-slate-400 text-xs mt-1">📈 +12% vs mês anterior</p>
            </div>
          </div>
        )}
        {step >= 5 && (
          <div className="flex justify-end animate-fadeIn">
            <div className="bg-green-600/30 text-white/90 px-4 py-2 rounded-2xl rounded-tr-sm text-sm max-w-[85%]">Como aumentar minhas vendas?</div>
          </div>
        )}
        {step === 6 && (
          <div className="flex items-center gap-1 px-2 py-2">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
        {step >= 7 && (
          <div className="flex justify-start animate-fadeIn">
            <div className="bg-slate-700/50 text-white/90 px-4 py-3 rounded-2xl rounded-tl-sm text-sm max-w-[90%]">
              <p className="mb-2">🎯 <strong>Sugestões para aumentar vendas:</strong></p>
              <p className="text-slate-300 text-sm mb-1">1. Foque em eletrônicos (+45% margem)</p>
              <p className="text-slate-300 text-sm mb-1">2. Região Sul tem potencial inexplorado</p>
              <p className="text-slate-300 text-sm">3. Reative 23 clientes inativos há 60 dias</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StepCard({ number, title, description, isLast = false }: { number: number; title: string; description: string; isLast?: boolean }) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">{number}</div>
        {!isLast && <div className="w-0.5 h-full bg-gradient-to-b from-cyan-500 to-purple-500 mt-2 min-h-[60px]" />}
      </div>
      <div className="pb-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
        <p className="text-slate-600 text-sm">{description}</p>
      </div>
    </div>
  );
}

const FAQ_ITEMS: { q: string; a: string; link?: { href: string; label: string } }[] = [
  {
    q: 'O que é o MeuDashboard?',
    a: 'O MeuDashboard é uma plataforma completa que hospeda seus dashboards Power BI e adiciona superpoderes: consulta de dados por WhatsApp com IA, alertas automáticos por métricas, controle de acesso por usuário e grupo, monitoramento de atualizações e suporte multi-tenant. Ideal para empresas que precisam compartilhar relatórios com equipes e clientes de forma segura e inteligente.',
  },
  {
    q: 'Preciso de cartão de crédito para começar?',
    a: 'Não. Você pode criar sua conta grátis e começar a usar imediatamente, sem informar cartão de crédito. A configuração leva poucos minutos: conecte seu Power BI, defina usuários e telas, e pronto. Você pode fazer upgrade para um plano pago quando precisar de mais recursos.',
  },
  {
    q: 'Como funciona a integração com WhatsApp?',
    a: 'Conectamos sua instância WhatsApp Business à nossa IA. Seus usuários enviam perguntas em linguagem natural (ex: "Qual foi o faturamento de dezembro?") e recebem respostas instantâneas com dados, gráficos e insights. A IA analisa seus dashboards, interpreta padrões e sugere ações. Também enviamos alertas automáticos quando métricas ultrapassam limites configurados.',
  },
  {
    q: 'Posso usar com meus clientes?',
    a: 'Sim! O MeuDashboard é ideal para software houses, consultorias de BI e gestores que precisam entregar dashboards para clientes. Oferecemos controle de acesso por grupo (multi-tenant), white-label, permissões granulares por usuário e tela, além de suporte a múltiplos grupos de empresa isolados. Cada cliente vê apenas seus próprios dados.',
  },
  {
    q: 'O que é o subdomínio personalizado?',
    a: 'O subdomínio permite que sua empresa tenha um endereço exclusivo, como suaempresa.meudashboard.org. Seus clientes acessam a plataforma por esse endereço e veem sua marca: logo, cores e textos personalizados na tela de login e na experiência. Ideal para software houses e consultorias que entregam o MeuDashboard como solução própria aos clientes. O subdomínio é configurado no perfil do desenvolvedor e precisa de aprovação. Consulte-nos para verificar disponibilidade no seu plano.',
  },
  {
    q: 'Quais são os planos disponíveis?',
    a: 'Os planos são definidos sob consulta, conforme a necessidade do seu negócio. Entre em contato pelo WhatsApp ou email para receber uma proposta personalizada com usuários, telas, alertas, IA e demais recursos adequados à sua operação.',
  },
  {
    q: 'Como funciona o suporte?',
    a: 'O suporte é oferecido por WhatsApp e email. Temos documentação completa, guias de configuração e equipe pronta para ajudar na implementação, migração e dúvidas técnicas. Planos Business e superiores incluem atendimento prioritário com tempo de resposta reduzido. O plano Personalizado conta com suporte dedicado.',
  },
];

function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  return (
    <div className="space-y-6">
      {FAQ_ITEMS.map((item, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === i ? null : i)}
            className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-slate-50 transition-colors"
          >
            <span className="font-semibold text-slate-900">{item.q}</span>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
          </button>
          {openIndex === i && (
            <div className="px-6 pb-4 text-slate-600 text-sm">
              <p>{item.a}</p>
              {item.link && (
                <Link href={item.link.href} className="inline-flex items-center gap-1 mt-3 text-blue-600 hover:text-blue-700 font-medium">
                  {item.link.label}
                </Link>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const { developerInfo, loading, isSubdomain } = useSubdomain();
  const [scrollY, setScrollY] = useState(0);
  const [navOpaque, setNavOpaque] = useState(false);
  const [isInitialSpin, setIsInitialSpin] = useState(true);
  const [dashboardVisible, setDashboardVisible] = useState(false);
  const [propostaModalOpen, setPropostaModalOpen] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const whatsappLink = 'https://wa.me/556282289559?text=Olá! Gostaria de saber mais sobre o MeuDashboard.';

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
      setNavOpaque(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsInitialSpin(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const observerRef = useRef<IntersectionObserver | null>(null);
  useEffect(() => {
    if (loading || isSubdomain) return;
    const setup = () => {
      const el = dashboardRef.current;
      if (!el) return false;
      const observer = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setDashboardVisible(true); },
        { threshold: 0.05, rootMargin: '100px' }
      );
      observer.observe(el);
      observerRef.current = observer;
      return true;
    };
    if (!setup()) {
      const t = setTimeout(setup, 150);
      return () => { clearTimeout(t); observerRef.current?.disconnect(); };
    }
    return () => { observerRef.current?.disconnect(); observerRef.current = null; };
  }, [loading, isSubdomain]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // Subdomínio — redirecionar para /login (que já tem o design personalizado)
  if (isSubdomain && developerInfo) {
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (isSubdomain && !developerInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md text-center">
          <h1 className="text-xl font-bold text-gray-900 mb-2">Subdomínio não encontrado</h1>
          <p className="text-gray-500 mb-6">Este endereço não está configurado ou ainda não foi aprovado.</p>
          <Link href="https://meudashboard.org" className="text-blue-600 hover:underline">Ir para MeuDashboard</Link>
        </div>
      </div>
    );
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'MeuDashboard',
        description: 'Plataforma de dashboards Power BI com IA integrada. Consulte dados por WhatsApp, receba alertas automáticos e controle o acesso por usuário.',
        url: 'https://meudashboard.org',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'BRL' },
      }) }} />
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap');
        * { font-family: 'Exo 2', system-ui, sans-serif; }
        .brand-name { font-family: 'Orbitron', 'Exo 2', sans-serif; font-weight: 700; letter-spacing: 0.02em; color: #2563eb; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes initialSpin { 0% { transform: rotate(0deg); } 20% { transform: rotate(360deg); } 50% { transform: rotate(600deg); } 75% { transform: rotate(700deg); } 100% { transform: rotate(720deg); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out forwards; }
        @keyframes gradientFlow { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
        .animated-gradient { background: linear-gradient(135deg, #06b6d4, #3b82f6, #8b5cf6, #06b6d4); background-size: 300% 300%; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: gradientFlow 4s ease infinite; }
      `}</style>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${navOpaque ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-slate-100' : 'bg-transparent'}`}>
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-3">
                <AnimatedLogo size={32} scrollY={scrollY} isInitialSpin={isInitialSpin} />
                <BrandName size="text-xl" />
              </Link>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#funcionalidades" className="text-slate-600 hover:text-slate-900 text-sm font-medium">Funcionalidades</a>
              <a href="#como-funciona" className="text-slate-600 hover:text-slate-900 text-sm font-medium">Como funciona</a>
              <a href="#para-quem" className="text-slate-600 hover:text-slate-900 text-sm font-medium">Para quem</a>
              <a href="#faq" className="text-slate-600 hover:text-slate-900 text-sm font-medium">FAQ</a>
              <a href="#planos" className="text-slate-600 hover:text-slate-900 text-sm font-medium">Planos</a>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login" className="border border-slate-300 text-slate-800 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 hover:border-slate-400 transition-all">Entrar</Link>
              <Link href="/cadastro" className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all">Comece grátis</Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-28" style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)' }}>
        <div className="absolute top-40 left-20 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="mb-6 flex justify-center"><AnimatedLogo size={80} scrollY={scrollY} isInitialSpin={isInitialSpin} /></div>
          <span className="inline-block bg-cyan-100 text-cyan-700 px-4 py-1.5 rounded-full text-sm font-medium mb-6">Plataforma com IA integrada</span>
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 leading-tight">
            Seus dashboards Power BI <br /><span className="animated-gradient">com Inteligência Artificial</span>
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Consulte dados por <strong className="text-slate-800">WhatsApp com IA</strong>, receba alertas automáticos e controle o acesso por usuário. Tudo em uma plataforma.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/cadastro" className="group bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-xl hover:shadow-cyan-500/25 transition-all duration-300 flex items-center gap-2">
              Começar grátis
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="group bg-white text-slate-700 px-8 py-4 rounded-2xl font-semibold text-lg border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-500" />
              Falar com especialista
            </a>
          </div>
          <p className="mt-6 text-sm text-slate-500">Configuração em minutos. Sem cartão de crédito.</p>
          <div className="mt-16 flex flex-col items-center gap-2 animate-bounce">
            <span className="text-xs text-slate-400 uppercase tracking-wider">Role para explorar</span>
            <div className="w-6 h-10 rounded-full border-2 border-slate-300 flex items-start justify-center p-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-6 bg-white border-y border-slate-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-slate-900"><AnimatedCounter end={500} suffix="+" /></p>
              <p className="text-slate-600 text-sm mt-1">Dashboards ativos</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-slate-900"><AnimatedCounter end={2000} suffix="+" /></p>
              <p className="text-slate-600 text-sm mt-1">Usuários</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-slate-900"><AnimatedCounter end={50} suffix="k+" /></p>
              <p className="text-slate-600 text-sm mt-1">Consultas IA/mês</p>
            </div>
            <div className="text-center">
              <p className="text-3xl md:text-4xl font-bold text-slate-900"><AnimatedCounter end={99} suffix="%" /></p>
              <p className="text-slate-600 text-sm mt-1">Uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ BANNER PLANO GRÁTIS ============ */}
      <section className="py-12 px-6 bg-gradient-to-r from-blue-600 via-blue-700 to-purple-700">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center shrink-0">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Comece grátis, sem compromisso</h3>
              <p className="text-blue-100 text-sm mt-0.5">Crie sua conta e configure seus dashboards agora mesmo. Upgrade quando quiser.</p>
            </div>
          </div>
          <Link
            href="/cadastro"
            className="bg-white text-blue-700 px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-blue-50 transition-all shadow-lg whitespace-nowrap flex items-center gap-2"
          >
            Comece grátis
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="funcionalidades" className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block bg-cyan-100 text-cyan-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">Funcionalidades</span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Tudo que você precisa</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">Uma plataforma completa para gerenciar e compartilhar seus dashboards</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard icon={BarChart3} title="Dashboards Power BI" description="Integre seus relatórios Power BI com embed seguro, performance e acesso controlado por usuários." gradient="from-blue-500 to-blue-600" />
            <FeatureCard icon={Brain} title="IA no WhatsApp" description="Consulte dados pelo WhatsApp. A IA analisa, interpreta padrões e sugere ações baseadas nos seus indicadores." gradient="from-purple-500 to-purple-600" />
            <FeatureCard icon={Bell} title="Alertas automáticos" description="Receba alertas no WhatsApp quando métricas ultrapassarem limites. Agendamentos e notificações em tempo real." gradient="from-amber-500 to-orange-500" />
            <FeatureCard icon={Shield} title="Controle de acesso" description="Cada usuário com acesso limitado às suas informações. Permissões por pessoa, dashboard e dados." gradient="from-emerald-500 to-green-600" />
            <FeatureCard icon={RefreshCw} title="Atualização monitorada" description="Monitore datasets e dataflows. Alertas de erro, atraso e relatório diário por WhatsApp." gradient="from-amber-500 to-amber-600" />
            <FeatureCard icon={Database} title="Multi-tenant" description="Grupos de empresa isolados. Ideal para software houses e consultorias com múltiplos clientes." gradient="from-indigo-500 to-indigo-600" />
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-block bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">Como Funciona</span>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-8">
                Configuração em{' '}
                <span className="animated-gradient whitespace-nowrap">3 passos simples</span>
              </h2>
              <div className="space-y-0">
                <StepCard number={1} title="Conecte seu Power BI" description="Integre seus workspaces, datasets e relatórios. Configuração em minutos com Service Principal." />
                <StepCard number={2} title="Configure usuários e telas" description="Defina quem acessa o quê. Crie telas personalizadas e controle permissões por grupo." />
                <StepCard number={3} title="Ative IA e WhatsApp" description="Conecte o WhatsApp e deixe a IA responder perguntas em linguagem natural sobre seus dados." isLast={true} />
              </div>
              <Link href="/cadastro" className="inline-flex items-center gap-2 mt-8 bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all">
                Comece grátis
                <ArrowRight className="w-5 h-5" />
              </Link>
            </div>
            <div className="relative" ref={dashboardRef}>
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 shadow-2xl">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <StaticLogo size={24} />
                    <span className="text-white text-lg brand-name"><span className="text-[1.2em]">M</span>eu<span className="text-[1.2em]">D</span>ashboard</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                      <p className="text-xs text-slate-400 mb-1">Faturamento</p>
                      <p className="text-2xl font-bold text-white">R$ 1.2M</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-xl p-4">
                      <p className="text-xs text-slate-400 mb-1">Crescimento</p>
                      <p className="text-2xl font-bold text-green-400">+24%</p>
                    </div>
                  </div>
                  <div className="bg-white/5 backdrop-blur rounded-xl p-4">
                    <p className="text-xs text-slate-400 mb-3">Vendas por Mês</p>
                    <AnimatedBarChart isVisible={dashboardVisible} />
                  </div>
                  <AnimatedWhatsAppChat isVisible={dashboardVisible} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Para Quem */}
      <section id="para-quem" className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block bg-cyan-100 text-cyan-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">Para quem</span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Feito para o seu negócio</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">Seja qual for o seu perfil, o MeuDashboard se adapta</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ParaQuemCard icon={Building2} title="Software Houses" description="Entregue dashboards para clientes com white-label, controle de acesso e suporte a múltiplos grupos." tag="B2B" />
            <ParaQuemCard icon={TrendingUp} title="Consultorias BI" description="Monitore datasets, alertas de refresh e entregue relatórios com IA integrada aos seus clientes." tag="Consultoria" />
            <ParaQuemCard icon={Users} title="Gestores" description="Centralize KPIs, dashboards e alertas. Consulte dados por WhatsApp sem precisar abrir o Power BI." tag="Gestão" />
            <ParaQuemCard icon={Database} title="Equipes de Dados" description="Controle de acesso granular, ordem de atualização e monitoramento de datasets e dataflows." tag="Data" />
            <ParaQuemCard icon={FileCheck} title="Compliance" description="Auditoria de acesso, logs de uso e permissões por usuário. Rastreabilidade completa." tag="Governança" />
            <ParaQuemCard icon={Zap} title="Startups e PMEs" description="Comece grátis, escale conforme cresce. Sem cartão de crédito para começar." tag="Growth" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block bg-cyan-100 text-cyan-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">FAQ</span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Perguntas frequentes</h2>
          </div>
          <FAQAccordion />
        </div>
      </section>

      {/* Planos */}
      <section id="planos" className="py-24 px-6 bg-slate-50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 via-white to-cyan-50/30" />
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block bg-cyan-100 text-cyan-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">Planos</span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Escolha o que faz sentido para você</h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">Comece grátis e faça upgrade quando precisar de mais recursos. O plano Pro é personalizado sob consulta.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-stretch">
            {/* Free */}
            <div className="flex flex-col bg-white rounded-3xl border-2 border-slate-200 p-8 shadow-lg shadow-slate-200/50 hover:border-slate-300 hover:shadow-xl transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <Zap className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Free</h3>
                  <p className="text-slate-500 font-medium">Grátis para sempre</p>
                </div>
              </div>
              <p className="text-slate-600 text-sm mb-6">Ideal para testar a plataforma e começar com o essencial.</p>
              <ul className="space-y-3 mb-8">
                {[
                  { icon: FolderOpen, text: '1 grupo' },
                  { icon: Users, text: '10 viewers' },
                  { icon: LayoutDashboard, text: '5 dashboards' },
                  { icon: BarChart3, text: 'Power BI Embedded' },
                ].map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <li key={i} className="flex items-center gap-3 text-slate-700">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span>{f.text}</span>
                    </li>
                  );
                })}
                {['WhatsApp', 'IA', 'Subdomínio personalizado'].map((text, i) => (
                  <li key={`ex-${i}`} className="flex items-center gap-3 text-slate-400">
                    <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-[10px] font-bold">✕</div>
                    <span className="line-through">{text}</span>
                  </li>
                ))}
              </ul>
              <Link href="/cadastro" className="mt-auto block w-full text-center bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-4 rounded-xl transition-colors">
                Começar grátis
              </Link>
            </div>

            {/* Pro */}
            <div className="flex flex-col relative bg-white rounded-3xl border-2 border-blue-500 p-8 shadow-xl shadow-blue-500/15 hover:shadow-blue-500/25 transition-all duration-300">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg">
                Mais popular
              </div>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Crown className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-slate-900">Pro</h3>
                  <p className="text-slate-500 font-medium">Sob consulta</p>
                </div>
              </div>
              <p className="text-slate-600 text-sm mb-6">Todos os recursos para escalar. Proposta personalizada conforme sua necessidade.</p>
              <ul className="space-y-3 mb-8">
                {[
                  { icon: FolderOpen, text: 'Grupos ilimitados' },
                  { icon: Users, text: 'Viewers conforme demanda' },
                  { icon: LayoutDashboard, text: 'Dashboards conforme demanda' },
                  { icon: Globe, text: 'Subdomínio personalizado' },
                  { icon: MessageSquare, text: 'WhatsApp integrado' },
                  { icon: Brain, text: 'IA assistente' },
                ].map((f, i) => {
                  const Icon = f.icon;
                  return (
                    <li key={i} className="flex items-center gap-3 text-slate-700">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <Icon className="w-4 h-4 text-blue-500" />
                      <span>{f.text}</span>
                    </li>
                  );
                })}
              </ul>
              <button
                type="button"
                onClick={() => setPropostaModalOpen(true)}
                className="mt-auto flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
              >
                <MessageSquare className="w-5 h-5" />
                Solicitar proposta
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final - Dark */}
      <section className="py-24 px-6 bg-slate-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10" />
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">Pronto para começar?</h2>
          <p className="text-xl text-slate-300 mb-10 max-w-xl mx-auto">Crie sua conta grátis e em minutos seus dashboards estarão com superpoderes.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/cadastro" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-2">
              Comece grátis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all flex items-center justify-center gap-3">
              <MessageSquare className="w-6 h-6" />
              Falar no WhatsApp
            </a>
          </div>
          <p className="mt-6 text-sm text-slate-400">Sem cartão de crédito</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="flex items-center gap-3">
              <StaticLogo size={28} />
              <BrandName size="text-lg" />
            </div>
            <div>
              <p className="text-slate-600 text-sm">Dashboards Power BI com IA integrada. Consulte dados por WhatsApp, receba alertas e controle o acesso.</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-600">Desenvolvido por <a href="https://vion.com.br" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-slate-900">vion.com.br</a></p>
              <p className="text-sm text-slate-400 mt-1">© 2026 MeuDashboard</p>
            </div>
          </div>
        </div>
      </footer>

      {/* WhatsApp Float */}
      <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 group" title="Fale conosco!">
        <MessageSquare className="w-6 h-6" />
        <span className="absolute right-full mr-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Fale conosco!</span>
      </a>

      <PropostaModal open={propostaModalOpen} onClose={() => setPropostaModalOpen(false)} />
    </div>
  );
}
