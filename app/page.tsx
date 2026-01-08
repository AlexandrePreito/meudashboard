'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { BarChart3, MessageSquare, Bell, Shield, ArrowRight, Brain } from 'lucide-react';

// Componente do Asterisco Animado (gira TODA vez que rolar)
function AnimatedLogo({ size = 48, scrollY = 0 }: { size?: number; scrollY?: number }) {
  const rotation = scrollY * 0.5;

  return (
    <svg 
      viewBox="0 0 100 100" 
      width={size} 
      height={size}
      style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.1s ease-out' }}
    >
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

// Logo estática
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

// Nome da marca com M e D maiores
function BrandName({ className = "", size = "text-xl" }: { className?: string; size?: string }) {
  return (
    <span className={`brand-name ${size} ${className}`}>
      <span className="text-[1.2em]">M</span>eu<span className="text-[1.2em]">D</span>ashboard
    </span>
  );
}

// Card de Funcionalidade
function FeatureCard({ icon: Icon, title, description, gradient = "from-cyan-500 to-blue-600" }: {
  icon: any;
  title: string;
  description: string;
  gradient?: string;
}) {
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

// Gráfico de Barras Animado CONTINUAMENTE
function AnimatedBarChart({ isVisible }: { isVisible: boolean }) {
  const [heights, setHeights] = useState([40, 55, 45, 70, 50, 85, 65]);
  
  useEffect(() => {
    if (!isVisible) return;
    
    const interval = setInterval(() => {
      setHeights(prev => prev.map(h => {
        const change = (Math.random() - 0.5) * 20;
        const newHeight = h + change;
        return Math.max(25, Math.min(95, newHeight));
      }));
    }, 1500);
    
    return () => clearInterval(interval);
  }, [isVisible]);
  
  return (
    <div className="flex items-end justify-between h-32 gap-2">
      {heights.map((height, i) => (
        <div
          key={i}
          className="flex-1 bg-gradient-to-t from-cyan-500 to-cyan-400/60 rounded-t transition-all duration-1000 ease-out"
          style={{ height: isVisible ? `${height}%` : '10%' }}
        />
      ))}
    </div>
  );
}

// Chat WhatsApp Animado - SEM ASPAS, última pergunta é "Como aumentar minhas vendas?"
function AnimatedWhatsAppChat({ isVisible }: { isVisible: boolean }) {
  const [step, setStep] = useState(0);
  
  useEffect(() => {
    if (!isVisible) return;
    
    if (step < 10) {
      const delays = [500, 1500, 2500, 4000, 5000, 6500, 8000, 9500, 11000, 12500];
      const timer = setTimeout(() => setStep(s => s + 1), delays[step] || 1000);
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
        {/* Pergunta 1 - SEM ASPAS */}
        {step >= 1 && (
          <div className="flex justify-end animate-fadeIn">
            <div className="bg-green-600/30 text-white/90 px-4 py-2 rounded-2xl rounded-tr-sm text-sm max-w-[85%]">
              Qual foi o faturamento de dezembro?
            </div>
          </div>
        )}
        
        {/* Digitando 1 */}
        {step === 2 && (
          <div className="flex items-center gap-1 px-2 py-2">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
        
        {/* Resposta 1 */}
        {step >= 3 && (
          <div className="flex justify-start animate-fadeIn">
            <div className="bg-slate-700/50 text-white/90 px-4 py-3 rounded-2xl rounded-tl-sm text-sm max-w-[90%]">
              <p className="mb-1">📊 <strong>Faturamento Dez/2025</strong></p>
              <p className="text-cyan-300 text-lg font-bold">💰 R$ 284.500,00</p>
              <p className="text-slate-400 text-xs mt-1">📈 +12% vs mês anterior</p>
            </div>
          </div>
        )}
        
        {/* Pergunta 2 - SEM ASPAS */}
        {step >= 4 && (
          <div className="flex justify-end animate-fadeIn">
            <div className="bg-green-600/30 text-white/90 px-4 py-2 rounded-2xl rounded-tr-sm text-sm max-w-[85%]">
              Quais os top 3 produtos?
            </div>
          </div>
        )}
        
        {/* Digitando 2 */}
        {step === 5 && (
          <div className="flex items-center gap-1 px-2 py-2">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
        
        {/* Resposta 2 */}
        {step >= 6 && (
          <div className="flex justify-start animate-fadeIn">
            <div className="bg-slate-700/50 text-white/90 px-4 py-3 rounded-2xl rounded-tl-sm text-sm max-w-[90%]">
              <p className="mb-2">🏆 <strong>Top 3 Produtos:</strong></p>
              <p className="text-slate-300 text-sm">🥇 Monitor 27&quot; - R$ 45.200</p>
              <p className="text-slate-300 text-sm">🥈 Notebook Pro - R$ 38.900</p>
              <p className="text-slate-300 text-sm">🥉 Mouse Gamer - R$ 22.100</p>
            </div>
          </div>
        )}
        
        {/* Pergunta 3 - COMO AUMENTAR MINHAS VENDAS (ÚLTIMA) - SEM ASPAS */}
        {step >= 7 && (
          <div className="flex justify-end animate-fadeIn">
            <div className="bg-green-600/30 text-white/90 px-4 py-2 rounded-2xl rounded-tr-sm text-sm max-w-[85%]">
              Como aumentar minhas vendas?
            </div>
          </div>
        )}
        
        {/* Digitando 3 */}
        {step === 8 && (
          <div className="flex items-center gap-1 px-2 py-2">
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
        
        {/* Resposta 3 - Sugestões da IA */}
        {step >= 9 && (
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

// Passo com bolinhas IGUAIS
function StepCard({ number, title, description, isLast = false }: {
  number: number;
  title: string;
  description: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
          {number}
        </div>
        {!isLast && <div className="w-0.5 h-full bg-gradient-to-b from-cyan-500 to-purple-500 mt-2 min-h-[60px]" />}
      </div>
      <div className="pb-8">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">{title}</h3>
        <p className="text-slate-600 text-sm">{description}</p>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [dashboardVisible, setDashboardVisible] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);
  
  const whatsappLink = "https://wa.me/556282289559?text=Olá! Gostaria de saber mais sobre o MeuDashboard.";

  // Detecta scroll para girar os asteriscos TODA vez
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Detecta quando o dashboard fica visível
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setDashboardVisible(true);
        }
      },
      { threshold: 0.3 }
    );
    
    if (dashboardRef.current) {
      observer.observe(dashboardRef.current);
    }
    
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap');
        
        * {
          font-family: 'Exo 2', system-ui, sans-serif;
        }
        
        .brand-name {
          font-family: 'Orbitron', 'Exo 2', sans-serif;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #2563eb;
        }
        
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        
        @keyframes gradientFlow {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        
        .animated-gradient {
          background: linear-gradient(135deg, #06b6d4, #3b82f6, #8b5cf6, #06b6d4);
          background-size: 300% 300%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          animation: gradientFlow 4s ease infinite;
        }
        
        /* Scrollbar customizada para o chat */
        .overflow-y-auto::-webkit-scrollbar {
          width: 4px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-track {
          background: rgba(148, 163, 184, 0.1);
          border-radius: 10px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.3);
          border-radius: 10px;
        }
        
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.5);
        }
      `}</style>
      
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md shadow-sm border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AnimatedLogo size={32} scrollY={scrollY} />
              <BrandName size="text-xl" />
            </div>
            <Link href="/login" className="bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all">
              Entrar
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16" style={{
        background: 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)'
      }}>
        <div className="absolute top-40 left-20 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          {/* Logo animada principal */}
          <div className="flex justify-center mb-10">
            <AnimatedLogo size={90} scrollY={scrollY} />
          </div>
          
          {/* Título */}
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 leading-tight">
            <span className="animated-gradient">Eleve seu Dashboard</span>
          </h1>
          
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Hospede seus dashboards Power BI em uma plataforma inteligente com IA que 
            <strong className="text-slate-800"> analisa, interpreta e sugere</strong> ações baseadas nos seus dados.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/login" className="group bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg hover:shadow-xl hover:shadow-cyan-500/25 transition-all duration-300 flex items-center gap-2">
              Começar agora
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
              className="group bg-white text-slate-700 px-8 py-4 rounded-2xl font-semibold text-lg border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-green-500" />
              Falar conosco
            </a>
          </div>
          
          <div className="mt-12 inline-flex items-center gap-2 bg-white px-5 py-2.5 rounded-full border border-slate-200 shadow-sm">
            <Brain className="w-5 h-5 text-purple-500" />
            <span className="text-sm text-slate-600">Powered by <strong className="text-slate-900">Inteligência Artificial</strong></span>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="funcionalidades" className="py-24 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <span className="inline-block bg-cyan-100 text-cyan-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
              Funcionalidades
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Tudo que você precisa
            </h2>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">
              Uma plataforma completa para gerenciar e compartilhar seus dashboards
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <FeatureCard 
              icon={BarChart3} 
              title="Dashboards Power BI" 
              description="Integre seus relatórios Power BI diretamente na plataforma com toda segurança, performance e acesso controlado por usuários."
              gradient="from-blue-500 to-blue-600"
            />
            <FeatureCard 
              icon={Brain} 
              title="Assistente IA no WhatsApp" 
              description="Consulte seus dados pelo WhatsApp. Nossa IA não só busca informações, mas analisa, interpreta padrões e sugere ações baseadas nos seus indicadores."
              gradient="from-purple-500 to-purple-600"
            />
            <FeatureCard 
              icon={Bell} 
              title="Alertas e Agendamentos" 
              description="Agende relatórios e receba alertas diretamente no WhatsApp. Defina horários, métricas críticas e seja notificado automaticamente."
              gradient="from-amber-500 to-orange-500"
            />
            <FeatureCard 
              icon={Shield} 
              title="Segurança por Usuários" 
              description="Cada usuário com acesso limitado às suas informações. Controle granular de permissões por pessoa, dashboard e dados consultáveis."
              gradient="from-emerald-500 to-green-600"
            />
          </div>
        </div>
      </section>

      {/* Como Funciona */}
      <section id="como-funciona" className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-block bg-purple-100 text-purple-700 px-4 py-1.5 rounded-full text-sm font-medium mb-4">
                Como Funciona
              </span>
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8">
                Simples de começar
              </h2>
              
              <div className="space-y-0">
                <StepCard 
                  number={1} 
                  title="Mapeamos seu BI" 
                  description="Conectamos ao seu Power BI e mapeamos todas as tabelas, métricas e relacionamentos do seu modelo de dados."
                />
                <StepCard 
                  number={2} 
                  title="Conectamos à nossa IA" 
                  description="Nossa inteligência artificial aprende a estrutura dos seus dados para responder perguntas em linguagem natural."
                />
                <StepCard 
                  number={3} 
                  title="Você pergunta, a IA responde" 
                  description="Acesse via web ou WhatsApp. Faça perguntas e receba análises, insights e sugestões em segundos."
                  isLast={true}
                />
              </div>
            </div>
            
            {/* Preview com animações */}
            <div className="relative" ref={dashboardRef}>
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl p-6 shadow-2xl">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 mb-4">
                    <StaticLogo size={24} />
                    <span className="text-white text-lg brand-name">
                      <span className="text-[1.2em]">M</span>eu<span className="text-[1.2em]">D</span>ashboard
                    </span>
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
                  
                  {/* Gráfico de barras animando CONTINUAMENTE */}
                  <div className="bg-white/5 backdrop-blur rounded-xl p-4">
                    <p className="text-xs text-slate-400 mb-3">Vendas por Mês</p>
                    <AnimatedBarChart isVisible={dashboardVisible} />
                  </div>
                  
                  {/* Chat com 3 perguntas */}
                  <AnimatedWhatsAppChat isVisible={dashboardVisible} />
                </div>
              </div>
              
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl" />
              <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-purple-500/20 rounded-full blur-2xl" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section - FUNDO CLARO */}
      <section id="contato" className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="relative bg-gradient-to-br from-slate-100 via-white to-slate-50 rounded-3xl p-12 text-center border border-slate-200 shadow-xl overflow-hidden">
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-cyan-500/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              {/* Asterisco + Título juntos */}
              <div className="flex items-center justify-center gap-4 mb-6">
                <AnimatedLogo size={48} scrollY={scrollY} />
                <h2 className="text-3xl md:text-4xl font-bold text-slate-900">
                  Pronto para elevar seu Dashboard?
                </h2>
              </div>
              
              <p className="text-lg text-slate-600 mb-8 max-w-xl mx-auto">
                Entre em contato e descubra como a IA pode transformar a forma como sua empresa analisa dados.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
                  className="bg-green-500 hover:bg-green-600 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-green-500/20">
                  <MessageSquare className="w-6 h-6" />
                  Falar no WhatsApp
                </a>
                
                <Link href="/login" className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 hover:shadow-xl">
                  Acessar plataforma
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <StaticLogo size={28} />
              <BrandName size="text-lg" />
            </div>
            
            <p className="text-sm text-slate-600">
              Desenvolvido por <a href="https://vion.com.br" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-slate-900 transition-colors">vion.com.br</a>
            </p>
            
            <p className="text-sm text-slate-400">
              © 2026 MeuDashboard
            </p>
          </div>
        </div>
      </footer>

      {/* WhatsApp Float Button */}
      <a href={whatsappLink} target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110">
        <MessageSquare className="w-6 h-6" />
      </a>
    </div>
  );
}
