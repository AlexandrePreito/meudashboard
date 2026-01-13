'use client';
import { useState, useEffect } from 'react';
import { useMenu } from '@/contexts/MenuContext';

interface PlanQuotas {
  ai_enabled: boolean;
  max_alerts: number;
  max_whatsapp_per_day: number;
  max_ai_credits_per_day: number;
  max_alert_executions_per_day: number;
  max_powerbi_screens: number;
  max_users: number;
}

interface PlanPermissions {
  loading: boolean;
  quotas: PlanQuotas | null;
  canUseAI: boolean;
  canUseAlerts: boolean;
  canUseWhatsApp: boolean;
  isStarterPlan: boolean;
  planName: string;
}

const DEFAULT_QUOTAS: PlanQuotas = {
  ai_enabled: false,
  max_alerts: 0,
  max_whatsapp_per_day: 0,
  max_ai_credits_per_day: 0,
  max_alert_executions_per_day: 0,
  max_powerbi_screens: 0,
  max_users: 0,
};

export function usePlanPermissions(): PlanPermissions {
  const { activeGroup } = useMenu();
  const [loading, setLoading] = useState(true);
  const [quotas, setQuotas] = useState<PlanQuotas | null>(null);
  const [planName, setPlanName] = useState('');

  useEffect(() => {
    if (activeGroup?.id) {
      loadPlanQuotas(activeGroup.id);
    } else {
      setQuotas(null);
      setLoading(false);
    }
  }, [activeGroup?.id]);

  async function loadPlanQuotas(groupId: string) {
    try {
      setLoading(true);
      const res = await fetch(`/api/user/plan-quotas?group_id=${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setQuotas(data.quotas);
        setPlanName(data.plan_name || '');
      }
    } catch (error) {
      console.error('Erro ao carregar quotas:', error);
      setQuotas(DEFAULT_QUOTAS);
    } finally {
      setLoading(false);
    }
  }

  const canUseAI = quotas?.ai_enabled === true && (quotas?.max_ai_credits_per_day || 0) > 0;
  const canUseAlerts = (quotas?.max_alerts || 0) > 0;
  const canUseWhatsApp = (quotas?.max_whatsapp_per_day || 0) > 0;
  const isStarterPlan = planName.toLowerCase() === 'starter';

  return {
    loading,
    quotas,
    canUseAI,
    canUseAlerts,
    canUseWhatsApp,
    isStarterPlan,
    planName,
  };
}
