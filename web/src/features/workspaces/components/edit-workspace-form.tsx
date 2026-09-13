'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CameraIcon, CopyIcon, ImageIcon } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

import { DottedSeparator } from '@/components/dotted-separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useDeleteWorkspace } from '@/features/workspaces/api/use-delete-workspace';
import { useResetInviteCode } from '@/features/workspaces/api/use-reset-invite-code';
import { useUpdateWorkspace } from '@/features/workspaces/api/use-update-workspace';
import { MembersList } from '@/features/workspaces/components/members-list';
import { WorkspaceLabelManagement } from '@/features/workspaces/components/workspace-label-management';
import { updateWorkspaceSchema } from '@/features/workspaces/schema';
import type { Workspace } from '@/features/workspaces/types';
import { useConfirm } from '@/hooks/use-confirm';
import { cn } from '@/lib/utils';

interface EditWorkspaceFormProps {
  onCancel?: () => void;
  initialValues: Workspace;
}

export const EditWorkspaceForm = ({ onCancel, initialValues }: EditWorkspaceFormProps) => {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [DeleteDialog, confirmDelete] = useConfirm('Delete workspace', 'This action cannot be undone.', 'destructive');
  const [ResetDialog, confirmReset] = useConfirm(
    'Reset invite link',
    'This action will invalidate the current invite link.',
    'destructive',
  );

  const { mutate: updateWorkspace, isPending: isUpdatingWorkspace } = useUpdateWorkspace();
  const { mutate: deleteWorkspace, isPending: isDeletingWorkspace } = useDeleteWorkspace();
  const { mutate: resetInviteCode, isPending: isResettingInviteCode } = useResetInviteCode();

  const updateWorkspaceForm = useForm<z.infer<typeof updateWorkspaceSchema>>({
    resolver: zodResolver(updateWorkspaceSchema),
    defaultValues: {
      ...initialValues,
      note: initialValues.note || '',
      discord_room_id: initialValues.discord_room_id || initialValues.discordRoomId || '',
      image: initialValues.imageUrl ?? '',
    },
  });

  const onSubmit = (values: z.infer<typeof updateWorkspaceSchema>) => {
    const wasImageRemoved = Boolean(initialValues.imageUrl) && !values.image;

    const finalValues = {
      ...values,
      image: values.image instanceof File ? values.image : '',
      remove_image: wasImageRemoved,
    };

    updateWorkspace({
      form: finalValues,
      param: { workspaceId: initialValues.$id },
    });
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

      updateWorkspaceForm.setValue('image', file, { shouldValidate: true, shouldDirty: true });
    }
  };

  const handleDelete = async () => {
    const ok = await confirmDelete();

    if (!ok) return;

    deleteWorkspace(
      {
        param: { workspaceId: initialValues.$id },
      },
      {
        onSuccess: () => {
          window.location.href = '/';
        },
      },
    );
  };

  const handleResetInviteCode = async () => {
    const ok = await confirmReset();

    if (!ok) return;

    resetInviteCode({
      param: { workspaceId: initialValues.$id },
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(fullInviteLink).then(() => toast.success('Invite link copied to clipboard.'));
  };

  const fullInviteLink = `${process.env.NEXT_PUBLIC_APP_BASE_URL}/workspaces/${initialValues.$id}/join/${initialValues.inviteCode}`;
  const isPending = isUpdatingWorkspace || isDeletingWorkspace || isResettingInviteCode;

  return (
    <div className="flex flex-col gap-y-4">
      <DeleteDialog />
      <ResetDialog />

      <Card className="size-full border-none shadow-none">
        <CardHeader className="flex flex-row items-center gap-x-4 space-y-0 p-7">

          <div className="flex flex-col">
            <CardTitle className="text-xl font-bold">{initialValues.name}</CardTitle>
            <p className="text-sm text-muted-foreground">Chỉnh sửa thông tin cơ bản của phòng ban.</p>
          </div>
        </CardHeader>

        <div className="px-7">
          <DottedSeparator />
        </div>

        <CardContent className="p-7">
          <Form {...updateWorkspaceForm}>
            <form onSubmit={updateWorkspaceForm.handleSubmit(onSubmit)}>
              <div className="flex flex-col gap-y-4">
                <FormField
                  disabled={isPending}
                  control={updateWorkspaceForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tên phòng ban</FormLabel>

                      <FormControl>
                        <Input {...field} type="text" placeholder="Nhập tên phòng ban" />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  disabled={isPending}
                  control={updateWorkspaceForm.control}
                  name="discord_room_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discord Room / Channel ID (Kênh thông báo Discord)</FormLabel>

                      <FormControl>
                        <Input
                          {...field}
                          type="text"
                          placeholder="Ví dụ: 123456789012345678"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Nhập Channel ID của Discord để nhận thông báo tức thời khi bất kỳ công việc nào trong phòng ban được chuyển trạng thái.
                      </p>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  disabled={isPending}
                  control={updateWorkspaceForm.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ghi chú / Quy định phòng ban (Note)</FormLabel>

                      <FormControl>
                        <Textarea
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          onFocus={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          className="resize-none overflow-hidden"
                          rows={4}
                          placeholder="Nhập ghi chú, quy định hoặc thông báo chung của phòng ban..."
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Ghi chú này sẽ được hiển thị nổi bật ở trang Tổng quan phòng ban cho toàn bộ thành viên.
                      </p>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  disabled={isPending}
                  control={updateWorkspaceForm.control}
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
                                      field.onChange('');
                                      updateWorkspaceForm.setValue('image', '', {
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
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="size-full border-none shadow-none">
        <CardContent className="p-7">
          <div className="flex flex-col">
            <h3 className="font-bold">Mời nhân sự vào phòng ban</h3>

            <p className="text-sm text-muted-foreground">Sử dụng liên kết mời để thêm nhân sự vào phòng ban của bạn.</p>

            <div className="mt-4">
              <div className="flex items-center gap-x-2">
                <Input value={fullInviteLink} disabled className="disabled:cursor-default disabled:opacity-100" />

                <Button onClick={handleCopy} variant="secondary" className="size-12">
                  <CopyIcon className="size-5" />
                </Button>
              </div>
            </div>

            <DottedSeparator className="py-7" />

            <Button
              size="sm"
              variant="destructive"
              type="button"
              disabled={isPending}
              onClick={handleResetInviteCode}
              className="ml-auto mt-6 w-fit"
            >
              Tạo lại mã mời
            </Button>
          </div>
        </CardContent>
      </Card>

      <MembersList hideBackButton />

      <WorkspaceLabelManagement workspaceId={initialValues.$id} />

      <Card className="size-full border-none shadow-none">
        <CardContent className="p-7">
          <div className="flex flex-col">
            <h3 className="font-bold text-red-600">Vùng nguy hiểm</h3>

            <p className="text-sm text-muted-foreground">Xóa phòng ban là hành động không thể khôi phục và sẽ xóa toàn bộ dự án, công việc liên quan.</p>

            <DottedSeparator className="py-7" />

            <Button
              size="sm"
              variant="destructive"
              type="button"
              disabled={isPending}
              onClick={handleDelete}
              className="ml-auto mt-6 w-fit"
            >
              Xóa phòng ban
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
