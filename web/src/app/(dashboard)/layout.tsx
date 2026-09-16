import type { PropsWithChildren } from 'react';

import { ModalProvider } from '@/components/modal-provider';
import { Navbar } from '@/components/navbar';
import { Sidebar } from '@/components/sidebar';

const DashboardLayout = ({ children }: PropsWithChildren) => {
  return (
    <div className="min-h-screen">
      <ModalProvider />

      <div className="flex size-full">
        <div className="fixed left-0 top-0 hidden h-full overflow-auto lg:block lg:w-[264px] print:hidden no-print">
          <Sidebar />
        </div>

        <div className="w-full lg:pl-[264px] print:pl-0 print:w-full">
          <div className="mx-auto h-full max-w-screen-xl print:max-w-none print:w-full print:p-0">
            <Navbar />

            <main className="flex h-full flex-col px-6 py-8 print:p-0 print:m-0">{children}</main>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DashboardLayout;
