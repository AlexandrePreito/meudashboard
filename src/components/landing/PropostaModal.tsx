'use client';

import { useState } from 'react';
import { X, MessageSquare, Loader2 } from 'lucide-react';

interface PropostaModalProps {
  open: boolean;
  onClose: () => void;
}

export default function PropostaModal({ open, onClose }: PropostaModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    phone: '',
    usage_type: '' as '' | 'empresa_final' | 'revenda',
    groups_count: '',
    reports_count: '',
    users_count: '',
    wants_subdomain: false,
    ia_messages_per_day: '' as '' | '30' | '50' | '80' | '100+',
    alerts_per_day: '' as '' | '10' | '30' | '50' | '80' | '100+',
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!formData.company_name?.trim() || !formData.contact_name?.trim() || !formData.phone?.trim()) {
      setError('Preencha nome da empresa, contato e telefone.');
      return;
    }
    if (!formData.usage_type) {
      setError('Selecione se é empresa final ou revenda.');
      return;
    }
    if (!formData.ia_messages_per_day) {
      setError('Selecione a quantidade de mensagens de IA por dia.');
      return;
    }
    if (!formData.alerts_per_day) {
      setError('Selecione a quantidade de alertas por dia.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/leads/proposta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          groups_count: parseInt(formData.groups_count) || 0,
          reports_count: parseInt(formData.reports_count) || 0,
          users_count: parseInt(formData.users_count) || 0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar');
      }

      if (data.whatsapp_url) {
        window.open(data.whatsapp_url, '_blank');
      }
      setFormData({
        company_name: '',
        contact_name: '',
        phone: '',
        usage_type: '',
        groups_count: '',
        reports_count: '',
        users_count: '',
        wants_subdomain: false,
        ia_messages_per_day: '',
        alerts_per_day: '',
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Solicitar proposta</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da empresa *</label>
            <input
              type="text"
              name="company_name"
              value={formData.company_name}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: Minha Empresa Ltda"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome do contato *</label>
            <input
              type="text"
              name="contact_name"
              value={formData.contact_name}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Seu nome completo"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Telefone *</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="(62) 99999-9999"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">O sistema será para *</label>
            <select
              name="usage_type"
              value={formData.usage_type}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Selecione...</option>
              <option value="empresa_final">Empresa final — uso próprio da minha empresa</option>
              <option value="revenda">Revenda — vou oferecer para meus clientes</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Quantos grupos? *</label>
            <p className="text-xs text-slate-500 mb-1">Grupos representam empresas/clientes separados no sistema.</p>
            <input
              type="number"
              name="groups_count"
              value={formData.groups_count}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: 3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Quantas páginas de relatórios? *</label>
            <input
              type="number"
              name="reports_count"
              value={formData.reports_count}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: 10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Quantos usuários? *</label>
            <input
              type="number"
              name="users_count"
              value={formData.users_count}
              onChange={handleChange}
              min="0"
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: 25"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="wants_subdomain"
              name="wants_subdomain"
              checked={formData.wants_subdomain}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 rounded border-slate-300"
            />
            <label htmlFor="wants_subdomain" className="text-sm text-slate-700">
              Quero subdomínio próprio (ex: minhaempresa.meudashboard.org)
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Mensagens de IA por dia *</label>
            <p className="text-xs text-slate-500 mb-2">Consultas integradas com IA no WhatsApp sobre seus dados.</p>
            <select
              name="ia_messages_per_day"
              value={formData.ia_messages_per_day}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Selecione...</option>
              <option value="30">30</option>
              <option value="50">50</option>
              <option value="80">80</option>
              <option value="100+">+100</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Alertas por dia *</label>
            <p className="text-xs text-slate-500 mb-2">Mensagens automáticas no WhatsApp quando métricas do BI ultrapassam limites.</p>
            <select
              name="alerts_per_day"
              value={formData.alerts_per_day}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Selecione...</option>
              <option value="10">10</option>
              <option value="30">30</option>
              <option value="50">50</option>
              <option value="80">80</option>
              <option value="100+">+100</option>
            </select>
          </div>

          <div className="pt-4 flex flex-col-reverse sm:flex-row gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200/50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 flex-shrink-0" />
                  <span>Enviar</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
