'use client';

import { useFeatures } from '@/hooks/useFeatures';
import { Crown, Zap, Users, LayoutDashboard, FolderOpen, Globe, MessageCircle, Brain, Check, BarChart3 } from 'lucide-react';

const whatsappLink = 'https://wa.me/5562982289559?text=Olá!%20Tenho%20interesse%20em%20fazer%20upgrade%20do%20meu%20plano%20no%20MeuDashboard.';

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

  const freeFeatures = [
    { icon: FolderOpen, text: '1 grupo' },
    { icon: Users, text: '10 viewers' },
    { icon: LayoutDashboard, text: '5 dashboards' },
    { icon: BarChart3, text: 'Power BI Embedded' },
  ];
  const freeExcluded = ['WhatsApp', 'IA', 'Subdomínio personalizado'];

  const proFeatures = [
    { icon: FolderOpen, text: 'Grupos ilimitados' },
    { icon: Users, text: 'Viewers conforme demanda' },
    { icon: LayoutDashboard, text: 'Dashboards conforme demanda' },
    { icon: Globe, text: 'Subdomínio personalizado' },
    { icon: MessageCircle, text: 'WhatsApp integrado' },
    { icon: Brain, text: 'IA assistente' },
  ];

  return (
    <div className="space-y-6">
      {/* Plano Atual + Cotas */}
      <div className="card-modern p-6">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg ${currentPlan === 'pro' ? 'from-blue-500 to-cyan-500 shadow-blue-500/20' : 'from-emerald-500 to-green-600 shadow-emerald-500/25'}`}>
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

      {/* Comparação de Planos - Padronizado com página inicial */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* Free */}
        <div className={`flex flex-col relative bg-white rounded-3xl border-2 p-8 shadow-lg transition-all duration-300 ${currentPlan === 'free' ? 'border-blue-500 bg-blue-50/30 shadow-blue-500/10' : 'border-slate-200 shadow-slate-200/50 hover:border-slate-300 hover:shadow-xl'}`}>
          {currentPlan === 'free' && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 md:left-8 md:translate-x-0 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg">Seu plano atual</div>
          )}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Free</h3>
              <p className="text-slate-500 font-medium">Grátis para sempre</p>
            </div>
          </div>
          <p className="text-slate-600 text-sm mb-6">Ideal para testar a plataforma e começar com o essencial.</p>
          <ul className="space-y-3 mb-8">
            {freeFeatures.map((f, i) => {
              const Icon = f.icon;
              return (
                <li key={i} className="flex items-center gap-3 text-slate-700">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span>{f.text}</span>
                </li>
              );
            })}
            {freeExcluded.map((text, i) => (
              <li key={`ex-${i}`} className="flex items-center gap-3 text-slate-400">
                <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-[10px] font-bold">✕</div>
                <span className="line-through">{text}</span>
              </li>
            ))}
          </ul>
          {currentPlan === 'free' && (
            <div className="mt-auto flex items-center justify-center gap-2 w-full bg-emerald-50 text-emerald-700 font-semibold py-4 rounded-xl border border-emerald-200">
              <Check size={16} /> Plano atual
            </div>
          )}
        </div>

        {/* Pro */}
        <div className={`flex flex-col relative bg-white rounded-3xl border-2 p-8 shadow-xl transition-all duration-300 ${currentPlan === 'pro' ? 'border-blue-500 bg-blue-50/30 shadow-blue-500/15' : 'border-blue-500 shadow-blue-500/15 hover:shadow-blue-500/25'}`}>
          {currentPlan === 'pro' ? (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 md:left-8 md:translate-x-0 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg">Seu plano atual</div>
          ) : (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white text-sm font-bold px-4 py-1.5 rounded-full shadow-lg">Mais popular</div>
          )}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Crown className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-900">Pro</h3>
              <p className="text-slate-500 font-medium">Sob consulta</p>
            </div>
          </div>
          <p className="text-slate-600 text-sm mb-6">Todos os recursos para escalar. Proposta personalizada conforme sua necessidade.</p>
          <ul className="space-y-3 mb-8">
            {proFeatures.map((f, i) => {
              const Icon = f.icon;
              return (
                <li key={i} className="flex items-center gap-3 text-slate-700">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <Icon className="w-4 h-4 text-blue-500" />
                  <span>{f.text}</span>
                </li>
              );
            })}
          </ul>
          {currentPlan === 'pro' ? (
            <div className="mt-auto flex items-center justify-center gap-2 w-full bg-emerald-50 text-emerald-700 font-semibold py-4 rounded-xl border border-emerald-200">
              <Check size={16} /> Plano ativo
            </div>
          ) : (
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="mt-auto flex items-center justify-center gap-2 w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-4 rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all">
              <MessageSquare className="w-5 h-5" />
              Solicitar proposta
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
