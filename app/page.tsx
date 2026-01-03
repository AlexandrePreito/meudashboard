/**
 * Página inicial do MeuDashboard
 * 
 * Exibe a página principal do sistema com:
 * - Título de boas-vindas
 * - Grid de cards com estatísticas principais do sistema
 * - Dashboards Ativos, Usuários, Alertas Hoje e Consultas IA
 */

import MainLayout from '@/components/layout/MainLayout';

// Tipos para os cards de estatísticas
interface StatCard {
  icon: string;
  title: string;
  value: number;
}

// Dados dos cards de estatísticas
const statCards: StatCard[] = [
  { icon: '📊', title: 'Dashboards Ativos', value: 12 },
  { icon: '👥', title: 'Usuários', value: 48 },
  { icon: '🔔', title: 'Alertas Hoje', value: 5 },
  { icon: '💬', title: 'Consultas IA', value: 156 },
];

export default function Home() {
  return (
    <MainLayout>
      <div>
        <h1 className="text-2xl font-bold text-gray-800">
          Bem-vindo ao MeuDashboard
        </h1>
        <p className="text-gray-600 mt-2">
          Seu sistema de Business Intelligence
        </p>

        {/* Grid de cards de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          {statCards.map((card) => (
            <div
              key={card.title}
              className="bg-white rounded-lg shadow p-6"
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{card.icon}</span>
                <div className="flex-1">
                  <p className="text-sm text-gray-600 font-medium">
                    {card.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-800 mt-1">
                    {card.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}