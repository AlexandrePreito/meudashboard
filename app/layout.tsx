import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/contexts/ToastContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://meudashboard.org'),
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
    url: 'https://meudashboard.org',
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
    canonical: 'https://meudashboard.org',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
