'use client';

import { useQuery } from '@tanstack/react-query';

import { memberApi } from './member-api';

interface UseGetMembersProps {
  workspaceId: string;
}

export const useGetMembers = ({ workspaceId }: UseGetMembersProps) => {
  const query = useQuery({
    queryKey: ['members', workspaceId],
    queryFn: async () => {
      return await memberApi.getMembers(workspaceId);
    },
    enabled: !!workspaceId,
  });

  return query;
};
