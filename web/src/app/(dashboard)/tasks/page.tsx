import { redirect } from 'next/navigation';

import { getCurrent } from '@/features/auth/queries';
import { GlobalTaskView } from '@/features/tasks/components/global-task-view';

const MyTasksPage = async () => {
  const user = await getCurrent();

  if (!user) redirect('/sign-in');

  return (
    <div className="flex h-full flex-col">
      <GlobalTaskView />
    </div>
  );
};

export default MyTasksPage;
