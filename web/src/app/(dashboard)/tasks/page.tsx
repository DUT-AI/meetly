import { redirect } from 'next/navigation';

import { getCurrent } from '@/features/auth/queries';
import { GlobalTaskView } from '@/features/tasks/components/global-task-view';

const MyTasksPage = async () => {
  const user = await getCurrent();

  if (!user) redirect('/sign-in');

  return (
    <div className="flex flex-col h-full bg-neutral-50/50">
      <GlobalTaskView userId={user.$id || ""} />
    </div>
  );
};

export default MyTasksPage;
