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
    const targetId = String(user.id || (user as any).$id || '');
    return (
      members.documents.find((m) => {
        const mUserId = String(m.userId || m.user_id || '');
        return mUserId && mUserId === targetId;
      }) || null
    );
  }, [user, members]);

  return {
    data: currentMember,
    isLoading: isLoadingUser || isLoadingMembers,
  };
};
