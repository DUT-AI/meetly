'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { authService } from '../services';

export const useLogout = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async () => {
      return await authService.logout();
    },
    onSuccess: () => {
      queryClient.setQueryData(['current'], null);
      queryClient.invalidateQueries();
      router.refresh();
      router.push('/sign-in');
    },
    onError: () => {
      queryClient.setQueryData(['current'], null);
      router.refresh();
      router.push('/sign-in');
    },
  });

  return mutation;
};
