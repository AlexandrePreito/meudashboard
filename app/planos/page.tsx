'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Check, 
  X,
  MessageSquare, 
  Bell, 
  Brain, 
  Monitor,
  Users,
  Building2,
  Code,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ArrowLeft,
  Zap,
  Shield,
  Headphones,
  Palette
} from 'lucide-react';

// Componente do Asterisco Animado (gira TODA vez que rolar)
function AnimatedLogo({ size = 48, scrollY = 0, isInitialSpin = false }: { size?: number; scrollY?: number; isInitialSpin?: boolean }) {
  const rotation = isInitialSpin ? 0 : scrollY * 0.5;

  return (
    <svg 
      viewBox="0 0 100 100" 
      width={size} 
      height={size}
      style={{ 
        transform: `rotate(${rotation}deg)`,
        transition: isInitialSpin ? 'none' : 'transform 0.1s ease-out',
        animation: isInitialSpin ? 'initialSpin 2s cubic-bezier(0.25, 0.1, 0.25, 1) forwards' : 'none'
      }}
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

const planosUsuarios = [
  {
    nome: 'Starter',
    descricao: 'Para pequenas equipes',
    preco: 99,
    destaque: false,
    recursos: {
      usuarios: 5,
      telas: 3,
      whatsapp: 100,
      alertas: 10,
      ia: 50,
      suporte: 'Chat',
      whiteLabel: false
    }
  },
  {
    nome: 'Basico',
    descricao: 'Para equipes em crescimento',
    preco: 299,
    destaque: false,
    recursos: {
      usuarios: 15,
      telas: 10,
      whatsapp: 500,
      alertas: 50,
      ia: 200,
      suporte: 'Chat',
      whiteLabel: false
    }
  },
  {
    nome: 'Pro',
    descricao: 'O mais escolhido',
    preco: 599,
    destaque: true,
    recursos: {
      usuarios: 50,
      telas: 30,
      whatsapp: 2000,
      alertas: 200,
      ia: 1000,
      suporte: 'Chat prioritario',
      whiteLabel: true
    }
  },
  {
    nome: 'Enterprise',
    descricao: 'Para grandes operacoes',
    preco: null,
    destaque: false,
    recursos: {
      usuarios: 'Ilimitado',
      telas: 'Ilimitado',
      whatsapp: 'Ilimitado',
      alertas: 'Ilimitado',
      ia: 'Ilimitado',
      suporte: 'Chat dedicado',
      whiteLabel: true
    }
  }
];

const planosDevs = [
  {
    nome: 'Dev Starter',
    descricao: 'Para comecar a revender',
    preco: 999,
    destaque: false,
    recursos: {
      grupos: 5,
      usuarios: 15,
      telas: 15,
      whatsapp: 500,
      alertas: 50,
      ia: 200,
      suporte: 'Chat',
      whiteLabel: true
    }
  },
  {
    nome: 'Dev Pro',
    descricao: 'O mais escolhido',
    preco: 2499,
    destaque: true,
    recursos: {
      grupos: 15,
      usuarios: 45,
      telas: 45,
      whatsapp: 2000,
      alertas: 200,
      ia: 1000,
      suporte: 'Chat prioritario',
      whiteLabel: true
    }
  },
  {
    nome: 'Dev Business',
    descricao: 'Para operacoes maiores',
    preco: 4999,
    destaque: false,
    recursos: {
      grupos: 40,
      usuarios: 120,
      telas: 120,
      whatsapp: 5000,
      alertas: 500,
      ia: 3000,
      suporte: 'Chat prioritario',
      whiteLabel: true
    }
  },
  {
    nome: 'Dev Enterprise',
    descricao: 'Escala ilimitada',
    preco: null,
    destaque: false,
    recursos: {
      grupos: 'Ilimitado',
      usuarios: 'Ilimitado',
      telas: 'Ilimitado',
      whatsapp: 'Ilimitado',
      alertas: 'Ilimitado',
      ia: 'Ilimitado',
      suporte: 'Chat dedicado',
      whiteLabel: true
    }
  }
];

const faqs = [
  {
    pergunta: 'Como funciona o MeuDashboard?',
    resposta: 'O MeuDashboard permite que voce hospede e compartilhe seus dashboards Power BI de forma segura com sua equipe. Basta conectar seu Power BI, configurar as permissoes e pronto!'
  },
  {
    pergunta: 'Preciso ter Power BI para usar?',
    resposta: 'Sim, voce precisa ter uma conta Power BI com os relatorios que deseja compartilhar. Nos cuidamos da hospedagem e distribuicao segura.'
  },
  {
    pergunta: 'O que sao os creditos de IA?',
    resposta: 'Os creditos de IA permitem usar nossa inteligencia artificial para analisar seus dados, responder perguntas sobre seus dashboards e gerar insights automaticos.'
  },
  {
    pergunta: 'Posso mudar de plano depois?',
    resposta: 'Sim! Voce pode fazer upgrade ou downgrade do seu plano a qualquer momento. As mudancas sao aplicadas no proximo ciclo de cobranca.'
  },
  {
    pergunta: 'O que e o plano Desenvolvedor?',
    resposta: 'O plano Desenvolvedor e para empresas que criam dashboards para seus clientes e querem hospedar tudo em um so lugar, com sua propria marca (white-label).'
  },
  {
    pergunta: 'Como funciona o suporte?',
    resposta: 'Oferecemos suporte via chat em todos os planos. Planos Pro e superiores tem atendimento prioritario com tempo de resposta reduzido.'
  }
];

export default function PlanosPage() {
  const [tipoPlano, setTipoPlano] = useState<'usuarios' | 'desenvolvedores'>('usuarios');
  const [faqAberto, setFaqAberto] = useState<number | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const [isInitialSpin, setIsInitialSpin] = useState(true);

  const planos = tipoPlano === 'usuarios' ? planosUsuarios : planosDevs;

  const whatsappLink = `https://wa.me/5562982289559?text=${encodeURIComponent('Ola! Gostaria de saber mais sobre o MeuDashboard.')}`;

  // Detecta scroll para girar os asteriscos TODA vez
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Animação de entrada - gira e para após 2 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialSpin(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700;800&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&display=swap');
        
        .brand-name {
          font-family: 'Orbitron', 'Exo 2', sans-serif;
          font-weight: 700;
          letter-spacing: 0.02em;
          color: #2563eb;
        }
        
        @keyframes initialSpin {
          0% {
            transform: rotate(0deg);
          }
          20% {
            transform: rotate(360deg);
          }
          50% {
            transform: rotate(600deg);
          }
          75% {
            transform: rotate(700deg);
          }
          100% {
            transform: rotate(720deg);
          }
        }
      `}</style>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-3">
              <AnimatedLogo size={32} scrollY={scrollY} isInitialSpin={isInitialSpin} />
              <BrandName size="text-xl" />
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Voltar"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Entrar
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Logo animada principal */}
          <div className="flex justify-center mb-10">
            <AnimatedLogo size={90} scrollY={scrollY} isInitialSpin={isInitialSpin} />
          </div>
          <div className="inline-block px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-sm font-medium mb-6">
            Eleve seus Dashboards
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
            Seus relatórios em Power BI
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500">
              ainda mais inteligentes
            </span>
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Hospede, compartilhe e gerencie seus dashboards Power BI com seguranca. 
            Alertas automaticos, integracao com WhatsApp e inteligencia artificial.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all duration-300 font-semibold text-lg flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-green-500/20"
            >
              <MessageSquare className="w-5 h-5" />
              Falar com consultor
            </a>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:text-blue-600 transition-colors font-semibold text-lg"
            >
              Ja tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* Recursos */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Tudo que voce precisa</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Uma plataforma completa para gerenciar seus dashboards e manter sua equipe sempre informada.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                <Monitor className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Dashboards Power BI</h3>
              <p className="text-gray-600">Hospede seus relatorios Power BI e compartilhe com sua equipe de forma segura.</p>
            </div>
            <div className="p-6 rounded-2xl border border-gray-100 hover:border-green-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
                <MessageSquare className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">WhatsApp Integrado</h3>
              <p className="text-gray-600">Envie alertas e relatorios diretamente para o WhatsApp da sua equipe.</p>
            </div>
            <div className="p-6 rounded-2xl border border-gray-100 hover:border-amber-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center mb-4">
                <Bell className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Alertas Automaticos</h3>
              <p className="text-gray-600">Configure alertas baseados em condicoes dos seus dados e seja notificado em tempo real.</p>
            </div>
            <div className="p-6 rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Inteligencia Artificial</h3>
              <p className="text-gray-600">Use IA para analisar seus dados, responder perguntas e gerar insights automaticos.</p>
            </div>
            <div className="p-6 rounded-2xl border border-gray-100 hover:border-cyan-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center mb-4">
                <Palette className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">White Label</h3>
              <p className="text-gray-600">Personalize a plataforma com sua marca, logo e cores. Seus clientes nem sabem que somos nos.</p>
            </div>
            <div className="p-6 rounded-2xl border border-gray-100 hover:border-rose-200 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-rose-100 rounded-xl flex items-center justify-center mb-4">
                <Headphones className="w-6 h-6 text-rose-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Suporte via Chat</h3>
              <p className="text-gray-600">Equipe de suporte pronta para ajudar voce via chat sempre que precisar.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Planos */}
      <section className="py-16 bg-gray-50" id="planos">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Escolha seu plano</h2>
            <p className="text-gray-600 max-w-2xl mx-auto mb-8">
              Planos flexiveis para todos os tamanhos de empresa. Comece pequeno e escale conforme crescer.
            </p>
            
            {/* Toggle Usuarios/Desenvolvedores */}
            <div className="inline-flex items-center bg-white rounded-xl p-1 border border-gray-200">
              <button
                onClick={() => setTipoPlano('usuarios')}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                  tipoPlano === 'usuarios'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Users className="w-5 h-5" />
                  <span>Para Empresas</span>
                </div>
              </button>
              <button
                onClick={() => setTipoPlano('desenvolvedores')}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-all ${
                  tipoPlano === 'desenvolvedores'
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Code className="w-5 h-5" />
                  <span>Desenvolvedores</span>
                </div>
              </button>
            </div>
          </div>

          {/* Cards de Planos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {planos.map((plano) => (
              <div
                key={plano.nome}
                className={`relative bg-white rounded-2xl border-2 transition-all ${
                  plano.destaque
                    ? 'border-blue-500 shadow-xl scale-105'
                    : 'border-gray-100 hover:border-gray-200 hover:shadow-lg'
                }`}
              >
                {plano.destaque && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="px-4 py-1 bg-blue-600 text-white text-sm font-medium rounded-full">
                      Mais vendido
                    </span>
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{plano.nome}</h3>
                  <p className="text-sm text-gray-500 mb-4">{plano.descricao}</p>
                  <div className="mb-6">
                    {plano.preco ? (
                      <>
                        <span className="text-4xl font-bold text-gray-900">R$ {plano.preco.toLocaleString()}</span>
                        <span className="text-gray-500">/mes</span>
                      </>
                    ) : (
                      <span className="text-2xl font-bold text-gray-900">Sob consulta</span>
                    )}
                  </div>
                  
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block w-full py-3 rounded-xl font-semibold text-center transition-colors ${
                      plano.destaque
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {plano.preco ? 'Contratar' : 'Falar com consultor'}
                  </a>
                </div>
                <div className="border-t border-gray-100 p-6 space-y-3">
                  {tipoPlano === 'desenvolvedores' && (
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-purple-500" />
                      <span className="text-sm text-gray-600">
                        <strong>{('grupos' in plano.recursos) ? String(plano.recursos.grupos) : ''}</strong> {('grupos' in plano.recursos) && typeof plano.recursos.grupos === 'number' ? 'grupos/clientes' : ''}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-blue-500" />
                    <span className="text-sm text-gray-600">
                      <strong>{plano.recursos.usuarios}</strong> {typeof plano.recursos.usuarios === 'number' ? 'usuarios' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-cyan-500" />
                    <span className="text-sm text-gray-600">
                      <strong>{plano.recursos.telas}</strong> {typeof plano.recursos.telas === 'number' ? 'telas' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-green-500" />
                    <span className="text-sm text-gray-600">
                      <strong>{plano.recursos.whatsapp}</strong> {typeof plano.recursos.whatsapp === 'number' ? 'msg/mes' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-amber-500" />
                    <span className="text-sm text-gray-600">
                      <strong>{plano.recursos.alertas}</strong> {typeof plano.recursos.alertas === 'number' ? 'alertas' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5 text-purple-500" />
                    <span className="text-sm text-gray-600">
                      <strong>{plano.recursos.ia}</strong> {typeof plano.recursos.ia === 'number' ? 'creditos IA' : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Headphones className="w-5 h-5 text-rose-500" />
                    <span className="text-sm text-gray-600">{plano.recursos.suporte}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {plano.recursos.whiteLabel ? (
                      <>
                        <Check className="w-5 h-5 text-green-500" />
                        <span className="text-sm text-gray-600">White Label</span>
                      </>
                    ) : (
                      <>
                        <X className="w-5 h-5 text-gray-300" />
                        <span className="text-sm text-gray-400">White Label</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Perguntas frequentes</h2>
            <p className="text-gray-600">Tire suas duvidas sobre o MeuDashboard</p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-gray-50 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => setFaqAberto(faqAberto === index ? null : index)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <span className="font-medium text-gray-900">{faq.pergunta}</span>
                  {faqAberto === index ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </button>
                {faqAberto === index && (
                  <div className="px-6 pb-4">
                    <p className="text-gray-600">{faq.resposta}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-cyan-500">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Pronto para elevar seus dashboards?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Fale com nosso time e descubra como o MeuDashboard pode transformar sua empresa.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-8 py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-all duration-300 font-semibold text-lg flex items-center justify-center gap-3 hover:shadow-xl hover:shadow-green-500/20"
            >
              <MessageSquare className="w-6 h-6" />
              Falar pelo WhatsApp
            </a>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-transparent text-white border-2 border-white rounded-xl hover:bg-white/10 transition-colors font-semibold text-lg"
            >
              Acessar minha conta
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <StaticLogo size={28} />
              <span className="text-lg font-bold text-white" style={{ fontFamily: "'Orbitron', 'Exo 2', sans-serif", letterSpacing: '0.02em' }}>
                <span className="text-[1.2em]">M</span>eu<span className="text-[1.2em]">D</span>ashboard
              </span>
            </div>
            <div className="flex items-center gap-6">
              <Link href="/login" className="text-gray-400 hover:text-white transition-colors">
                Entrar
              </Link>
              <a href="#planos" className="text-gray-400 hover:text-white transition-colors">
                Planos
              </a>
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Contato
              </a>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-500 text-sm">
              © {new Date().getFullYear()} MeuDashboard. Todos os direitos reservados.
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
    </>
  );
}
