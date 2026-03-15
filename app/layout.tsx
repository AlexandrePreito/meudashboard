import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/contexts/ToastContext";
import { Providers } from "@/components/providers/Providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Detectar URL base automaticamente
const getBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return 'http://localhost:3000';
};

const siteUrl = getBaseUrl();

// JSON-LD para SEO (Organization + WebSite)
function SeoJsonLd() {
  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'MeuDashboard',
    url: siteUrl,
    logo: `${siteUrl}/og-image.png`,
    description: 'Plataforma de dashboards Power BI com IA. Embed, WhatsApp, alertas e controle de acesso.',
  };
  const webSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'MeuDashboard',
    url: siteUrl,
    description: 'Hospede dashboards Power BI, consulte por WhatsApp com IA e receba alertas. Comece grátis.',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/login` },
      'query-input': 'required name=query',
    },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webSchema) }} />
    </>
  );
}

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'MeuDashboard — Dashboards Power BI com IA | Embed, WhatsApp e Alertas',
    template: '%s | MeuDashboard',
  },
  description:
    'Plataforma para hospedar e compartilhar dashboards Power BI. Consulte dados por WhatsApp com IA, receba alertas automáticos, controle de acesso por usuário e RLS. Sem licença Embed para quem visualiza. Comece grátis.',
  keywords: [
    'dashboard power bi',
    'power bi embed',
    'hospedar dashboard power bi',
    'plataforma power bi brasil',
    'power bi whatsapp',
    'consultar dados whatsapp',
    'inteligência artificial power bi',
    'IA business intelligence',
    'relatórios power bi',
    'alertas power bi whatsapp',
    'controle de acesso power bi',
    'RLS power bi',
    'power bi para clientes',
    'white label power bi',
    'multi tenant power bi',
    'embed power bi sem licença',
    'software house power bi',
    'consultoria BI',
    'KPIs empresariais',
    'meudashboard',
  ],
  authors: [{ name: 'MeuDashboard', url: 'https://meudashboard.org' }],
  creator: 'MeuDashboard',
  publisher: 'MeuDashboard',
  category: 'technology',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    url: siteUrl,
    siteName: 'MeuDashboard',
    title: 'MeuDashboard — Dashboards Power BI com IA | Embed, WhatsApp e Alertas',
    description:
      'Hospede dashboards Power BI, consulte dados por WhatsApp com IA, receba alertas e controle o acesso. Sem licença Embed para quem visualiza. Comece grátis.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MeuDashboard — Dashboards Power BI com IA integrada',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MeuDashboard — Dashboards Power BI com IA',
    description:
      'Consulte dados por WhatsApp com IA. Hospede Power BI com controle de acesso e alertas. Sem licença Embed para visualizadores.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: siteUrl,
  },
  other: {
    'geo.region': 'BR',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans antialiased`}>
        <SeoJsonLd />
        <ToastProvider>
          <Providers>
            {children}
          </Providers>
        </ToastProvider>
      </body>
    </html>
  );
}