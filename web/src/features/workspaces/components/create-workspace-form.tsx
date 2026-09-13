'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CameraIcon, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { DottedSeparator } from '@/components/dotted-separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useCreateWorkspace } from '@/features/workspaces/api/use-create-workspace';
import { createWorkspaceSchema } from '@/features/workspaces/schema';
import { cn } from '@/lib/utils';

interface CreateWorkspaceFormProps {
  onCancel?: () => void;
}

export const CreateWorkspaceForm = ({ onCancel }: CreateWorkspaceFormProps) => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const { mutate: createWorkspace, isPending } = useCreateWorkspace();

  const createWorkspaceForm = useForm<z.infer<typeof createWorkspaceSchema>>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      name: '',
      image: undefined,
    },
  });

  const onSubmit = (values: z.infer<typeof createWorkspaceSchema>) => {
    const finalValues = {
      ...values,
      image: values.image instanceof File ? values.image : '',
    };

    createWorkspace(
      {
        form: finalValues,
      },
      {
        onSuccess: ({ data }) => {
          createWorkspaceForm.reset();

          router.push(`/workspaces/${data.$id}`);
        },
      },
    );
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB in bytes;
    const file = e.target.files?.[0];

    if (file) {
      const validImageTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp'];

      if (!validImageTypes.includes(file.type) && !file.type.startsWith('image/')) {
        return toast.error('Tệp tải lên phải là hình ảnh hợp lệ (PNG, JPG, JPEG, WEBP).');
      }
      if (file.size > MAX_FILE_SIZE) {
        return toast.error('Kích thước ảnh không được vượt quá 10MB.');
      }

      createWorkspaceForm.setValue('image', file, { shouldValidate: true, shouldDirty: true });
    }
  };

  return (
    <Card className="size-full border-none shadow-none">
      <CardHeader className="flex p-7">
        <CardTitle className="text-xl font-bold">Tạo phòng ban mới</CardTitle>
      </CardHeader>

      <div className="px-7">
        <DottedSeparator />
      </div>

      <CardContent className="p-7">
        <Form {...createWorkspaceForm}>
          <form onSubmit={createWorkspaceForm.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-y-4">
              <FormField
                disabled={isPending}
                control={createWorkspaceForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tên phòng ban</FormLabel>

                    <FormControl>
                      <Input {...field} type="text" placeholder="Nhập tên phòng ban (ví dụ: Phòng Công nghệ, Phòng Marketing)" />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                disabled={isPending}
                control={createWorkspaceForm.control}
                name="image"
                render={({ field }) => {
                  const previewUrl = field.value instanceof File ? URL.createObjectURL(field.value) : field.value;

                  return (
                    <div className="flex flex-col gap-y-2">
                      <div className="flex items-center gap-x-5">
                        <div
                          onClick={() => !isPending && inputRef.current?.click()}
                          className="group relative cursor-pointer"
                          title="Nhấn để tải hoặc đổi ảnh"
                        >
                          {previewUrl ? (
                            <div className="relative size-[72px] overflow-hidden rounded-md border border-neutral-200">
                              <Image
                                src={previewUrl}
                                alt="Logo phòng ban"
                                fill
                                className="object-cover transition group-hover:opacity-75"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
                                <CameraIcon className="size-5 text-white" />
                              </div>
                            </div>
                          ) : (
                            <Avatar className="size-[72px] border border-dashed border-neutral-300 transition group-hover:border-neutral-400">
                              <AvatarFallback className="bg-neutral-50 group-hover:bg-neutral-100">
                                <ImageIcon className="size-[36px] text-neutral-400 group-hover:text-neutral-600 transition" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>

                        <div className="flex flex-col">
                          <p className="text-sm font-medium">Biểu tượng phòng ban</p>
                          <p className="text-xs text-muted-foreground">JPG, PNG, JPEG hoặc WEBP, tối đa 10MB</p>

                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              handleImageChange(e);
                              if (e.target.files?.[0]) {
                                field.onChange(e.target.files[0]);
                              }
                            }}
                            accept="image/png, image/jpeg, image/jpg, image/webp, .png, .jpg, .jpeg, .webp"
                            ref={inputRef}
                            disabled={isPending}
                          />

                          <div className="mt-2 flex items-center gap-x-2">
                            {field.value ? (
                              <>
                                <Button
                                  type="button"
                                  disabled={isPending}
                                  variant="tertiary"
                                  size="xs"
                                  className="w-fit"
                                  onClick={() => inputRef.current?.click()}
                                >
                                  Đổi ảnh
                                </Button>
                                <Button
                                  type="button"
                                  disabled={isPending}
                                  variant="destructive"
                                  size="xs"
                                  className="w-fit"
                                  onClick={() => {
                                    field.onChange(null);
                                    createWorkspaceForm.setValue('image', undefined, {
                                      shouldValidate: true,
                                      shouldDirty: true,
                                    });
                                    if (inputRef.current) inputRef.current.value = '';
                                  }}
                                >
                                  Xóa ảnh
                                </Button>
                              </>
                            ) : (
                              <Button
                                type="button"
                                disabled={isPending}
                                variant="tertiary"
                                size="xs"
                                className="w-fit"
                                onClick={() => inputRef.current?.click()}
                              >
                                Tải ảnh lên
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>

                      <FormMessage />
                    </div>
                  );
                }}
              />
            </div>

            <DottedSeparator className="py-7" />

            <div className="flex items-center justify-between">
              <Button
                disabled={isPending}
                type="button"
                size="lg"
                variant="secondary"
                onClick={onCancel}
                className={cn(!onCancel && 'invisible')}
              >
                Hủy
              </Button>

              <Button disabled={isPending} type="submit" size="lg">
                Tạo phòng ban
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
