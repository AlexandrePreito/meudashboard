'use client';

import { useState, useEffect } from 'react';

interface Features {
  plan_name: string;
  plan_type: 'free' | 'custom' | 'master';
  features: {
    whatsapp: boolean;
    alerts: boolean;
    ai: boolean;
    max_groups?: number;
    max_users?: number;
    max_screens?: number;
    allow_powerbi_connections?: boolean;
    allow_whatsapp_instances?: boolean;
  };
  is_free: boolean;
}

export function useFeatures() {
  const [features, setFeatures] = useState<Features | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = sessionStorage.getItem('user-features');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed._timestamp && Date.now() - parsed._timestamp < 5 * 60 * 1000) {
          setFeatures(parsed);
          setLoading(false);
          return;
        }
      } catch {}
    }

    fetch('/api/auth/features', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (!data.error) {
          const withTimestamp = { ...data, _timestamp: Date.now() };
          sessionStorage.setItem('user-features', JSON.stringify(withTimestamp));
          setFeatures(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return {
    features,
    loading,
    isFree: features?.is_free === true,
    hasWhatsapp: features?.features?.whatsapp ?? false,
    hasAlerts: features?.features?.alerts ?? false,
    hasAI: features?.features?.ai ?? false,
    planName: features?.plan_name || null,
    allowPowerbiConnections: features?.features?.allow_powerbi_connections ?? true,
    allowWhatsappInstances: features?.features?.allow_whatsapp_instances ?? true,
  };
}
