import Link from 'next/link';
import { Suspense } from 'react';

import { DottedSeparator } from './dotted-separator';
import { Logo } from './logo';
import { GlobalNavigation, Navigation } from './navigation';
import { Projects } from './projects';
import { WorkspaceSwitcher } from './workspaces-switcher';

export const Sidebar = () => {
  return (
    <aside className="flex size-full flex-col bg-neutral-100 p-4">
      <Logo />

      <DottedSeparator className="my-4" />

      <GlobalNavigation />

      <DottedSeparator className="my-4" />

      <Suspense>
        <WorkspaceSwitcher />
      </Suspense>

      <DottedSeparator className="my-4" />

      <Navigation />

      <DottedSeparator className="my-4" />

      <Suspense>
        <Projects />
      </Suspense>

      <div className="mt-auto pt-6 text-center text-xs text-neutral-400">
        <Link href="/privacy" className="hover:text-neutral-700 hover:underline">
          Chính sách quyền riêng tư
        </Link>
      </div>
    </aside>
  );
};
