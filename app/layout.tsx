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

export const metadata: Metadata = {
  metadataBase: new URL(getBaseUrl()),
  title: {
    default: 'MeuDashboard — Dashboards Power BI com Inteligência Artificial',
    template: '%s | MeuDashboard'
  },
  description: 'Hospede seus dashboards Power BI em uma plataforma inteligente. Consulte dados por WhatsApp com IA, receba alertas automáticos e controle o acesso por usuário. Comece grátis.',
  keywords: [
    'dashboard power bi',
    'power bi embed',
    'hospedar dashboard power bi',
    'plataforma power bi',
    'power bi whatsapp',
    'consultar dados whatsapp',
    'inteligência artificial power bi',
    'IA business intelligence',
    'relatórios power bi',
    'business intelligence',
    'análise de dados com IA',
    'alertas power bi whatsapp',
    'gestão de dashboards',
    'power bi para clientes',
    'white label power bi',
    'embed power bi react',
    'KPIs',
    'métricas empresariais',
    'SaaS dashboard',
    'multi tenant power bi'
  ],
  authors: [{ name: 'MeuDashboard', url: 'https://meudashboard.org' }],
  creator: 'MeuDashboard',
  publisher: 'MeuDashboard',
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
    url: getBaseUrl(),
    siteName: 'MeuDashboard',
    title: 'MeuDashboard — Dashboards Power BI com Inteligência Artificial',
    description: 'Hospede dashboards Power BI, consulte dados por WhatsApp com IA e receba alertas automáticos. Plataforma completa para empresas e consultorias de BI.',
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
    description: 'Consulte seus dados por WhatsApp com Inteligência Artificial. Hospede dashboards Power BI com controle de acesso e alertas automáticos.',
    images: ['/og-image.png'],
  },
  verification: {
    // google: 'seu-codigo-google-search-console',
  },
  alternates: {
    canonical: getBaseUrl(),
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
        <ToastProvider>
          <Providers>
            {children}
          </Providers>
        </ToastProvider>
      </body>
    </html>
  );
}