'use client';

import { useState, useEffect } from 'react';

export interface SubdomainDeveloperInfo {
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color?: string;
  landing_title: string;
  landing_description: string;
  landing_background_url: string | null;
}

export function useSubdomain() {
  const [subdomain, setSubdomain] = useState<string | null>(null);
  const [developerInfo, setDeveloperInfo] = useState<SubdomainDeveloperInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cookies = document.cookie.split(';');
    const subCookie = cookies.find(c => c.trim().startsWith('x-subdomain='));
    const sub = subCookie?.split('=')[1]?.trim() || null;

    if (!sub) {
      setLoading(false);
      return;
    }

    setSubdomain(sub);

    fetch(`/api/subdomain/${encodeURIComponent(sub)}`)
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setDeveloperInfo(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { subdomain, developerInfo, loading, isSubdomain: !!subdomain };
}
