'use client';

import { useMemo } from 'react';

import { useCurrent } from '@/features/auth/api/use-current';
import { useGetMembers } from './use-get-members';

interface UseCurrentMemberProps {
  workspaceId: string;
}

export const useCurrentMember = ({ workspaceId }: UseCurrentMemberProps) => {
  const { data: user, isLoading: isLoadingUser } = useCurrent();
  const { data: members, isLoading: isLoadingMembers } = useGetMembers({ workspaceId });

  const currentMember = useMemo(() => {
    if (!user || !members?.documents) return null;
    return members.documents.find((member) => member.userId === user.id || member.userId === (user as any).$id) || null;
  }, [user, members]);

  return {
    data: currentMember,
    isLoading: isLoadingUser || isLoadingMembers,
  };
};
