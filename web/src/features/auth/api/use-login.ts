'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { authService } from '../services';
import type { LoginInput } from '../types';

type LoginPayloadParam = { json: LoginInput } | LoginInput;

export const useLogin = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (param: LoginPayloadParam) => {
      const payload = 'json' in param ? param.json : param;
      return await authService.login(payload);
    },
    onSuccess: () => {
      router.refresh();
      queryClient.invalidateQueries({
        queryKey: ['current'],
      });
    },
    onError: () => {
      toast.error('Email or Password is incorrect!');
    },
  });

  return mutation;
};
