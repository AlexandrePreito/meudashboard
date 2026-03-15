import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Criar conta',
  description:
    'Crie sua conta no MeuDashboard. Comece grátis: hospede dashboards Power BI, consulte dados por WhatsApp com IA e receba alertas. Sem licença Embed para quem visualiza.',
  openGraph: {
    title: 'Criar conta | MeuDashboard',
    description:
      'Cadastre-se grátis no MeuDashboard: dashboards Power BI, IA no WhatsApp e alertas. Sem licença Embed para visualizadores.',
    url: '/cadastro',
  },
};

export default function CadastroLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
