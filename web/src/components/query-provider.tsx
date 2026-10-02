'use client';

import { QueryClient, QueryClientProvider, isServer } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

if (typeof window !== 'undefined') {
  const shouldSuppress = (args: any[]) => {
    for (let i = 0; i < args.length; i++) {
      const str = typeof args[i] === 'object' ? JSON.stringify(args[i]) : String(args[i] || '');
      if (str.includes('bis_skin_checked') || str.includes('hydration-mismatch') || str.includes('A tree hydrated')) {
        return true;
      }
    }
    return false;
  };

  const origError = console.error;
  console.error = (...args: any[]) => {
    if (shouldSuppress(args)) return;
    origError(...args);
  };

  const origWarn = console.warn;
  console.warn = (...args: any[]) => {
    if (shouldSuppress(args)) return;
    origWarn(...args);
  };
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export const QueryProvider = ({ children }: PropsWithChildren) => {
  const queryClient = getQueryClient();

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};
