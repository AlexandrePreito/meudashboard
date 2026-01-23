import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/contexts/ToastContext";

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
    default: 'MeuDashboard - Dashboards e Relatórios Power BI',
    template: '%s | MeuDashboard'
  },
  description: 'Plataforma de gestão de dashboards e relatórios Power BI. Visualize seus dados de forma inteligente com integração de IA.',
  keywords: [
    'dashboard',
    'power bi',
    'relatórios',
    'business intelligence',
    'BI',
    'análise de dados',
    'gestão empresarial',
    'indicadores',
    'KPIs',
    'métricas'
  ],
  authors: [{ name: 'MeuDashboard' }],
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
    title: 'MeuDashboard - Dashboards e Relatórios Power BI',
    description: 'Plataforma de gestão de dashboards e relatórios Power BI. Visualize seus dados de forma inteligente com integração de IA.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'MeuDashboard - Dashboards Power BI',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MeuDashboard - Dashboards e Relatórios Power BI',
    description: 'Plataforma de gestão de dashboards e relatórios Power BI com integração de IA.',
    images: ['/og-image.png'],
  },
  verification: {
    // google: 'seu-codigo-google-search-console', // Adicionar depois
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
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}