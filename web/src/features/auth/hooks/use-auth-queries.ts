'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { authService } from '../services';
import type { LoginInput } from '../types';

export const AUTH_QUERY_KEY = ['current'] as const;

export function useUserQuery() {
  return useQuery({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      try {
        return await authService.getMe();
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (data: LoginInput) => authService.login(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
      router.refresh();
      router.push('/');
    },
    onError: () => {
      toast.error('Email or Password is incorrect!');
    },
  });
}

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: async () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      await queryClient.invalidateQueries();
      router.refresh();
      router.push('/sign-in');
    },
    onError: async () => {
      queryClient.setQueryData(AUTH_QUERY_KEY, null);
      router.refresh();
      router.push('/sign-in');
    },
  });
}
