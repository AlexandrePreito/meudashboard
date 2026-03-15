import { MetadataRoute } from 'next';

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'https://meudashboard.org';
}

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard/',
          '/tela/',
          '/configuracoes/',
          '/perfil/',
          '/trocar-senha/',
          '/dev/',
          '/administrador/',
          '/powerbi/',
          '/whatsapp/',
          '/alertas/',
          '/meus-logs/',
          '/assistente-ia/',
          '/redefinir-senha',
        ],
      },
      {
        userAgent: 'Googlebot',
        allow: ['/', '/funcionalidades/', '/cadastro', '/login', '/termos-de-uso', '/politica-de-privacidade', '/politica-de-cookies'],
        disallow: ['/api/', '/dashboard/', '/tela/', '/dev/', '/administrador/', '/configuracoes/', '/perfil/', '/powerbi/', '/whatsapp/', '/alertas/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
