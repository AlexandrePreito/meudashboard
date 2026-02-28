'use client';

import { useFeatures } from '@/hooks/useFeatures';
import { Sparkles } from 'lucide-react';

export default function UpgradeBanner() {
  const { isFree, loading } = useFeatures();

  if (loading || !isFree) return null;

  return (
    <div className="mx-3 mb-3 p-3 bg-gradient-to-r from-blue-50 to-violet-50 border border-blue-200 rounded-xl">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="w-4 h-4 text-blue-600" />
        <span className="text-xs font-semibold text-blue-800">Plano Free</span>
      </div>
      <p className="text-[11px] text-blue-600 mb-2">Desbloqueie IA, alertas e WhatsApp</p>
      <a
        href="https://wa.me/556282289559?text=Olá! Quero fazer upgrade do MeuDashboard."
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full text-center text-xs bg-blue-600 text-white py-1.5 rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        Fazer upgrade
      </a>
    </div>
  );
}
