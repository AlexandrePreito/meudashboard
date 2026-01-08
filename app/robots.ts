import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
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
        ],
      },
    ],
    sitemap: 'https://meudashboard.org/sitemap.xml',
  };
}
