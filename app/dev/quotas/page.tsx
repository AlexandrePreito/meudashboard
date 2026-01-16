'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/contexts/ToastContext';
import {
  ArrowUpDown,
  Users,
  Monitor,
  Bell,
  MessageSquare,
  Sparkles,
  RefreshCw,
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface Group {
  id: string;
  name: string;
  quota_users: number | null;
  quota_screens: number | null;
  quota_alerts: number | null;
  quota_whatsapp_per_day: number | null;
  quota_ai_credits_per_day: number | null;
  used_users: number;
  used_screens: number;
}

interface DeveloperPlan {
  max_users: number;
  max_screens: number;
  max_alerts: number;
  max_whatsapp_messages_per_day: number;
  max_ai_credits_per_day: number;
  ai_enabled: boolean;
}

interface QuotaSummary {
  users: { total: number; allocated: number; available: number };
  screens: { total: number; allocated: number; available: number };
  alerts: { total: number; allocated: number; available: number };
  whatsapp: { total: number; allocated: number; available: number };
  ai: { total: number; allocated: number; available: number };
}

export default function DevQuotasPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [plan, setPlan] = useState<DeveloperPlan | null>(null);
  const [quotas, setQuotas] = useState<Record<string, any>>({});
  const [summary, setSummary] = useState<QuotaSummary | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (plan && groups.length > 0) {
      calculateSummary();
    }
  }, [quotas, plan, groups]);

  async function loadData() {
    try {
      const res = await fetch('/api/dev/quotas');
      if (res.status === 403) {
        router.push('/dashboard');
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
        setPlan(data.plan);
        
        // Inicializar quotas com valores atuais
        const initialQuotas: Record<string, any> = {};
        (data.groups || []).forEach((g: Group) => {
          initialQuotas[g.id] = {
            quota_users: g.quota_users || 0,
            quota_screens: g.quota_screens || 0,
            quota_alerts: g.quota_alerts || 0,
            quota_whatsapp_per_day: g.quota_whatsapp_per_day || 0,
            quota_ai_credits_per_day: g.quota_ai_credits_per_day || 0,
          };
        });
        setQuotas(initialQuotas);
      }
    } catch (error) {
      console.error('Erro ao carregar:', error);
      showToast('Erro ao carregar dados', 'error');
    } finally {
      setLoading(false);
    }
  }

  function calculateSummary() {
    if (!plan) return;

    const allocated = {
      users: 0,
      screens: 0,
      alerts: 0,
      whatsapp: 0,
      ai: 0,
    };

    Object.values(quotas).forEach((q: any) => {
      allocated.users += q.quota_users || 0;
      allocated.screens += q.quota_screens || 0;
      allocated.alerts += q.quota_alerts || 0;
      allocated.whatsapp += q.quota_whatsapp_per_day || 0;
      allocated.ai += q.quota_ai_credits_per_day || 0;
    });

    setSummary({
      users: { total: plan.max_users, allocated: allocated.users, available: plan.max_users - allocated.users },
      screens: { total: plan.max_screens, allocated: allocated.screens, available: plan.max_screens - allocated.screens },
      alerts: { total: plan.max_alerts, allocated: allocated.alerts, available: plan.max_alerts - allocated.alerts },
      whatsapp: { total: plan.max_whatsapp_messages_per_day, allocated: allocated.whatsapp, available: plan.max_whatsapp_messages_per_day - allocated.whatsapp },
      ai: { total: plan.max_ai_credits_per_day, allocated: allocated.ai, available: plan.max_ai_credits_per_day - allocated.ai },
    });
  }

  function updateQuota(groupId: string, field: string, value: number) {
    setQuotas(prev => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        [field]: Math.max(0, value),
      }
    }));
  }

  async function saveQuotas() {
    // Validar se nao excedeu limites
    if (summary) {
      if (summary.users.available < 0) {
        showToast('Quota de usuarios excede o limite do plano', 'error');
        return;
      }
      if (summary.screens.available < 0) {
        showToast('Quota de telas excede o limite do plano', 'error');
        return;
      }
      if (summary.alerts.available < 0) {
        showToast('Quota de alertas excede o limite do plano', 'error');
        return;
      }
      if (summary.whatsapp.available < 0) {
        showToast('Quota de WhatsApp excede o limite do plano', 'error');
        return;
      }
      if (summary.ai.available < 0) {
        showToast('Quota de IA excede o limite do plano', 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await fetch('/api/dev/quotas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quotas }),
      });

      if (res.ok) {
        showToast('Quotas salvas com sucesso!', 'success');
        loadData();
      } else {
        const data = await res.json();
        showToast(data.error || 'Erro ao salvar', 'error');
      }
    } catch (error) {
      showToast('Erro ao salvar quotas', 'error');
    } finally {
      setSaving(false);
    }
  }

  function QuotaCard({ icon: Icon, label, data, color }: { icon: any; label: string; data: any; color: string }) {
    const percent = data.total > 0 ? (data.allocated / data.total) * 100 : 0;
    const isOver = data.available < 0;
    
    // Extrair cor base para a barra (ex: bg-blue-500 -> bg-blue-500)
    const barColor = isOver ? 'bg-red-500' : color;
    
    return (
      <div className={`bg-white rounded-xl border p-4 ${isOver ? 'border-red-300' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <span className="font-medium text-gray-700">{label}</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Alocado</span>
            <span className={isOver ? 'text-red-600 font-medium' : 'text-gray-700'}>
              {data.allocated} / {data.total}
            </span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${Math.min(100, percent)}%` }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Disponivel</span>
            <span className={isOver ? 'text-red-600 font-medium' : 'text-green-600'}>
              {data.available}
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
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
            <h1 className="text-2xl font-bold text-gray-900">Distribuir Quotas</h1>
            <p className="text-gray-500 mt-1">Distribua os recursos do seu plano entre seus grupos</p>
          </div>
          <button
            onClick={saveQuotas}
            disabled={saving}
            className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar
          </button>
        </div>

        {/* Resumo */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <QuotaCard icon={Users} label="Usuarios" data={summary.users} color="bg-blue-500" />
            <QuotaCard icon={Monitor} label="Telas" data={summary.screens} color="bg-purple-500" />
            <QuotaCard icon={Bell} label="Alertas" data={summary.alerts} color="bg-yellow-500" />
            <QuotaCard icon={MessageSquare} label="WhatsApp/dia" data={summary.whatsapp} color="bg-green-500" />
            <QuotaCard icon={Sparkles} label="IA/dia" data={summary.ai} color="bg-pink-500" />
          </div>
        )}

        {/* Tabela de Grupos */}
        {groups.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <ArrowUpDown className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum grupo</h3>
            <p className="text-gray-500">Crie grupos primeiro para distribuir quotas</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 text-sm font-medium text-gray-700">Grupo</th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-700 w-24">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="w-4 h-4" /> Usuarios
                      </div>
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-700 w-24">
                      <div className="flex items-center justify-center gap-1">
                        <Monitor className="w-4 h-4" /> Telas
                      </div>
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-700 w-24">
                      <div className="flex items-center justify-center gap-1">
                        <Bell className="w-4 h-4" /> Alertas
                      </div>
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-700 w-24">
                      <div className="flex items-center justify-center gap-1">
                        <MessageSquare className="w-4 h-4" /> WhatsApp
                      </div>
                    </th>
                    <th className="text-center px-4 py-3 text-sm font-medium text-gray-700 w-24">
                      <div className="flex items-center justify-center gap-1">
                        <Sparkles className="w-4 h-4" /> IA
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {groups.map((group) => (
                    <tr key={group.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-gray-900">{group.name}</div>
                          <div className="text-xs text-gray-500">
                            Usando: {group.used_users} usuarios, {group.used_screens} telas
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <input
                            type="number"
                            min="0"
                            value={quotas[group.id]?.quota_users || 0}
                            onChange={(e) => updateQuota(group.id, 'quota_users', parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <input
                            type="number"
                            min="0"
                            value={quotas[group.id]?.quota_screens || 0}
                            onChange={(e) => updateQuota(group.id, 'quota_screens', parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <input
                            type="number"
                            min="0"
                            value={quotas[group.id]?.quota_alerts || 0}
                            onChange={(e) => updateQuota(group.id, 'quota_alerts', parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <input
                            type="number"
                            min="0"
                            value={quotas[group.id]?.quota_whatsapp_per_day || 0}
                            onChange={(e) => updateQuota(group.id, 'quota_whatsapp_per_day', parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex justify-center">
                          <input
                            type="number"
                            min="0"
                            value={quotas[group.id]?.quota_ai_credits_per_day || 0}
                            onChange={(e) => updateQuota(group.id, 'quota_ai_credits_per_day', parseInt(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
