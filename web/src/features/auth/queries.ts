'use server';

import { serverFetch } from '@/lib/api-server';
import type { User } from './types';

export const getCurrent = async (): Promise<User | null> => {
  try {
    const user = await serverFetch<User>('/auth/me');
    if (user && !user.$id) {
      user.$id = String(user.id);
    }
    return user;
  } catch {
    return null;
  }
};
