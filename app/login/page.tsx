'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Componente de barras animadas
function AnimatedBars() {
  return (
    <div className="flex items-end justify-between h-32 w-full">
      {[40, 65, 45, 80, 55, 70, 50].map((height, i) => (
        <div
          key={i}
          className="flex-1 bg-gradient-to-t from-cyan-500/40 to-cyan-400/20 rounded-t mx-1"
          style={{
            height: `${height}%`,
            animation: `barPulse 2s ease-in-out ${i * 0.2}s infinite`
          }}
        />
      ))}
    </div>
  );
}

// Componente de número animado
function AnimatedNumber({ value, label, delay }: { value: string; label: string; delay: number }) {
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div 
      className={`bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 transition-all duration-700 ${
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

// Componente de linha de gráfico animada
function AnimatedLineChart() {
  return (
    <svg viewBox="0 0 200 60" className="w-full h-20" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <path
        d="M0,45 Q30,40 60,30 T120,20 T160,25 T200,10"
        fill="none"
        stroke="url(#lineGradient)"
        strokeWidth="2"
        className="animate-dash"
        style={{
          strokeDasharray: 300,
          strokeDashoffset: 300,
          animation: 'dashDraw 3s ease-out forwards'
        }}
      />
      <path
        d="M0,45 Q30,40 60,30 T120,20 T160,25 T200,10 L200,60 L0,60 Z"
        fill="url(#lineGradient)"
        opacity="0.1"
      />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setTransitioning(true);
        setTimeout(() => {
          router.push('/dashboard');
        }, 600);
      } else {
        setError(data.message || 'Email ou senha inválidos');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        @keyframes barPulse {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(0.7); }
        }
        @keyframes dashDraw {
          to { stroke-dashoffset: 0; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes fadeOutScale {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.02); }
        }
        @keyframes slideUp {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-20px); }
        }
        .page-transition {
          animation: fadeOutScale 0.6s ease-out forwards;
        }
        .form-transition {
          animation: slideUp 0.4s ease-out forwards;
        }
      `}</style>

      <div className={`min-h-screen flex ${transitioning ? 'page-transition' : ''}`}>
        {/* Lado esquerdo - Dashboard Animado */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          {/* Gradiente de fundo */}
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          
          {/* Efeitos de luz */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
          
          {/* Grid de fundo */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }} />

          {/* Conteúdo do Dashboard */}
          <div className="relative z-10 flex flex-col justify-center p-12 w-full">
            {/* Cards de métricas */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <AnimatedNumber value="R$ 284k" label="Faturamento" delay={200} />
              <AnimatedNumber value="+18.5%" label="Crescimento" delay={400} />
              <AnimatedNumber value="1.247" label="Clientes" delay={600} />
              <AnimatedNumber value="94.2%" label="Satisfação" delay={800} />
            </div>

            {/* Gráfico de linha */}
            <div 
              className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-8"
              style={{ animation: 'float 6s ease-in-out infinite' }}
            >
              <p className="text-xs text-slate-400 mb-3">Evolução Mensal</p>
              <AnimatedLineChart />
            </div>

            {/* Gráfico de barras */}
            <div 
              className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10"
              style={{ animation: 'float 6s ease-in-out 0.5s infinite' }}
            >
              <p className="text-xs text-slate-400 mb-3">Vendas por Período</p>
              <AnimatedBars />
            </div>

            {/* Texto */}
            <div className="mt-8">
              <p className="text-lg text-slate-400">
                Transforme seus dados em decisões inteligentes
              </p>
            </div>
          </div>

          {/* Partículas flutuantes */}
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-cyan-400/30 rounded-full"
              style={{
                top: `${20 + i * 15}%`,
                left: `${10 + i * 12}%`,
                animation: `float ${3 + i * 0.5}s ease-in-out ${i * 0.3}s infinite`
              }}
            />
          ))}
        </div>

        {/* Lado direito - Formulário */}
        <div className={`w-full lg:w-1/2 flex items-center justify-center p-8 bg-white ${transitioning ? 'form-transition' : ''}`}>
          <div className="w-full max-w-md">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-gray-900">
                Bem-vindo de volta
              </h1>
              <p className="text-gray-500 mt-2">
                Entre com suas credenciais para acessar
              </p>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Campo Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                  placeholder="seu@email.com"
                />
              </div>

              {/* Campo Senha */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Mensagem de Erro */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Botão Entrar */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 text-white py-3.5 px-4 rounded-xl font-medium hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner size={20} />
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn size={20} />
                    Entrar
                  </>
                )}
              </button>
            </form>

            {/* Footer discreto */}
            <div className="mt-12 pt-6 border-t border-gray-100">
              <p className="text-center text-xs text-gray-400">
                Ambiente seguro com criptografia de dados
              </p>
            </div>
          </div>
        </div>
      </div>

      {transitioning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white text-sm">Carregando seu ambiente...</p>
          </div>
        </div>
      )}
    </>
  );
}
