import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import type { PropsWithChildren } from 'react';

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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                function shouldSuppress(args) {
                  for (let i = 0; i < args.length; i++) {
                    const str = typeof args[i] === 'object' ? JSON.stringify(args[i]) : String(args[i] || '');
                    if (str.includes('bis_skin_checked') || str.includes('hydration-mismatch') || str.includes('A tree hydrated')) {
                      return true;
                    }
                  }
                  return false;
                }
                const origError = console.error;
                console.error = function(...args) {
                  if (shouldSuppress(args)) return;
                  origError.apply(console, args);
                };
                const origWarn = console.warn;
                console.warn = function(...args) {
                  if (shouldSuppress(args)) return;
                  origWarn.apply(console, args);
                };
              })();
            `,
          }}
        />
      </head>
      <body className={cn(inter.className, 'min-h-screen antialiased')} suppressHydrationWarning>
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
