'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { useSubdomain } from '@/hooks/useSubdomain';

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

function AnimatedNumber({ value, label, delay }: { value: string; label: string; delay: number }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div className={`bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 transition-all duration-700 ${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function AnimatedLineChart() {
  return (
    <svg viewBox="0 0 200 60" className="w-full h-20" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <path d="M0,45 Q30,40 60,30 T120,20 T160,25 T200,10" fill="none" stroke="url(#lineGradient)" strokeWidth="2" style={{ strokeDasharray: 300, strokeDashoffset: 300, animation: 'dashDraw 3s ease-out forwards' }} />
      <path d="M0,45 Q30,40 60,30 T120,20 T160,25 T200,10 L200,60 L0,60 Z" fill="url(#lineGradient)" opacity="0.1" />
    </svg>
  );
}

function hexToRgb(hex: string) {
  const h = hex.startsWith('#') ? hex : `#${hex}`;
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return `${r}, ${g}, ${b}`;
}

export default function LoginPage() {
  const { developerInfo, isSubdomain, loading: subLoading } = useSubdomain();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const primaryColor = isSubdomain && developerInfo?.primary_color ? developerInfo.primary_color : undefined;
  const color = primaryColor || '#3B82F6';
  const rgb = hexToRgb(color);

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
        // Invalidar cache de features para forçar nova busca com plano atualizado
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem('user-features');
        }
        if (data.user?.developer?.primary_color) {
          localStorage.setItem('theme-color', data.user.developer.primary_color);
        } else if (data.user?.group?.primary_color && data.user?.group?.use_developer_colors === false) {
          localStorage.setItem('theme-color', data.user.group.primary_color);
        }

        setTransitioning(true);
        setTimeout(() => {
          if (data.user?.isDeveloperUser && data.user?.developerId) {
            // Dev admin → redirecionar para domínio principal
            window.location.href = isSubdomain ? 'https://meudashboard.org/dev' : '/dev';
          } else if (data.user?.role === 'master') {
            window.location.href = isSubdomain ? 'https://meudashboard.org/admin' : '/admin';
          } else if (data.user?.role === 'admin' && data.user?.groupIds?.length > 0) {
            window.location.href = `/administrador/${data.user.groupIds[0]}`;
          } else {
            window.location.href = '/dashboard';
          }
        }, 800);
      } else {
        setError(data.message || 'Email ou senha inválidos');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  // Aguardar detecção de subdomínio antes de renderizar
  if (subLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-transparent" />
      </div>
    );
  }

  // ========== LAYOUT SUBDOMÍNIO ==========
  if (isSubdomain && developerInfo) {
    return (
      <>
        <div className={`min-h-screen flex items-center justify-center relative overflow-hidden p-4 ${transitioning ? 'page-transition' : ''}`}
          style={{
            background: `linear-gradient(135deg, #f0f4f8 0%, rgba(${rgb}, 0.08) 25%, #ffffff 50%, rgba(${rgb}, 0.06) 75%, #f8fafc 100%)`,
          }}
        >
          {/* Luzes em movimento - mesh gradient animado */}
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full blur-[100px] opacity-30" style={{ backgroundColor: color, animation: 'bgLightFloat1 18s ease-in-out infinite' }} />
          <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full blur-[120px] opacity-20" style={{ backgroundColor: color, animation: 'bgLightFloat2 22s ease-in-out 2s infinite' }} />
          <div className="absolute top-1/4 left-1/3 w-80 h-80 rounded-full blur-[80px] opacity-10" style={{ background: `linear-gradient(135deg, ${color}, #8b5cf6)`, animation: 'bgLightFloat3 20s ease-in-out 1s infinite' }} />
          <div className="absolute bottom-1/3 right-1/4 w-64 h-64 rounded-full blur-[90px] opacity-15" style={{ background: `linear-gradient(45deg, #06b6d4, ${color})`, animation: 'bgLightFloat4 16s ease-in-out 3s infinite' }} />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

          <div className="relative z-10 bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl shadow-black/10 p-10 max-w-md w-full text-center border border-white/80">
            {/* Logo */}
            {developerInfo.logo_url ? (
              <img src={developerInfo.logo_url} alt={developerInfo.name} className="h-14 mx-auto mb-4 object-contain" />
            ) : (
              <div className="h-14 w-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-white text-xl font-bold shadow-lg" style={{ backgroundColor: color }}>
                {developerInfo.name?.charAt(0)?.toUpperCase()}
              </div>
            )}

            <h1 className="text-2xl font-bold text-gray-900 mb-1">{developerInfo.landing_title || developerInfo.name}</h1>
            <p className="text-sm text-gray-500 mb-8">{developerInfo.landing_description || 'Acesse seus dashboards e relatórios'}</p>

            {/* Formulário real */}
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Email"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50/80 text-sm focus:outline-none transition-all placeholder:text-gray-400 disabled:opacity-50"
                  style={{ boxShadow: 'none' }}
                  onFocus={(e) => { e.target.style.borderColor = color; e.target.style.boxShadow = `0 0 0 2px ${color}30`; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="Senha"
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 bg-gray-50/80 text-sm focus:outline-none transition-all placeholder:text-gray-400 disabled:opacity-50"
                  style={{ boxShadow: 'none' }}
                  onFocus={(e) => { e.target.style.borderColor = color; e.target.style.boxShadow = `0 0 0 2px ${color}30`; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Esqueceu a senha */}
              <div className="text-right">
                <Link href="/esqueci-senha" className="text-xs hover:underline transition-colors" style={{ color }}>
                  Esqueceu a senha?
                </Link>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: color }}
              >
                {loading ? (
                  <>
                    <LoadingSpinner size={18} />
                    Entrando...
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Entrar
                  </>
                )}
              </button>
            </form>

            <p className="text-xs text-gray-300 mt-8">Ambiente seguro com criptografia de dados</p>
          </div>
        </div>

        {transitioning && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white transition-overlay">
            <div className="flex flex-col items-center gap-4 transition-spinner">
              <div className="animate-spin rounded-full h-10 w-10 border-2 border-t-transparent" style={{ borderColor: `${color} transparent ${color} ${color}` }} />
              <p className="text-slate-600 text-sm font-medium">Carregando seu ambiente...</p>
            </div>
          </div>
        )}
      </>
    );
  }

  // ========== LAYOUT PADRÃO (domínio principal) ==========
  return (
    <>
      <div className={`min-h-screen flex ${transitioning ? 'page-transition' : ''}`} suppressHydrationWarning>
        {/* Lado esquerdo - Dashboard Animado */}
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, backgroundSize: '50px 50px' }} />

          <div className="relative z-10 flex flex-col justify-center p-12 w-full">
            <div className="grid grid-cols-2 gap-4 mb-8">
              <AnimatedNumber value="R$ 284k" label="Faturamento" delay={200} />
              <AnimatedNumber value="+18.5%" label="Crescimento" delay={400} />
              <AnimatedNumber value="1.247" label="Clientes" delay={600} />
              <AnimatedNumber value="94.2%" label="Satisfação" delay={800} />
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 mb-8" style={{ animation: 'float 6s ease-in-out infinite' }}>
              <p className="text-xs text-slate-400 mb-3">Evolução Mensal</p>
              <AnimatedLineChart />
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10" style={{ animation: 'float 6s ease-in-out 0.5s infinite' }}>
              <p className="text-xs text-slate-400 mb-3">Vendas por Período</p>
              <AnimatedBars />
            </div>
            <div className="mt-8">
              <p className="text-lg text-slate-400">Transforme seus dados em decisões inteligentes</p>
            </div>
          </div>

          {[...Array(6)].map((_, i) => (
            <div key={i} className="absolute w-2 h-2 bg-cyan-400/30 rounded-full" style={{ top: `${20 + i * 15}%`, left: `${10 + i * 12}%`, animation: `float ${3 + i * 0.5}s ease-in-out ${i * 0.3}s infinite` }} />
          ))}
        </div>

        {/* Lado direito - Formulário */}
        <div className={`w-full lg:w-1/2 flex flex-col items-center justify-center p-8 bg-white ${transitioning ? 'form-transition' : ''}`}>
          <div className="w-full max-w-md">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-gray-900">Bem-vindo de volta</h1>
              <p className="text-gray-500 mt-2">Entre com suas credenciais para acessar</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                  placeholder="seu@email.com" />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} id="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading}
                    className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                    placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Esqueceu a senha */}
              <div className="text-right">
                <Link href="/esqueci-senha" className="text-xs text-blue-600 hover:text-blue-700 hover:underline transition-colors">
                  Esqueceu a senha?
                </Link>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full text-white py-3.5 px-4 rounded-xl font-medium bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                {loading ? (<><LoadingSpinner size={20} /> Entrando...</>) : (<><LogIn size={20} /> Entrar</>)}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Não tem conta?{' '}
                <Link href="/cadastro" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">Criar conta grátis</Link>
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-center text-xs text-gray-400">Ambiente seguro com criptografia de dados</p>
            </div>
          </div>
        </div>
      </div>

      {transitioning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white transition-overlay">
          <div className="flex flex-col items-center gap-4 transition-spinner">
            <svg viewBox="0 0 100 100" width={48} height={48} className="animate-spin" style={{ animationDuration: '1.5s' }}>
              <defs>
                <linearGradient id="transitionGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <g fill="url(#transitionGrad)">
                <rect x="45" y="10" width="10" height="80" rx="5" />
                <rect x="45" y="10" width="10" height="80" rx="5" transform="rotate(60 50 50)" />
                <rect x="45" y="10" width="10" height="80" rx="5" transform="rotate(120 50 50)" />
              </g>
            </svg>
            <p className="text-slate-600 text-sm font-medium">Carregando seu ambiente...</p>
          </div>
        </div>
      )}
    </>
  );
}
