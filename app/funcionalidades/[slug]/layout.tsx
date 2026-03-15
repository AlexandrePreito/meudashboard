const FEATURES_META: Record<string, { title: string; subtitle: string }> = {
  'dashboards-power-bi': {
    title: 'Dashboards Power BI',
    subtitle: 'Integre e compartilhe seus relatórios Power BI com segurança, performance e controle total.',
  },
  'ia-whatsapp': {
    title: 'IA no WhatsApp',
    subtitle: 'Consulte seus dados por mensagem. A IA analisa, interpreta e sugere ações em linguagem natural.',
  },
  'alertas-automaticos': {
    title: 'Alertas automáticos',
    subtitle: 'Receba notificações no WhatsApp quando métricas ultrapassarem limites. Nunca perca um dado importante.',
  },
  'controle-de-acesso': {
    title: 'Controle de acesso',
    subtitle: 'Cada usuário vê apenas o que deve. Controle por tela, página e dados com Row-Level Security.',
  },
  'atualizacao-monitorada': {
    title: 'Atualização monitorada',
    subtitle: 'Monitore datasets e dataflows em tempo real. Saiba imediatamente quando algo falhar.',
  },
  'multi-tenant': {
    title: 'Multi-tenant',
    subtitle: 'Grupos de empresa isolados. Gerencie múltiplos clientes com segurança e independência total.',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = FEATURES_META[slug];
  if (!meta) return { title: 'Funcionalidades | MeuDashboard' };
  return {
    title: meta.title,
    description: meta.subtitle,
    openGraph: {
      title: `${meta.title} | MeuDashboard`,
      description: meta.subtitle,
      url: `/funcionalidades/${slug}`,
    },
  };
}

export default function FuncionalidadeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
