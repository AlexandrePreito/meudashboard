'use client';

import MainLayout from '@/components/layout/MainLayout';
import { MessageSquare } from 'lucide-react';

export default function WhatsAppPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
          <p className="text-gray-500">Gerencie instâncias e alertas do WhatsApp</p>
        </div>

        <div className="bg-white rounded-2xl p-12 shadow-sm border border-gray-100 text-center">
          <MessageSquare size={48} className="mx-auto text-gray-300 mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Em breve</h2>
          <p className="text-gray-500">Módulo de WhatsApp será implementado em breve.</p>
        </div>
      </div>
    </MainLayout>
  );
}

