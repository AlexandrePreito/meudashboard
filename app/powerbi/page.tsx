'use client';

import MainLayout from '@/components/layout/MainLayout';
import Link from 'next/link';
import { Link as LinkIcon, FileText, Layers } from 'lucide-react';

const menuItems = [
  { href: '/powerbi/conexoes', icon: LinkIcon, label: 'Conexões', description: 'Gerenciar conexões com workspaces do Power BI' },
  { href: '/powerbi/relatorios', icon: FileText, label: 'Relatórios', description: 'Gerenciar relatórios disponíveis' },
  { href: '/powerbi/telas', icon: Layers, label: 'Telas', description: 'Configurar telas para os usuários' },
];

export default function PowerBIPage() {
  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Power BI</h1>
          <p className="text-gray-500">Gerencie conexões, relatórios e telas</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-200 transition-all group"
              >
                <div className="p-3 bg-blue-100 rounded-xl w-fit mb-4 group-hover:bg-blue-200 transition-colors">
                  <Icon size={24} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{item.label}</h3>
                <p className="text-gray-500 text-sm">{item.description}</p>
              </Link>
            );
          })}
        </div>
      </div>
    </MainLayout>
  );
}

