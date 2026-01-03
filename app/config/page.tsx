'use client';

import MainLayout from '@/components/layout/MainLayout';
import { Settings } from 'lucide-react';

export default function ConfigPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
          <p className="text-gray-500">Configure o sistema</p>
        </div>

        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <Settings size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Em breve</h2>
          <p className="text-gray-500">Configurações serão implementadas em breve.</p>
        </div>
      </div>
    </MainLayout>
  );
}

