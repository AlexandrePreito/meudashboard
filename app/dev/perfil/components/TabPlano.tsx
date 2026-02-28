'use client';

import { useFeatures } from '@/hooks/useFeatures';
import { Crown, Zap, Users, LayoutDashboard, FolderOpen, Globe, MessageCircle, Brain, Sparkles, ArrowRight, Check, BarChart3 } from 'lucide-react';

interface TabPlanoProps {
  quotas?: {
    groups: { used: number; limit: number };
    viewers: { used: number; limit: number };
    dashboards: { used: number; limit: number };
  };
}

export default function TabPlano({ quotas }: TabPlanoProps) {
  const { isFree } = useFeatures();
  const currentPlan = isFree ? 'free' : 'pro';

  const plans = [
    {
      id: 'free', name: 'Free', price: 'Grátis',
      icon: <Zap size={24} />, color: 'from-gray-500 to-gray-600', shadowColor: 'shadow-gray-500/20',
      features: [
        { icon: <FolderOpen size={14} />, text: '1 grupo' },
        { icon: <Users size={14} />, text: '10 viewers' },
        { icon: <LayoutDashboard size={14} />, text: '5 dashboards' },
        { icon: <BarChart3 size={14} />, text: 'Power BI Embedded' },
      ],
      excluded: ['WhatsApp', 'IA', 'Subdomínio personalizado'],
    },
    {
      id: 'pro', name: 'Pro', price: 'Sob consulta',
      icon: <Crown size={24} />, color: 'from-blue-500 to-cyan-500', shadowColor: 'shadow-blue-500/20',
      features: [
        { icon: <FolderOpen size={14} />, text: 'Grupos' },
        { icon: <Users size={14} />, text: 'Viewers' },
        { icon: <LayoutDashboard size={14} />, text: 'Dashboards' },
        { icon: <Globe size={14} />, text: 'Subdomínio personalizado' },
        { icon: <MessageCircle size={14} />, text: 'WhatsApp integrado' },
        { icon: <Brain size={14} />, text: 'IA assistente' },
      ],
      excluded: [],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Plano Atual + Cotas */}
      <div className="card-modern p-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${currentPlan === 'pro' ? 'from-blue-500 to-cyan-500 shadow-blue-500/20' : 'from-gray-500 to-gray-600 shadow-gray-500/20'} flex items-center justify-center shadow-lg`}>
            {currentPlan === 'pro' ? <Crown size={22} className="text-white" /> : <Zap size={22} className="text-white" />}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Plano {currentPlan === 'pro' ? 'Pro' : 'Free'}</h3>
            <p className="text-sm text-gray-500">{currentPlan === 'pro' ? 'Todos os recursos liberados' : 'Recursos básicos'}</p>
          </div>
        </div>

        {quotas && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            {[
              { label: 'Grupos', ...quotas.groups, icon: <FolderOpen size={16} /> },
              { label: 'Viewers', ...quotas.viewers, icon: <Users size={16} /> },
              { label: 'Dashboards', ...quotas.dashboards, icon: <LayoutDashboard size={16} /> },
            ].map((item) => {
              const pct = item.limit > 0 ? (item.used / item.limit) * 100 : 0;
              const isHigh = pct >= 80;
              return (
                <div key={item.label} className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                      <span className="text-gray-400">{item.icon}</span> {item.label}
                    </div>
                    <span className={`text-sm font-bold ${isHigh ? 'text-amber-600' : 'text-gray-900'}`}>{item.used}/{item.limit}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${isHigh ? 'bg-amber-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Comparação de Planos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          return (
            <div key={plan.id} className={`relative rounded-2xl border-2 p-6 transition-all ${isCurrent ? 'border-blue-500 bg-blue-50/30 shadow-lg shadow-blue-500/10' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
              {isCurrent && (
                <div className="absolute -top-3 left-6 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">Seu plano atual</div>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${plan.color} flex items-center justify-center shadow-md ${plan.shadowColor}`}>
                  <span className="text-white">{plan.icon}</span>
                </div>
                <div>
                  <h4 className="font-bold text-gray-900">{plan.name}</h4>
                  <p className="text-sm text-gray-500">{plan.price}</p>
                </div>
              </div>
              <div className="space-y-2.5 mb-6">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0"><Check size={12} className="text-emerald-600" /></div>
                    {f.text}
                  </div>
                ))}
                {plan.excluded.map((text, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-400 line-through">
                    <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><span className="text-[10px] text-gray-400">✕</span></div>
                    {text}
                  </div>
                ))}
              </div>
              {!isCurrent && plan.id === 'pro' && (
                <a href="https://wa.me/5562982289559?text=Olá!%20Tenho%20interesse%20em%20fazer%20upgrade%20do%20meu%20plano%20no%20MeuDashboard." target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-3 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all">
                  <Sparkles size={16} /> Fazer upgrade <ArrowRight size={16} />
                </a>
              )}
              {isCurrent && plan.id === 'pro' && (
                <div className="flex items-center justify-center gap-2 w-full bg-emerald-50 text-emerald-700 font-semibold py-3 rounded-xl border border-emerald-200"><Check size={16} /> Plano ativo</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
