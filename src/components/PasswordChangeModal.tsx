'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, X, Key, Eye, EyeOff } from 'lucide-react';
import Button from '@/components/ui/Button';

interface PasswordChangeModalProps {
  onClose: () => void;
  onPasswordChanged: () => void;
}

/**
 * Modal que força o usuário a trocar a senha padrão "123456"
 * Pode ser fechado, mas sempre reaparecerá até a senha ser alterada
 */
export default function PasswordChangeModal({ onClose, onPasswordChanged }: PasswordChangeModalProps) {
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
  const [error, setError] = useState('');

  async function handleSubmit() {
    setError('');

    if (!form.current_password || !form.new_password || !form.confirm_password) {
      setError('Preencha todos os campos');
      return;
    }

    if (form.new_password.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (form.new_password === '123456') {
      setError('A nova senha não pode ser a senha padrão "123456"');
      return;
    }

    if (form.new_password !== form.confirm_password) {
      setError('A nova senha e a confirmação não conferem');
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

      const data = await res.json();

      if (res.ok) {
        // Recarregar dados do usuário para atualizar a flag needsPasswordChange
        window.location.reload();
        onPasswordChanged();
      } else {
        setError(data.error || 'Erro ao alterar senha');
      }
    } catch (err) {
      setError('Erro ao alterar senha. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="text-orange-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Trocar Senha Obrigatória</h2>
              <p className="text-sm text-gray-500">Você está usando a senha padrão</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Fechar (você pode pular, mas será solicitado novamente)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <p className="text-sm text-orange-800">
              <strong>Importante:</strong> Por segurança, você precisa trocar a senha padrão "123456" por uma senha personalizada.
            </p>
            <p className="text-xs text-orange-700 mt-2">
              Você pode pular esta etapa, mas será solicitado novamente até alterar sua senha.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Senha Atual
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={form.current_password}
                onChange={(e) => setForm({ ...form, current_password: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Digite sua senha atual"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nova Senha
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={form.new_password}
                onChange={(e) => setForm({ ...form, new_password: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Digite sua nova senha"
              />
              <button
                type="button"
                onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              >
                {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres (não pode ser "123456")</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar Nova Senha
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={form.confirm_password}
                onChange={(e) => setForm({ ...form, confirm_password: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="Confirme sua nova senha"
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
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            disabled={saving}
          >
            Pular por agora
          </button>
          <Button
            onClick={handleSubmit}
            loading={saving}
            icon={<Key size={16} />}
            className="min-w-[140px]"
          >
            Alterar Senha
          </Button>
        </div>
      </div>
    </div>
  );
}
