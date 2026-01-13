'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';
import { Building2, Palette, Image, Save, Loader2, Upload } from 'lucide-react';

interface DeveloperProfile {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
}

export default function DevPerfilPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [profile, setProfile] = useState<DeveloperProfile | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    logo_url: '',
    primary_color: '#0ea5e9'
  });

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const res = await fetch('/api/dev/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data.developer);
        setFormData({
          name: data.developer.name || '',
          logo_url: data.developer.logo_url || '',
          primary_color: data.developer.primary_color || '#0ea5e9'
        });
        setLogoPreview(data.developer.logo_url || null);
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast.error('Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);
      formDataUpload.append('type', 'developer');

      const res = await fetch('/api/upload/logo', {
        method: 'POST',
        body: formDataUpload
      });

      if (res.ok) {
        const data = await res.json();
        setFormData({ ...formData, logo_url: data.url });
        setLogoPreview(data.url);
        toast.success('Logo enviada com sucesso!');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro no upload');
      }
    } catch (err) {
      toast.error('Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/dev/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        toast.success('Perfil atualizado com sucesso!');
        // Recarregar pagina para atualizar header
        window.location.reload();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Erro ao salvar');
      }
    } catch (error) {
      toast.error('Erro ao salvar perfil');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Perfil do Desenvolvedor</h1>
            <p className="text-gray-500 mt-1">Configure a identidade visual da sua software house</p>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
          {/* Nome */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Building2 size={16} />
              Nome da Empresa
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Minha Software House"
            />
          </div>

          {/* Logo Upload */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Image size={16} />
              Logo da Empresa
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Building2 size={24} className="text-gray-400" />
                )}
              </div>
              <div>
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                    {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                    {uploading ? 'Enviando...' : 'Escolher imagem'}
                  </div>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1">JPG, PNG, WebP ou SVG. Max 2MB.</p>
              </div>
            </div>
          </div>

          {/* Cor Primaria */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Palette size={16} />
              Cor Primaria
            </label>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="w-12 h-12 rounded-lg border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={formData.primary_color}
                onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                placeholder="#0ea5e9"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Esta cor sera usada no header e elementos de destaque
            </p>
          </div>

          {/* Preview */}
          <div className="border-t pt-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Preview do Header:</p>
            <div 
              className="flex items-center gap-3 p-4 rounded-lg"
              style={{ backgroundColor: formData.primary_color + '10' }}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="h-8 w-auto" />
              ) : (
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: formData.primary_color }}
                >
                  <Building2 size={16} className="text-white" />
                </div>
              )}
              <span 
                className="text-lg font-bold"
                style={{ color: formData.primary_color }}
              >
                {formData.name || 'Minha Software House'}
              </span>
            </div>
          </div>

          {/* Botao Salvar */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleSave}
              disabled={saving}
              icon={saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}