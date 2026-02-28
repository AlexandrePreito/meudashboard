'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useToast } from '@/contexts/ToastContext';
import { User, Globe, Shield, CreditCard, Loader2 } from 'lucide-react';

import TabPerfil from './components/TabPerfil';
import TabSubdominio from './components/TabSubdominio';
import TabSeguranca from './components/TabSeguranca';
import TabPlano from './components/TabPlano';

type TabId = 'perfil' | 'subdominio' | 'seguranca' | 'plano';

interface DeveloperData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  logo_url: string | null;
  primary_color: string | null;
  subdomain: string | null;
  subdomain_enabled: boolean;
  subdomain_approved: boolean;
  subdomain_allowed?: boolean;
  landing_title: string | null;
  landing_description: string | null;
  landing_background_url: string | null;
}

const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: 'perfil', label: 'Perfil', icon: <User size={18} /> },
  { id: 'subdominio', label: 'Subdomínio', icon: <Globe size={18} /> },
  { id: 'seguranca', label: 'Segurança', icon: <Shield size={18} /> },
  { id: 'plano', label: 'Plano', icon: <CreditCard size={18} /> },
];

export default function DevPerfilPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabId>('perfil');
  const [loading, setLoading] = useState(true);
  const [developer, setDeveloper] = useState<DeveloperData | null>(null);

  const [subdomainState, setSubdomainState] = useState({
    subdomain: '',
    subdomain_enabled: false,
    subdomain_approved: false,
    landing_title: '',
    landing_description: '',
    landing_background_url: '',
    logo_url: '',
    primary_color: '#3b82f6',
  });

  const [quotas, setQuotas] = useState({
    groups: { used: 0, limit: 1 },
    viewers: { used: 0, limit: 10 },
    dashboards: { used: 0, limit: 5 },
  });

  useEffect(() => {
    loadProfile();
    loadQuotas();
  }, []);

  async function loadProfile() {
    try {
      const res = await fetch('/api/dev/profile');
      if (res.ok) {
        const data = await res.json();
        const dev = data.developer;
        setDeveloper(dev);
        setSubdomainState({
          subdomain: dev.subdomain || '',
          subdomain_enabled: !!dev.subdomain_enabled,
          subdomain_approved: !!dev.subdomain_approved,
          landing_title: dev.landing_title || '',
          landing_description: dev.landing_description || '',
          landing_background_url: dev.landing_background_url || '',
          logo_url: dev.logo_url || '',
          primary_color: dev.primary_color || '#3b82f6',
        });
      }
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
      toast.error('Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  }

  async function loadQuotas() {
    try {
      const res = await fetch('/api/dev/dashboard-stats');
      if (res.ok) {
        const data = await res.json();
        const stats = data.stats || {};
        const limits = data.limits || {};
        setQuotas({
          groups: { used: stats.groups ?? 0, limit: limits.maxGroups ?? 1 },
          viewers: { used: stats.users ?? 0, limit: limits.maxUsers ?? 10 },
          dashboards: { used: stats.screens ?? 0, limit: limits.maxScreens ?? 5 },
        });
      }
    } catch {
      // Silencioso — cotas são complementares
    }
  }

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            <p className="text-sm text-gray-400">Carregando perfil...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!developer) return null;

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meu Perfil</h1>
          <p className="text-gray-500 mt-1">Gerencie suas informações, subdomínio e segurança</p>
        </div>

        <div className="flex gap-1 border-b border-gray-200 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 hover:text-gray-700 border-b-2 border-transparent'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div>
          {activeTab === 'perfil' && (
            <TabPerfil
              profile={{
                name: developer.name,
                email: developer.email || '',
                phone: developer.phone,
                logo_url: developer.logo_url || undefined,
              }}
              onSaved={() => loadProfile()}
            />
          )}
          {activeTab === 'subdominio' && (
            <TabSubdominio
              data={subdomainState}
              developerName={developer.name}
              subdomainAllowed={developer.subdomain_allowed}
              onChange={setSubdomainState}
              onSaved={() => loadProfile()}
            />
          )}
          {activeTab === 'seguranca' && <TabSeguranca />}
          {activeTab === 'plano' && <TabPlano quotas={quotas} />}
        </div>
      </div>
    </MainLayout>
  );
}
