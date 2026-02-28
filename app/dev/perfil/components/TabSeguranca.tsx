'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';
import { Shield, Eye, EyeOff, Save, Loader2, KeyRound, AlertTriangle } from 'lucide-react';

export default function TabSeguranca() {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [formData, setFormData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  function togglePasswordVisibility(field: 'current' | 'new' | 'confirm') {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  }

  function validateForm(): string | null {
    if (!formData.currentPassword) return 'Informe a senha atual';
    if (!formData.newPassword) return 'Informe a nova senha';
    if (formData.newPassword.length < 6) return 'A nova senha deve ter pelo menos 6 caracteres';
    if (formData.newPassword !== formData.confirmPassword) return 'As senhas não coincidem';
    if (formData.currentPassword === formData.newPassword) return 'A nova senha deve ser diferente da atual';
    return null;
  }

  async function handleSave() {
    const error = validateForm();
    if (error) { toast.error(error); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/dev/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: formData.currentPassword, newPassword: formData.newPassword }),
      });
      if (res.ok) {
        toast.success('Senha alterada com sucesso!');
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao alterar senha');
      }
    } catch { toast.error('Erro ao alterar senha'); }
    finally { setSaving(false); }
  }

  function getPasswordStrength(password: string) {
    if (!password) return { label: '', color: '', width: '0%' };
    let score = 0;
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    if (score <= 1) return { label: 'Fraca', color: 'bg-red-500', width: '20%' };
    if (score <= 2) return { label: 'Razoável', color: 'bg-amber-500', width: '40%' };
    if (score <= 3) return { label: 'Boa', color: 'bg-blue-500', width: '60%' };
    if (score <= 4) return { label: 'Forte', color: 'bg-emerald-500', width: '80%' };
    return { label: 'Muito forte', color: 'bg-emerald-600', width: '100%' };
  }

  const strength = getPasswordStrength(formData.newPassword);

  return (
    <div className="card-modern p-6 space-y-6 max-w-xl">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-md shadow-blue-500/20">
          <Shield size={20} className="text-white" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">Alterar Senha</h3>
          <p className="text-xs text-gray-500">Mantenha sua conta segura com uma senha forte</p>
        </div>
      </div>

      {/* Senha Atual */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <KeyRound size={16} className="text-gray-400" /> Senha atual
        </label>
        <div className="relative">
          <input type={showPasswords.current ? 'text' : 'password'} value={formData.currentPassword} onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })} className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="••••••••" />
          <button type="button" onClick={() => togglePasswordVisibility('current')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
            {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>

      {/* Nova Senha */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <KeyRound size={16} className="text-gray-400" /> Nova senha
        </label>
        <div className="relative">
          <input type={showPasswords.new ? 'text' : 'password'} value={formData.newPassword} onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })} className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="••••••••" />
          <button type="button" onClick={() => togglePasswordVisibility('new')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
            {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {formData.newPassword && (
          <div className="mt-2 space-y-1">
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${strength.color}`} style={{ width: strength.width }} />
            </div>
            <p className="text-xs text-gray-500">Força: <span className="font-medium">{strength.label}</span></p>
          </div>
        )}
      </div>

      {/* Confirmar Senha */}
      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <KeyRound size={16} className="text-gray-400" /> Confirmar nova senha
        </label>
        <div className="relative">
          <input type={showPasswords.confirm ? 'text' : 'password'} value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="••••••••" />
          <button type="button" onClick={() => togglePasswordVisibility('confirm')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
            {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
          <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle size={12} /> As senhas não coincidem</p>
        )}
      </div>

      {/* Dicas */}
      <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700 space-y-1">
        <p className="font-semibold">Dicas para uma senha forte:</p>
        <p>• No mínimo 6 caracteres (recomendado 10+)</p>
        <p>• Misture letras maiúsculas e minúsculas</p>
        <p>• Inclua números e caracteres especiais</p>
      </div>

      {/* Salvar */}
      <div className="flex justify-end pt-4 border-t border-gray-100">
        <Button onClick={handleSave} disabled={saving} icon={saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}>
          {saving ? 'Salvando...' : 'Alterar Senha'}
        </Button>
      </div>
    </div>
  );
}
