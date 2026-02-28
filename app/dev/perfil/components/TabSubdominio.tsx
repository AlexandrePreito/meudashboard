'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { useToast } from '@/contexts/ToastContext';
import { useFeatures } from '@/hooks/useFeatures';
import {
  Globe, Upload, Palette, Type, AlignLeft, Image,
  Save, Loader2, Lock, Sparkles, ArrowRight, Building2,
  Eye, Check, X
} from 'lucide-react';

interface SubdomainData {
  subdomain: string;
  subdomain_enabled: boolean;
  subdomain_approved: boolean;
  landing_title: string;
  landing_description: string;
  landing_background_url: string;
  logo_url: string;
  primary_color: string;
}

interface TabSubdominioProps {
  data: SubdomainData;
  developerName: string;
  subdomainAllowed?: boolean;
  onChange: (data: SubdomainData) => void;
  onSaved?: () => void;
}

const DEFAULT_TITLE = 'Bem-vindo ao nosso painel';
const DEFAULT_DESCRIPTION = 'Acesse seus dashboards e relatórios de forma rápida e segura.';

export default function TabSubdominio({ data, developerName, subdomainAllowed, onChange, onSaved }: TabSubdominioProps) {
  const toast = useToast();
  const { isFree } = useFeatures();
  const isBlocked = !subdomainAllowed || isFree;
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  const previewTitle = data.landing_title || DEFAULT_TITLE;
  const previewDescription = data.landing_description || DEFAULT_DESCRIPTION;
  const previewColor = data.primary_color || '#3b82f6';
  const previewSlug = data.subdomain || 'suaempresa';

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
        onChange({ ...data, logo_url: result.url });
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
    onChange({ ...data, logo_url: '' });
  }

  async function checkSlugAvailability(slug: string) {
    if (!slug || slug.length < 3) { setSlugAvailable(null); return; }
    setCheckingSlug(true);
    try {
      const res = await fetch(`/api/subdomain/check-availability?slug=${encodeURIComponent(slug)}`);
      const result = await res.json().catch(() => ({}));
      if (res.ok) {
        setSlugAvailable(result.available);
      } else if (result.available === false) {
        setSlugAvailable(false);
      } else {
        setSlugAvailable(null);
      }
    } catch { setSlugAvailable(null); }
    finally { setCheckingSlug(false); }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const profileRes = await fetch('/api/dev/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_url: data.logo_url || null, primary_color: data.primary_color || '#3b82f6' }),
      });
      const subRes = await fetch('/api/dev/subdomain', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: data.subdomain || null,
          landing_title: data.landing_title || null,
          landing_description: data.landing_description || null,
          landing_background_url: data.landing_background_url || null,
        }),
      });
      if (profileRes.ok && subRes.ok) {
        toast.success('Configurações salvas! Aguarde aprovação do administrador.');
        onSaved?.();
      } else {
        const err = await subRes.json().catch(() => ({}));
        toast.error(err.error || 'Erro ao salvar');
      }
    } catch { toast.error('Erro ao salvar configurações'); }
    finally { setSaving(false); }
  }

  function StatusBadge() {
    if (!data.subdomain) return <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">Não configurado</span>;
    if (data.subdomain_enabled && data.subdomain_approved) return <span className="inline-flex items-center gap-1 text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full"><Check size={12} /> Ativo</span>;
    if (data.subdomain_enabled && !data.subdomain_approved) return <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full"><Loader2 size={12} className="animate-spin" /> Aguardando aprovação</span>;
    return <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">Desativado</span>;
  }

  return (
    <div className="relative">
      {isBlocked && (
        <div className="absolute inset-0 bg-white/80 backdrop-blur-[2px] z-10 rounded-2xl flex flex-col items-center justify-center gap-3">
          <div className="bg-slate-100 rounded-full p-4">
            <Lock className="w-7 h-7 text-slate-400" />
          </div>
          {!subdomainAllowed ? (
            <>
              <p className="text-sm font-semibold text-slate-700">Subdomínio não habilitado</p>
              <p className="text-xs text-slate-500 text-center max-w-xs">Entre em contato com o administrador para solicitar a ativação do subdomínio.</p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-slate-700">Subdomínio disponível no plano Pro</p>
              <p className="text-xs text-slate-500 text-center max-w-xs">Tenha seu endereço personalizado com logo, cores e landing page própria</p>
              <a
                href="https://wa.me/5562982289559?text=Olá!%20Tenho%20interesse%20em%20fazer%20upgrade%20do%20meu%20plano%20no%20MeuDashboard."
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all mt-1"
              >
                <Sparkles className="w-4 h-4" /> Fazer upgrade <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </>
          )}
        </div>
      )}

      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 ${isBlocked ? 'pointer-events-none opacity-60' : ''}`}>
        <div className="card-modern p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <Eye size={16} /> Preview ao vivo
            </div>
            <StatusBadge />
          </div>

          <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="bg-gray-100 px-3 py-2 flex items-center gap-2 border-b border-gray-200">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 bg-white rounded-md px-3 py-1 text-xs text-gray-500 font-mono flex items-center gap-1.5">
                <Lock size={10} className="text-emerald-500" />
                {previewSlug}.meudashboard.org/login
              </div>
            </div>

            <div
              className="relative min-h-[360px] flex flex-col items-center justify-center p-8"
              style={{
                background: data.landing_background_url
                  ? `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${data.landing_background_url}) center/cover`
                  : `linear-gradient(135deg, ${previewColor}08 0%, ${previewColor}15 50%, ${previewColor}05 100%)`,
              }}
            >
              {!data.landing_background_url && (
                <>
                  <div className="absolute top-4 right-4 w-32 h-32 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: previewColor }} />
                  <div className="absolute bottom-4 left-4 w-24 h-24 rounded-full opacity-15 blur-2xl" style={{ backgroundColor: previewColor }} />
                </>
              )}

              <div className="relative bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 w-full max-w-[280px] space-y-4">
                <div className="flex flex-col items-center gap-3">
                  {data.logo_url ? (
                    <img src={data.logo_url} alt="Logo" className="h-12 w-auto object-contain" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: previewColor }}>
                      <span className="text-white font-bold text-lg">{developerName?.charAt(0)?.toUpperCase() || 'D'}</span>
                    </div>
                  )}
                  <div className="text-center">
                    <h3 className="font-bold text-sm" style={{ color: data.landing_background_url ? '#1f2937' : previewColor }}>{previewTitle}</h3>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">{previewDescription}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-8 bg-gray-100 rounded-lg border border-gray-200 px-2 flex items-center">
                    <span className="text-[9px] text-gray-400">Email</span>
                  </div>
                  <div className="h-8 bg-gray-100 rounded-lg border border-gray-200 px-2 flex items-center">
                    <span className="text-[9px] text-gray-400">Senha</span>
                  </div>
                </div>
                <div className="h-8 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundColor: previewColor }}>
                  <span className="text-[10px] font-semibold text-white">Entrar</span>
                </div>
              </div>
              <p className="text-[9px] text-gray-400 mt-4">Powered by <span className="font-semibold text-gray-500">MeuDashboard</span></p>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center">Este é o preview de como ficará a tela de login dos seus viewers</p>
        </div>

        <div className="card-modern p-6 space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Globe size={16} className="text-gray-400" /> Endereço do subdomínio
            </label>
            <div className="flex items-center gap-1">
              <input
                type="text" value={data.subdomain}
                onChange={(e) => { const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''); onChange({ ...data, subdomain: val }); setSlugAvailable(null); }}
                onBlur={() => checkSlugAvailability(data.subdomain)}
                className="w-40 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm transition-all"
                placeholder="suaempresa" maxLength={50}
              />
              <span className="text-sm text-gray-500">.meudashboard.org</span>
              {checkingSlug && <Loader2 size={14} className="animate-spin text-gray-400" />}
              {slugAvailable === true && <Check size={16} className="text-emerald-500" />}
              {slugAvailable === false && <X size={16} className="text-red-500" />}
            </div>
            {slugAvailable === false && <p className="text-xs text-red-500 mt-1">Este subdomínio já está em uso</p>}
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Image size={16} className="text-gray-400" /> Logo da entrada
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden bg-gray-50 shrink-0">
                {data.logo_url ? (
                  <img src={data.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <Building2 size={24} className="text-gray-300" />
                )}
              </div>
              <div className="space-y-2">
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 border border-gray-200 transition-colors text-sm">
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {uploading ? 'Enviando...' : 'Escolher imagem'}
                  </div>
                  <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" onChange={handleLogoUpload} disabled={uploading} className="hidden" />
                </label>
                {data.logo_url && (
                  <button onClick={handleRemoveLogo} className="text-xs text-red-500 hover:text-red-600 transition-colors">Remover logo</button>
                )}
                <p className="text-xs text-gray-400">PNG, JPG, WebP ou SVG. Max 2MB.</p>
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Palette size={16} className="text-gray-400" /> Cor primária
            </label>
            <div className="flex items-center gap-3">
              <input type="color" value={data.primary_color || '#3b82f6'} onChange={(e) => onChange({ ...data, primary_color: e.target.value })} className="w-12 h-12 rounded-xl border border-gray-200 cursor-pointer" />
              <input type="text" value={data.primary_color || '#3b82f6'} onChange={(e) => onChange({ ...data, primary_color: e.target.value })} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm transition-all" placeholder="#3b82f6" />
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Usada nos botões, links e destaques da landing</p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Type size={16} className="text-gray-400" /> Título da landing
            </label>
            <input type="text" value={data.landing_title} onChange={(e) => onChange({ ...data, landing_title: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder={DEFAULT_TITLE} maxLength={100} />
            <p className="text-xs text-gray-400 mt-1">{data.landing_title ? `${data.landing_title.length}/100` : `Padrão: "${DEFAULT_TITLE}"`}</p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <AlignLeft size={16} className="text-gray-400" /> Descrição
            </label>
            <textarea value={data.landing_description} onChange={(e) => onChange({ ...data, landing_description: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all resize-none" rows={3} placeholder={DEFAULT_DESCRIPTION} maxLength={500} />
            <p className="text-xs text-gray-400 mt-1">{data.landing_description ? `${data.landing_description.length}/500` : `Padrão: "${DEFAULT_DESCRIPTION}"`}</p>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Image size={16} className="text-gray-400" /> Imagem de fundo (opcional)
            </label>
            <input type="url" value={data.landing_background_url} onChange={(e) => onChange({ ...data, landing_background_url: e.target.value })} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all" placeholder="https://..." />
          </div>

          <div className="flex justify-end pt-4 border-t border-gray-100">
            <Button onClick={handleSave} disabled={saving} icon={saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}>
              {saving ? 'Salvando...' : 'Salvar configurações'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
