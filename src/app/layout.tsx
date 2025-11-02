import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/utils/cn';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import OfflineIndicator from '@/components/layout/OfflineIndicator';
import ServiceWorkerRegistration from './register-sw';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

export const metadata: Metadata = {
  title: 'WeFit Labs Live Leaderboard',
  description: 'Mobile-first real-time pickleball tournament experience for WeFit Labs NYC events.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'WeFit Labs'
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className={cn('bg-wefit-dark text-wefit-white min-h-screen', inter.variable, jetbrains.variable)}>
        <AuthProvider>
          <ToastProvider>
            <ServiceWorkerRegistration />
            {children}
            <OfflineIndicator />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
