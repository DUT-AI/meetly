import { redirect } from 'next/navigation';

import { getCurrent } from '@/features/auth/queries';
import { getWorkspaces } from '@/features/workspaces/queries';

const HomePage = async () => {
  const user = await getCurrent();

  if (!user) redirect('/sign-in');

  const workspaces = await getWorkspaces();

  // Bỏ nghiệp vụ bắt buộc người dùng tạo workspace khi đăng nhập
  // if (workspaces.total === 0) redirect('/workspaces/create');
  if (workspaces.total === 0) redirect('/tasks');

  redirect(`/workspaces/${workspaces.documents[0].$id}`);
};

export default HomePage;
