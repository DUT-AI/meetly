import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import type { PropsWithChildren } from 'react';

import { NuqsAdapter } from 'nuqs/adapters/next/app';

import { QueryProvider } from '@/components/query-provider';
import { Toaster } from '@/components/ui/sonner';
import { siteConfig } from '@/config';
import { cn } from '@/lib/utils';

import './globals.css';

const inter = Inter({
  subsets: ['latin'],
});

export const metadata: Metadata = siteConfig;

const RootLayout = ({ children }: Readonly<PropsWithChildren>) => {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(inter.className, 'min-h-screen antialiased')}
        suppressHydrationWarning
      >
        <QueryProvider>
          <NuqsAdapter>
            <Toaster theme="light" richColors closeButton />

            {children}
          </NuqsAdapter>
        </QueryProvider>
      </body>
    </html>
  );
};

export default RootLayout;
