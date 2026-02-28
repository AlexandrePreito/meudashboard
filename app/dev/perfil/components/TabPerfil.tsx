'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { Mail, Phone, Building2, Save, Loader2, Upload, Trash2, Camera } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface TabPerfilProps {
  profile: {
    name: string;
    email: string;
    phone?: string;
    logo_url?: string;
  };
  onSaved?: () => void;
}

export default function TabPerfil({ profile, onSaved }: TabPerfilProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: profile.name || '',
    email: profile.email || '',
    phone: profile.phone || '',
    logo_url: profile.logo_url || '',
  });

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }
    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('type', 'developer');
      const res = await fetch('/api/upload/logo', { method: 'POST', body: formDataUpload });
      if (res.ok) {
        const result = await res.json();
        setFormData(prev => ({ ...prev, logo_url: result.url }));
        toast.success('Logo enviada com sucesso!');
      } else {
        const result = await res.json();
        toast.error(result.error || 'Erro no upload');
      }
    } catch {
      toast.error('Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  }

  function handleRemoveLogo() {
    setFormData(prev => ({ ...prev, logo_url: '' }));
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      toast.error('O nome é obrigatório');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/dev/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone,
          logo_url: formData.logo_url || null,
        }),
      });
      if (res.ok) {
        toast.success('Perfil atualizado com sucesso!');
        onSaved?.();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao salvar');
      }
    } catch {
      toast.error('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card-modern p-6 space-y-6">
      {/* Header com avatar/logo e upload */}
      <div className="flex items-center gap-4 pb-6 border-b border-gray-100">
        <div className="relative group">
          {formData.logo_url ? (
            <div className="w-16 h-16 rounded-2xl border-2 border-gray-100 overflow-hidden bg-white shadow-lg">
              <img src={formData.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="text-2xl font-bold text-white">
                {formData.name?.charAt(0)?.toUpperCase() || 'D'}
              </span>
            </div>
          )}
          {/* Overlay de upload no hover */}
          <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            {uploading ? (
              <Loader2 size={20} className="text-white animate-spin" />
            ) : (
              <Camera size={20} className="text-white" />
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onChange={handleLogoUpload}
              disabled={uploading}
              className="hidden"
            />
          </label>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900">{formData.name || 'Developer'}</h3>
          <p className="text-sm text-gray-500">{formData.email}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <label className="cursor-pointer text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors flex items-center gap-1">
              <Upload size={12} />
              {uploading ? 'Enviando...' : 'Alterar logo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                onChange={handleLogoUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            {formData.logo_url && (
              <button
                onClick={handleRemoveLogo}
                className="text-xs text-red-500 hover:text-red-600 transition-colors flex items-center gap-1"
              >
                <Trash2 size={12} />
                Remover
              </button>
            )}
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">PNG, JPG, WebP ou SVG. Max 2MB.</p>
        </div>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Building2 size={16} className="text-gray-400" />
          Nome da Empresa
        </label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          placeholder="Minha Software House"
        />
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Mail size={16} className="text-gray-400" />
          Email
        </label>
        <input
          type="email"
          value={formData.email}
          disabled
          className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
        />
        <p className="text-xs text-gray-400 mt-1">O email não pode ser alterado</p>
      </div>

      <div>
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
          <Phone size={16} className="text-gray-400" />
          Telefone
        </label>
        <input
          type="tel"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          placeholder="(62) 99999-9999"
        />
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-100">
        <Button
          onClick={handleSave}
          disabled={saving}
          icon={saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
        >
          {saving ? 'Salvando...' : 'Salvar Perfil'}
        </Button>
      </div>
    </div>
  );
}
