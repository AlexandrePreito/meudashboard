'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import Button from '@/components/ui/Button';
import { User, Mail, Phone, Building2, Shield, Calendar, Clock, Save, Key, MessageSquare, Bell, Send } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  is_master: boolean;
  created_at: string;
  last_login_at: string | null;
  memberships: {
    role: string;
    company_group: { 
      id: string; 
      name: string;
      plan?: { name: string } | null;
    } | null;
  }[];
}

interface UsageData {
  ai_questions_today: number;
  max_ai_questions_per_day: number;
  ai_alerts_this_month: number;
  max_ai_alerts_per_month: number;
  whatsapp_messages_this_month: number;
  max_whatsapp_messages_per_month: number;
  plan_name: string;
}

export default function PerfilPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [form, setForm] = useState({
    full_name: '',
    phone: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [userRes, usageRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/usage/dashboard')
      ]);

      if (userRes.ok) {
        const data = await userRes.json();
        setUser(data.user);
        setForm({
          full_name: data.user?.full_name || '',
          phone: data.user?.phone || ''
        });
      }

      if (usageRes.ok) {
        const data = await usageRes.json();
        setUsage(data);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!form.full_name) {
      alert('Nome é obrigatório');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.full_name,
          phone: form.phone || null
        })
      });

      if (res.ok) {
        alert('Perfil atualizado com sucesso!');
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao atualizar');
      }
    } catch (err) {
      alert('Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function formatLimit(value: number) {
    return value >= 999999 ? '∞' : value.toString();
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  const group = user?.memberships?.[0]?.company_group;
  const role = user?.is_master ? 'Master' : user?.memberships?.[0]?.role || 'Usuário';

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Dados</h1>
          <p className="text-gray-500 text-sm mt-1">Gerencie suas informações pessoais</p>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dados Pessoais - Editáveis */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User size={20} className="text-gray-400" />
              Dados Pessoais
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2">
                <Button onClick={handleSave} loading={saving} icon={<Save size={16} />}>
                  Salvar Alterações
                </Button>
              </div>
            </div>
          </div>

          {/* Dados do Sistema - Somente Leitura */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Shield size={20} className="text-gray-400" />
              Informações da Conta
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Mail size={18} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Building2 size={18} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Grupo</p>
                  <p className="text-sm font-medium text-gray-900">{group?.name || 'Nenhum'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Shield size={18} className="text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Perfil</p>
                  <p className="text-sm font-medium text-gray-900">{role}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Calendar size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Cadastro</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(user?.created_at || null)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <Clock size={18} className="text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Último Acesso</p>
                    <p className="text-sm font-medium text-gray-900">{formatDate(user?.last_login_at || null)}</p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button onClick={() => router.push('/trocar-senha')} variant="secondary" icon={<Key size={16} />}>
                  Trocar Senha
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Uso do Plano */}
        {usage && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Uso do Plano: <span className="text-primary">{usage.plan_name}</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare size={18} className="text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Perguntas IA (hoje)</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {usage.ai_questions_today}
                  <span className="text-sm font-normal text-gray-400">/{formatLimit(usage.max_ai_questions_per_day)}</span>
                </p>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 rounded-full"
                    style={{ width: `${Math.min((usage.ai_questions_today / usage.max_ai_questions_per_day) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Bell size={18} className="text-yellow-600" />
                  <span className="text-sm font-medium text-gray-700">Alertas (mês)</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {usage.ai_alerts_this_month}
                  <span className="text-sm font-normal text-gray-400">/{formatLimit(usage.max_ai_alerts_per_month)}</span>
                </p>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-yellow-600 rounded-full"
                    style={{ width: `${Math.min((usage.ai_alerts_this_month / usage.max_ai_alerts_per_month) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Send size={18} className="text-green-600" />
                  <span className="text-sm font-medium text-gray-700">WhatsApp (mês)</span>
                </div>
                <p className="text-2xl font-bold text-gray-900">
                  {usage.whatsapp_messages_this_month}
                  <span className="text-sm font-normal text-gray-400">/{formatLimit(usage.max_whatsapp_messages_per_month)}</span>
                </p>
                <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-600 rounded-full"
                    style={{ width: `${Math.min((usage.whatsapp_messages_this_month / usage.max_whatsapp_messages_per_month) * 100, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </MainLayout>
  );
}
