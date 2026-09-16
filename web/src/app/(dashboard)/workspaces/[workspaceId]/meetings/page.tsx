import { redirect } from 'next/navigation';
import { getCurrent } from '@/features/auth/queries';
import { MeetingsClient } from './client';

const MeetingsPage = async () => {
  const user = await getCurrent();
  if (!user) redirect('/sign-in');

  return <MeetingsClient />;
};

export default MeetingsPage;
