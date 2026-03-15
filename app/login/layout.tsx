import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Entrar',
  description:
    'Acesse o MeuDashboard: plataforma de dashboards Power BI com IA no WhatsApp, alertas e controle de acesso. Faça login para gerenciar seus relatórios.',
  openGraph: {
    title: 'Entrar | MeuDashboard',
    description:
      'Acesse o MeuDashboard: dashboards Power BI, IA no WhatsApp e alertas. Faça login para gerenciar seus relatórios.',
    url: '/login',
  },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
