import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/utils/cn';
import { ToastProvider } from '@/components/ui/ToastProvider';
import OfflineIndicator from '@/components/layout/OfflineIndicator';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains' });

export const metadata: Metadata = {
  title: 'WeFit Labs Live Leaderboard',
  description: 'Mobile-first real-time pickleball tournament experience for WeFit Labs NYC events.'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn('bg-wefit-dark text-wefit-white min-h-screen', inter.variable, jetbrains.variable)}>
        <ToastProvider>
          {children}
          <OfflineIndicator />
        </ToastProvider>
      </body>
    </html>
  );
}
