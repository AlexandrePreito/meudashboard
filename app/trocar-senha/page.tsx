'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import { Key, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function TrocarSenhaPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [form, setForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });

  async function handleSubmit() {
    if (!form.current_password || !form.new_password || !form.confirm_password) {
      alert('Preencha todos os campos');
      return;
    }

    if (form.new_password.length < 6) {
      alert('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (form.new_password !== form.confirm_password) {
      alert('A nova senha e a confirmação não conferem');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_password: form.current_password,
          new_password: form.new_password
        })
      });

      if (res.ok) {
        alert('Senha alterada com sucesso!');
        router.push('/perfil');
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao alterar senha');
      }
    } catch (err) {
      alert('Erro ao alterar senha');
    } finally {
      setSaving(false);
    }
  }

  return (
    <MainLayout>
      <div className="max-w-md mx-auto space-y-6 -mt-12">
        <div>
          <button
            onClick={() => router.push('/perfil')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft size={18} />
            Voltar
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Trocar Senha</h1>
          <p className="text-gray-500 text-sm mt-1">Digite sua senha atual e escolha uma nova</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={form.current_password}
                onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <Button onClick={handleSubmit} loading={saving} icon={<Key size={16} />} className="w-full">
              Alterar Senha
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
