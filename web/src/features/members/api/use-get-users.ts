'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface SystemUser {
  id: string | number;
  name: string;
  email: string;
  avatar_url?: string | null;
  role_names?: string[];
  status?: string;
}

interface UseGetUsersProps {
  search?: string | null;
  page?: number;
  pageSize?: number;
}

export const useGetUsers = ({ search, page = 1, pageSize = 30 }: UseGetUsersProps = {}) => {
  const query = useQuery({
    queryKey: ['users', search ?? '', page, pageSize],
    queryFn: async () => {
      const response = await api.get<{
        items: SystemUser[];
        total: number;
        page: number;
        page_size: number;
      }>('/users', {
        params: {
          search: search || undefined,
          page,
          page_size: pageSize,
        },
      });
      return response.data;
    },
  });

  return query;
};
