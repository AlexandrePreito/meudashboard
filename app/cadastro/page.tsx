'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, UserPlus, ArrowLeft, Mail, Phone } from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

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

function AnimatedLineChart() {
  return (
    <svg viewBox="0 0 200 60" className="w-full h-20" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lineGradientCadastro" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.8" />
        </linearGradient>
      </defs>
      <path
        d="M0,45 Q30,40 60,30 T120,20 T160,25 T200,10"
        fill="none"
        stroke="url(#lineGradientCadastro)"
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
        fill="url(#lineGradientCadastro)"
        opacity="0.1"
      />
    </svg>
  );
}

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

function BrandName({ size = 'text-xl' }: { size?: string }) {
  return (
    <span className={`font-bold text-slate-900 ${size}`}>
      <span className="text-[1.2em]">M</span>eu<span className="text-[1.2em]">D</span>ashboard
    </span>
  );
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_RESENDS = 3;

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function CadastroPage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'verify'>('form');
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
    password: '',
  });
  const [code, setCode] = useState<string[]>(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const validate = () => {
    if (!formData.fullName.trim()) {
      setError('Nome completo é obrigatório');
      return false;
    }
    if (!formData.email.trim()) {
      setError('Email é obrigatório');
      return false;
    }
    if (!EMAIL_REGEX.test(formData.email.trim())) {
      setError('Formato de email inválido');
      return false;
    }
    if (!formData.phone.trim()) {
      setError('Telefone é obrigatório');
      return false;
    }
    if (formData.phone.replace(/\D/g, '').length < 10) {
      setError('Telefone deve ter pelo menos 10 dígitos');
      return false;
    }
    if (!formData.companyName.trim()) {
      setError('Nome da empresa é obrigatório');
      return false;
    }
    if (formData.companyName.trim().length < 2) {
      setError('Nome da empresa deve ter pelo menos 2 caracteres');
      return false;
    }
    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return false;
    }
    return true;
  };

  const handleSubmitForm = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.replace(/\D/g, ''),
          company_name: formData.companyName.trim(),
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setRegisteredEmail(data.email);
        setStep('verify');
        setResendCooldown(60);
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setError(data.error || 'Erro ao criar conta. Tente novamente.');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || resendCount >= MAX_RESENDS) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: formData.fullName.trim(),
          email: formData.email.trim().toLowerCase(),
          phone: formData.phone.replace(/\D/g, ''),
          company_name: formData.companyName.trim(),
          password: formData.password,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResendCount((c) => c + 1);
        setResendCooldown(60);
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setError(data.error || 'Erro ao reenviar código.');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      setError('Digite o código completo de 6 dígitos');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail, code: fullCode }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setTransitioning(true);
        setTimeout(() => router.push('/dev'), 800);
      } else {
        setError(data.error || 'Código inválido ou expirado.');
      }
    } catch (err) {
      setError('Erro ao conectar com o servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newCode = [...code];
      digits.forEach((d, i) => {
        if (index + i < 6) newCode[index + i] = d;
      });
      setCode(newCode);
      const nextIdx = Math.min(index + digits.length, 5);
      inputRefs.current[nextIdx]?.focus();
      return;
    } else if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <>
      <div className={`min-h-screen flex ${transitioning ? 'page-transition' : ''}`} suppressHydrationWarning>
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
              <p className="text-lg text-slate-400">Seus dados, suas decisões</p>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="px-2.5 py-1 bg-white/10 rounded-lg text-xs text-slate-300">📊 Power BI</span>
                <span className="px-2.5 py-1 bg-white/10 rounded-lg text-xs text-slate-300">🧠 IA</span>
                <span className="px-2.5 py-1 bg-white/10 rounded-lg text-xs text-slate-300">🔔 Alertas</span>
              </div>
            </div>
          </div>
        </div>

        <div className={`w-full lg:w-1/2 flex items-center justify-center p-8 bg-white ${transitioning ? 'form-transition' : ''}`}>
          <div className="w-full max-w-md">
            <div className="mb-8">
              <BrandName size="text-lg" />
              <h1 className="text-2xl font-semibold text-gray-900 mt-4">
                {step === 'form' ? 'Crie sua conta grátis' : 'Confirme seu email'}
              </h1>
              <p className="text-gray-500 mt-2">
                {step === 'form' ? 'Comece a monitorar seus dashboards em minutos' : `Enviamos um código de 6 dígitos para ${registeredEmail}`}
              </p>
              {step === 'verify' && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700 mt-3">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Não encontrou? Verifique sua <strong>caixa de spam</strong> ou <strong>lixo eletrônico</strong>.</span>
                </div>
              )}
            </div>

            {step === 'form' ? (
              <form onSubmit={handleSubmitForm} className="space-y-5">
                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo</label>
                  <input
                    type="text"
                    id="full_name"
                    value={formData.fullName}
                    onChange={(e) => setFormData((f) => ({ ...f, fullName: e.target.value }))}
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                    placeholder="João Silva"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                    placeholder="seu@email.com"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">Telefone / WhatsApp</label>
                  <div className="relative">
                    <input
                      type="tel"
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData((f) => ({ ...f, phone: formatPhone(e.target.value) }))}
                      required
                      disabled={loading}
                      className="w-full px-4 py-3 pl-11 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                      placeholder="(11) 99999-9999"
                    />
                    <Phone size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1.5">Nome da empresa</label>
                  <input
                    type="text"
                    id="company_name"
                    value={formData.companyName}
                    onChange={(e) => setFormData((f) => ({ ...f, companyName: e.target.value }))}
                    required
                    disabled={loading}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                    placeholder="Minha Empresa Ltda"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={formData.password}
                      onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
                      required
                      disabled={loading}
                      minLength={6}
                      className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed transition-all"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                {/* Aceite dos termos */}
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="aceite-termos"
                    required
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                  />
                  <label htmlFor="aceite-termos" className="text-xs text-gray-500 leading-relaxed cursor-pointer">
                    Ao criar sua conta, você concorda com os{' '}
                    <Link href="/termos-de-uso" target="_blank" className="text-blue-600 hover:underline">Termos de Uso</Link>
                    {' '}e a{' '}
                    <Link href="/politica-de-privacidade" target="_blank" className="text-blue-600 hover:underline">Política de Privacidade</Link>
                    {' '}do MeuDashboard.
                  </label>
                </div>

                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-slate-900 text-white py-3.5 px-4 rounded-xl font-medium hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <><LoadingSpinner size={20} /> Enviando código...</> : <><UserPlus size={20} /> Continuar</>}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerification} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Código de verificação</label>
                  <div className="flex gap-2 justify-center">
                    {code.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        value={digit}
                        onChange={(e) => handleCodeChange(i, e.target.value)}
                        onKeyDown={(e) => handleCodeKeyDown(i, e)}
                        disabled={loading}
                        className="w-12 h-14 text-center text-xl font-bold border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent disabled:bg-gray-100"
                      />
                    ))}
                  </div>
                </div>
                {error && (
                  <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading || code.join('').length !== 6}
                  className="w-full bg-slate-900 text-white py-3.5 px-4 rounded-xl font-medium hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                >
                  {loading ? <><LoadingSpinner size={20} /> Verificando...</> : <>Verificar</>}
                </button>
                <div className="flex flex-col items-center gap-2 text-sm">
                  {resendCount < MAX_RESENDS ? (
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={resendCooldown > 0 || loading}
                      className="text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      <Mail size={16} />
                      {resendCooldown > 0
                        ? `Reenviar em ${resendCooldown}s`
                        : `Reenviar código (${MAX_RESENDS - resendCount} restantes)`}
                    </button>
                  ) : (
                    <p className="text-sm text-red-500">
                      Limite de reenvios atingido. Volte e tente novamente.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => { setStep('form'); setError(''); }}
                    disabled={loading}
                    className="text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  >
                    <ArrowLeft size={16} />
                    Voltar para alterar email
                  </button>
                </div>
              </form>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">✓ 5 grupos grátis</span>
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">✓ 15 usuários</span>
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">✓ 15 dashboards</span>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Já tem conta?{' '}
                <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">Fazer login</Link>
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
                <linearGradient id="transitionGradCadastro" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" />
                  <stop offset="50%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#8b5cf6" />
                </linearGradient>
              </defs>
              <g fill="url(#transitionGradCadastro)">
                <rect x="45" y="10" width="10" height="80" rx="5" />
                <rect x="45" y="10" width="10" height="80" rx="5" transform="rotate(60 50 50)" />
                <rect x="45" y="10" width="10" height="80" rx="5" transform="rotate(120 50 50)" />
              </g>
            </svg>
            <p className="text-slate-600 text-sm font-medium">Configurando seu ambiente...</p>
          </div>
        </div>
      )}
    </>
  );
}
