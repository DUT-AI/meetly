'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { api } from '@/lib/api';

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

type RegisterPayloadParam = { json: RegisterPayload } | RegisterPayload;

export const useRegister = () => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (param: RegisterPayloadParam) => {
      const payload = 'json' in param ? param.json : param;
      const { data } = await api.post('/auth/register', payload);
      return data;
    },
    onSuccess: () => {
      router.refresh();
      queryClient.invalidateQueries({
        queryKey: ['current'],
      });
      router.push('/');
    },
    onError: (error) => {
      console.error('[REGISTER]: ', error);
      toast.error('Registration is currently managed by system administrators.');
    },
  });

  return mutation;
};
