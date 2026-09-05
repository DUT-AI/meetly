'use client';

import { useUserQuery } from '../hooks/use-auth-queries';

export const useCurrent = () => {
  return useUserQuery();
};
