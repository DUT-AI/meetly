'use client';

import { useQuery } from '@tanstack/react-query';

import { api } from '@/lib/api';

export interface SystemUser {
  id: string | number;
  name: string;
  email: string;
  avatar_url?: string | null;
}

interface UseGetUsersProps {
  search?: string | null;
}

export const useGetUsers = ({ search }: UseGetUsersProps = {}) => {
  const query = useQuery({
    queryKey: ['users', 'option', search ?? ''],
    queryFn: async () => {
      const response = await api.get<SystemUser[]>('/users/option', {
        params: {
          search: search || undefined,
        },
      });
      return {
        items: response.data,
        total: response.data?.length ?? 0,
      };
    },
  });

  return query;
};
