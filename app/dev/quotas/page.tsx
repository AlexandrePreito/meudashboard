'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/contexts/ToastContext';
import {
  ArrowUpDown,
  Building2,
  Users,
  MonitorPlay,
  Bell,
  MessageCircle,
  RefreshCw,
  Save,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Lock,
  LayoutGrid,
  List
} from 'lucide-react';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import Pagination, { PAGE_SIZE } from '@/components/ui/Pagination';
import { useFeatures } from '@/hooks/useFeatures';

interface Group {
  id: string;
  name: string;
  quota_users: number | null;
  quota_screens: number | null;
  quota_alerts: number | null;
  quota_whatsapp_per_day: number | null;
  quota_ai_credits_per_day: number | null;
  quota_alert_executions_per_day: number | null;
  used_users: number;
  used_screens: number;
}

interface DeveloperPlan {
  max_companies: number;
  max_users: number;
  max_powerbi_screens: number;
  max_alerts: number;
  max_chat_messages_per_day: number;
  max_ai_credits_per_day: number;
  max_daily_refreshes: number;
}

interface QuotaSummary {
  groups: { total: number; allocated: number; available: number };
  users: { total: number; allocated: number; available: number };
  screens: { total: number; allocated: number; available: number };
  alerts: { total: number; allocated: number; available: number };
  whatsapp: { total: number; allocated: number; available: number };
  ia: { total: number; allocated: number; available: number };
  atualizacoes: { total: number; allocated: number; available: number };
}

export default function DevQuotasPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { isFree } = useFeatures();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [plan, setPlan] = useState<DeveloperPlan | null>(null);
  const [quotas, setQuotas] = useState<Record<string, any>>({});
  const [summary, setSummary] = useState<QuotaSummary | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const initialQuotasRef = useRef<Record<string, any>>({});

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (plan && groups.length > 0) {
      calculateSummary();
    }
  }, [quotas, plan, groups]);

  useEffect(() => {
    setPage(1);
  }, [sortOrder]);

  async function loadData() {
    try {
      // Buscar dados do developer
      const devRes = await fetch('/api/user/groups');
      if (devRes.status === 403) {
        router.push('/dashboard');
        return;
      }
      
      const devData = await devRes.json();
      const dev = devData.developer;
      
      if (!dev) {
        showToast('Desenvolvedor não encontrado', 'error');
        setLoading(false);
        return;
      }

      // Usar limites do developer (Master define, Developer distribui)
      const planLimits = {
        max_companies: dev.max_companies || 5,
        max_users: dev.max_users || 50,
        max_powerbi_screens: dev.max_powerbi_screens || 10,
        max_alerts: dev.max_alerts || 20,
        max_chat_messages_per_day: dev.max_chat_messages_per_day || dev.max_whatsapp_messages_per_day || 1000,
        max_ai_credits_per_day: dev.max_ai_credits_per_day || 200,
        max_daily_refreshes: dev.max_daily_refreshes || 20
      };
      
      setPlan(planLimits);

      // Buscar grupos
      const res = await fetch('/api/dev/quotas');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
        
        // Inicializar quotas com valores atuais
        const initialQuotas: Record<string, any> = {};
        (data.groups || []).forEach((g: Group) => {
          initialQuotas[g.id] = {
            quota_users: g.quota_users || 0,
            quota_screens: g.quota_screens || 0,
            quota_alerts: g.quota_alerts || 0,
            quota_whatsapp_per_day: g.quota_whatsapp_per_day || 0,
            quota_ai_credits_per_day: g.quota_ai_credits_per_day || 0,
            quota_alert_executions_per_day: g.quota_alert_executions_per_day || 0,
            quota_refreshes: (g as any).quota_refreshes || 0,
          };
        });
        setQuotas(initialQuotas);
        initialQuotasRef.current = JSON.parse(JSON.stringify(initialQuotas));
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

    // Calcular totais alocados
    const totalUsuarios = groups.reduce((sum: number, g: Group) => 
      sum + (quotas[g.id]?.quota_users || 0), 0);
    const totalTelas = groups.reduce((sum: number, g: Group) => 
      sum + (quotas[g.id]?.quota_screens || 0), 0);
    const totalAlertas = groups.reduce((sum: number, g: Group) => 
      sum + (quotas[g.id]?.quota_alerts || 0), 0);
    const totalChat = groups.reduce((sum: number, g: Group) => 
      sum + (quotas[g.id]?.quota_whatsapp_per_day || 0), 0);
    const totalIA = groups.reduce((sum: number, g: Group) => 
      sum + (quotas[g.id]?.quota_ai_credits_per_day || 0), 0);
    const totalRefreshes = groups.reduce((sum: number, g: Group) => 
      sum + (quotas[g.id]?.quota_refreshes || quotas[g.id]?.quota_alert_executions_per_day || 0), 0);

    setSummary({
      groups: {
        total: plan.max_companies || 5,
        allocated: groups.length,
        available: (plan.max_companies || 5) - groups.length
      },
      users: { 
        total: plan.max_users, 
        allocated: totalUsuarios, 
        available: plan.max_users - totalUsuarios 
      },
      screens: { 
        total: plan.max_powerbi_screens, 
        allocated: totalTelas, 
        available: plan.max_powerbi_screens - totalTelas 
      },
      alerts: { 
        total: plan.max_alerts, 
        allocated: totalAlertas, 
        available: plan.max_alerts - totalAlertas 
      },
      whatsapp: { 
        total: plan.max_chat_messages_per_day, 
        allocated: totalChat, 
        available: plan.max_chat_messages_per_day - totalChat 
      },
      ia: { 
        total: plan.max_ai_credits_per_day || 0, 
        allocated: totalIA, 
        available: (plan.max_ai_credits_per_day || 0) - totalIA 
      },
      atualizacoes: { 
        total: plan.max_daily_refreshes, 
        allocated: totalRefreshes, 
        available: plan.max_daily_refreshes - totalRefreshes 
      }
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

  function distributeEvenly() {
    if (!plan || groups.length === 0) return;
    const perGroup = {
      quota_users: Math.floor(plan.max_users / groups.length),
      quota_screens: Math.floor(plan.max_powerbi_screens / groups.length),
      quota_alerts: isFree ? 0 : Math.floor(plan.max_alerts / groups.length),
      quota_whatsapp_per_day: isFree ? 0 : Math.floor(plan.max_chat_messages_per_day / groups.length),
      quota_ai_credits_per_day: isFree ? 0 : Math.floor((plan.max_ai_credits_per_day || 0) / groups.length),
      quota_refreshes: Math.floor(plan.max_daily_refreshes / groups.length),
    };
    const newQuotas: Record<string, any> = {};
    groups.forEach(g => {
      newQuotas[g.id] = { ...perGroup };
    });
    setQuotas(newQuotas);
    showToast('Cotas distribuídas igualmente entre os grupos', 'success');
  }

  function hasQuotasChanged(): boolean {
    const initial = initialQuotasRef.current;
    const groupIds = Object.keys(quotas);
    if (Object.keys(initial).length !== groupIds.length) return true;
    for (const id of groupIds) {
      const a = initial[id];
      const b = quotas[id];
      if (!a || !b) return true;
      const fields = ['quota_users', 'quota_screens', 'quota_alerts', 'quota_whatsapp_per_day', 'quota_ai_credits_per_day', 'quota_refreshes'];
      for (const f of fields) {
        if ((a[f] || 0) !== (b[f] || 0)) return true;
      }
    }
    return false;
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
      if (summary.ia.available < 0) {
        showToast('Quota de créditos IA excede o limite do plano', 'error');
        return;
      }
      if (summary.atualizacoes.available < 0) {
        showToast('Quota de atualizações excede o limite do plano', 'error');
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

  function getBarColor(iconColor: string, isOver: boolean) {
    if (isOver) return 'bg-red-500';
    if (iconColor === 'text-blue-600') return 'bg-blue-500';
    if (iconColor === 'text-indigo-600') return 'bg-indigo-500';
    if (iconColor === 'text-purple-600') return 'bg-purple-500';
    if (iconColor === 'text-red-600') return 'bg-red-500';
    if (iconColor === 'text-green-600') return 'bg-green-500';
    if (iconColor === 'text-amber-600') return 'bg-amber-500';
    if (iconColor === 'text-orange-600') return 'bg-orange-500';
    return 'bg-blue-500';
  }

  function QuotaCard({ icon: Icon, label, data, iconColor, blocked }: { icon: any; label: string; data: any; iconColor: string; bgColor?: string; blocked?: boolean }) {
    const percent = data.total > 0 ? (data.allocated / data.total) * 100 : 0;
    const isOver = data.available < 0;
    const barColor = getBarColor(iconColor, isOver);

    return (
      <div className={`bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow ${isOver ? 'border-red-300' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${iconColor}`} />
            <span className="text-sm font-medium text-gray-600">{label}</span>
          </div>
          {blocked && <Lock className="w-3.5 h-3.5 text-gray-400" />}
        </div>
        <div className="flex items-baseline gap-1 mb-2">
          <span className={`text-2xl font-bold ${isOver ? 'text-red-600' : 'text-gray-900'}`}>
            {data.allocated}
          </span>
          <span className="text-sm text-gray-400">/ {data.total}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${Math.min(100, percent)}%` }} />
        </div>
        <p className={`text-xs mt-1.5 ${isOver ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
          {isOver ? `${Math.abs(data.available)} acima do limite` : `${data.available} disponível`}
        </p>
      </div>
    );
  }

  function QuotaInput({
    label,
    icon: Icon,
    value,
    onChange,
    disabled,
  }: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    value: number;
    onChange: (v: number) => void;
    disabled?: boolean;
  }) {
    return (
      <div className={disabled ? 'opacity-50' : ''}>
        <label className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
          <Icon className="w-3 h-3" />
          {label}
        </label>
        <input
          type="number"
          min={0}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 0)}
          className={`w-full px-3 py-1.5 text-sm font-medium border rounded-lg text-right ${
            disabled
              ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
              : 'border-gray-300 hover:border-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
          }`}
        />
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

  const hasChanges = hasQuotasChanged();
  const hasOverage = summary != null && (
    summary.users.available < 0 || summary.screens.available < 0 || summary.alerts.available < 0 ||
    summary.whatsapp.available < 0 || summary.ia.available < 0 || summary.atualizacoes.available < 0
  );
  const overResources: string[] = [];
  if (summary) {
    if (summary.users.available < 0) overResources.push('Usuários');
    if (summary.screens.available < 0) overResources.push('Telas');
    if (summary.alerts.available < 0) overResources.push('Alertas');
    if (summary.whatsapp.available < 0) overResources.push('WhatsApp/dia');
    if (summary.ia.available < 0) overResources.push('Créditos IA');
    if (summary.atualizacoes.available < 0) overResources.push('Atualizações');
  }

  const sortedGroups = [...groups].sort((a, b) => {
    if (sortOrder === null) return 0;
    const comparison = a.name.localeCompare(b.name, 'pt-BR');
    return sortOrder === 'asc' ? comparison : -comparison;
  });
  const paginatedGroups = sortedGroups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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
            disabled={saving || !hasChanges}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all disabled:opacity-50 ${
              hasChanges ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200' : 'bg-gray-100 text-gray-400 cursor-default'
            }`}
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </div>

        {/* Alerta de excesso */}
        {hasOverage && overResources.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span>
              Você está distribuindo mais do que o permitido em: {overResources.join(', ')}. Ajuste os valores antes de salvar.
            </span>
          </div>
        )}

        {/* Resumo — Linha 1: recursos básicos */}
        {summary && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuotaCard icon={Building2} label="Grupos" data={summary.groups} iconColor="text-blue-600" />
              <QuotaCard icon={Users} label="Usuários" data={summary.users} iconColor="text-indigo-600" />
              <QuotaCard icon={MonitorPlay} label="Telas" data={summary.screens} iconColor="text-purple-600" />
              <QuotaCard icon={RefreshCw} label="Atualizações/dia" data={summary.atualizacoes} iconColor="text-orange-600" />
            </div>
            {/* Linha 2: recursos premium */}
            <div className={`space-y-2 ${isFree ? 'opacity-60' : ''}`}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recursos Pro</span>
                {isFree && (
                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Disponível no Pro</span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <QuotaCard icon={Bell} label="Alertas" data={summary.alerts} iconColor="text-red-600" blocked={isFree} />
                <QuotaCard icon={MessageCircle} label="WhatsApp/dia" data={summary.whatsapp} iconColor="text-green-600" blocked={isFree} />
                <QuotaCard icon={Sparkles} label="Créditos IA/dia" data={summary.ia} iconColor="text-amber-600" blocked={isFree} />
              </div>
            </div>
          </>
        )}

        {/* Grupos */}
        {groups.length === 0 ? (
          <div className="card-modern p-12 text-center">
            <ArrowUpDown className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum grupo</h3>
            <p className="text-gray-500">Crie grupos primeiro para distribuir quotas</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Grupos</h2>
                <span className="text-sm text-gray-500">{groups.length} grupo(s)</span>
                <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  <button
                    type="button"
                    onClick={() => setViewMode('cards')}
                    className={`p-1.5 rounded ${viewMode === 'cards' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    title="Cards"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
                    title="Tabela"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={distributeEvenly}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 px-3 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                Distribuir igualmente
              </button>
            </div>

            {viewMode === 'cards' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginatedGroups.map((group) => (
                  <div key={group.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 transition-colors">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{group.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {group.used_users} usuários · {group.used_screens} telas
                        </p>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <Building2 className="w-4 h-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <QuotaInput
                        label="Usuários"
                        icon={Users}
                        value={quotas[group.id]?.quota_users || 0}
                        onChange={(v) => updateQuota(group.id, 'quota_users', v)}
                      />
                      <QuotaInput
                        label="Telas"
                        icon={MonitorPlay}
                        value={quotas[group.id]?.quota_screens || 0}
                        onChange={(v) => updateQuota(group.id, 'quota_screens', v)}
                      />
                      <QuotaInput
                        label="Alertas"
                        icon={Bell}
                        value={quotas[group.id]?.quota_alerts || 0}
                        onChange={(v) => updateQuota(group.id, 'quota_alerts', v)}
                        disabled={isFree}
                      />
                      <QuotaInput
                        label="WhatsApp"
                        icon={MessageCircle}
                        value={quotas[group.id]?.quota_whatsapp_per_day || 0}
                        onChange={(v) => updateQuota(group.id, 'quota_whatsapp_per_day', v)}
                        disabled={isFree}
                      />
                      <QuotaInput
                        label="IA/dia"
                        icon={Sparkles}
                        value={quotas[group.id]?.quota_ai_credits_per_day || 0}
                        onChange={(v) => updateQuota(group.id, 'quota_ai_credits_per_day', v)}
                        disabled={isFree}
                      />
                      <QuotaInput
                        label="Atualizações"
                        icon={RefreshCw}
                        value={quotas[group.id]?.quota_refreshes || quotas[group.id]?.quota_alert_executions_per_day || 0}
                        onChange={(v) => updateQuota(group.id, 'quota_refreshes', v)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="card-modern overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                      <tr>
                        <th className="text-left px-6 py-4">
                          <button
                            onClick={() => {
                              if (sortOrder === null) setSortOrder('asc');
                              else if (sortOrder === 'asc') setSortOrder('desc');
                              else setSortOrder(null);
                            }}
                            className="flex items-center gap-2 text-xs font-medium text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                          >
                            <span>Grupo</span>
                            <div className="flex flex-col">
                              <ArrowUp className={`w-3 h-3 ${sortOrder === 'asc' ? 'text-gray-700' : 'text-gray-300'}`} />
                              <ArrowDown className={`w-3 h-3 -mt-1 ${sortOrder === 'desc' ? 'text-gray-700' : 'text-gray-300'}`} />
                            </div>
                          </button>
                        </th>
                        <th className="text-center px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                          <div className="flex items-center justify-center gap-2">
                            <Users className="w-3.5 h-3.5 text-gray-500" /> <span>Usuários</span>
                          </div>
                        </th>
                        <th className="text-center px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                          <div className="flex items-center justify-center gap-2">
                            <MonitorPlay className="w-3.5 h-3.5 text-gray-500" /> <span>Telas</span>
                          </div>
                        </th>
                        <th className="text-center px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                          <div className="flex items-center justify-center gap-2">
                            <Bell className="w-3.5 h-3.5 text-gray-500" /> <span>Alertas</span>
                          </div>
                        </th>
                        <th className="text-center px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                          <div className="flex items-center justify-center gap-2">
                            <MessageCircle className="w-3.5 h-3.5 text-gray-500" /> <span>WhatsApp</span>
                          </div>
                        </th>
                        <th className="text-center px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                          <div className="flex items-center justify-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-gray-500" /> <span>IA/dia</span>
                          </div>
                        </th>
                        <th className="text-center px-4 py-4 text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                          <div className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-3.5 h-3.5 text-gray-500" /> <span>Atualizações</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-100">
                      {paginatedGroups.map((group) => (
                        <tr key={group.id} className="hover:bg-blue-50 transition-colors duration-150">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="font-semibold text-gray-900 text-base">{group.name}</div>
                              <div className="text-xs text-gray-500 mt-1 flex items-center gap-2">
                                <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{group.used_users} usuários</span>
                                <span className="text-gray-300">•</span>
                                <span className="inline-flex items-center gap-1"><MonitorPlay className="w-3 h-3" />{group.used_screens} telas</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <input type="number" min={0} value={quotas[group.id]?.quota_users || 0} onChange={(e) => updateQuota(group.id, 'quota_users', parseInt(e.target.value) || 0)} className="w-24 px-3 py-2 text-center text-sm font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all" />
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <input type="number" min={0} value={quotas[group.id]?.quota_screens || 0} onChange={(e) => updateQuota(group.id, 'quota_screens', parseInt(e.target.value) || 0)} className="w-24 px-3 py-2 text-center text-sm font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all" />
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <input type="number" min={0} disabled={isFree} value={quotas[group.id]?.quota_alerts || 0} onChange={(e) => updateQuota(group.id, 'quota_alerts', parseInt(e.target.value) || 0)} className={`w-24 px-3 py-2 text-center text-sm font-medium border-2 rounded-lg transition-all ${isFree ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-300 focus:ring-2 focus:ring-red-500 focus:border-red-500'}`} />
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <input type="number" min={0} disabled={isFree} value={quotas[group.id]?.quota_whatsapp_per_day || 0} onChange={(e) => updateQuota(group.id, 'quota_whatsapp_per_day', parseInt(e.target.value) || 0)} className={`w-24 px-3 py-2 text-center text-sm font-medium border-2 rounded-lg transition-all ${isFree ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500'}`} />
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <input type="number" min={0} disabled={isFree} value={quotas[group.id]?.quota_ai_credits_per_day || 0} onChange={(e) => updateQuota(group.id, 'quota_ai_credits_per_day', parseInt(e.target.value) || 0)} className={`w-24 px-3 py-2 text-center text-sm font-medium border-2 rounded-lg transition-all ${isFree ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500'}`} />
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <input type="number" min={0} value={quotas[group.id]?.quota_refreshes || quotas[group.id]?.quota_alert_executions_per_day || 0} onChange={(e) => updateQuota(group.id, 'quota_refreshes', parseInt(e.target.value) || 0)} className="w-24 px-3 py-2 text-center text-sm font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {groups.length > PAGE_SIZE && (
              <div className="mt-4 px-4 pb-4">
                <Pagination totalItems={groups.length} currentPage={page} onPageChange={setPage} pageSize={PAGE_SIZE} />
              </div>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
