'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, ArrowLeft, CheckCircle, Loader2, Eye, EyeOff, AlertTriangle } from 'lucide-react';

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Token inválido
  if (!token) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-7 h-7 text-amber-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Link inválido</h2>
        <p className="text-sm text-gray-500 mb-6">
          Este link de redefinição é inválido ou expirou. Solicite um novo.
        </p>
        <Link
          href="/esqueci-senha"
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-slate-800 transition-all"
        >
          Solicitar novo link
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (password === '123456') {
      setError('Escolha uma senha diferente da padrão.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess(true);
      } else {
        setError(data.error || 'Erro ao redefinir senha.');
      }
    } catch {
      setError('Erro ao conectar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-4">
        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-7 h-7 text-emerald-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Senha redefinida!</h2>
        <p className="text-sm text-gray-500 mb-6">
          Sua senha foi alterada com sucesso. Agora você pode fazer login.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-medium text-sm hover:bg-slate-800 transition-all"
        >
          Ir para o login
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="text-center mb-8">
        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock className="w-7 h-7 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Nova senha</h1>
        <p className="text-sm text-gray-500 mt-2">
          Crie uma nova senha para sua conta.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
            Nova senha
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full px-4 py-3 pr-12 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all text-sm"
              placeholder="Mínimo 6 caracteres"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1.5">
            Confirmar nova senha
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            id="confirm"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 transition-all text-sm"
            placeholder="Repita a nova senha"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
        >
          {loading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Redefinindo...
            </>
          ) : (
            <>
              <Lock size={18} />
              Redefinir senha
            </>
          )}
        </button>
      </form>
    </>
  );
}

export default function RedefinirSenhaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="bg-white rounded-2xl shadow-xl shadow-black/5 p-8 max-w-md w-full border border-slate-100">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          }
        >
          <ResetForm />
        </Suspense>

        <div className="mt-6 pt-6 border-t border-gray-100 text-center">
          <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft size={16} />
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
}
