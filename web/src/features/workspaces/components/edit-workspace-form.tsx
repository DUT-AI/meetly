'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, CopyIcon, ImageIcon } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
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
      notify_on_task_status_change:
        initialValues.notify_on_task_status_change ?? initialValues.notifyOnTaskStatusChange ?? true,
      notify_task_status_discord:
        initialValues.notify_task_status_discord ?? initialValues.notifyTaskStatusDiscord ?? true,
      notify_task_status_zalo:
        initialValues.notify_task_status_zalo ?? initialValues.notifyTaskStatusZalo ?? true,
      zalo_room_id: initialValues.zalo_room_id || initialValues.zaloRoomId || '',
      image: initialValues.imageUrl ?? '',
    },
  });

  const onSubmit = (values: z.infer<typeof updateWorkspaceSchema>) => {
    const finalValues = {
      ...values,
      image: values.image instanceof File ? values.image : '',
    };

    updateWorkspace({
      form: finalValues,
      param: { workspaceId: initialValues.$id },
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1 MB in bytes;
    const file = e.target.files?.[0];

    if (file) {
      if (file.size > MAX_FILE_SIZE) return toast.error('Image size cannot exceed 1 MB.');

      updateWorkspaceForm.setValue('image', file);
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

                {/* Cài đặt thông báo phòng ban */}
                <div className="rounded-lg border bg-neutral-50/50 p-4 dark:bg-neutral-900/50 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold">Cài đặt thông báo thay đổi trạng thái công việc</h4>
                    <p className="text-xs text-muted-foreground">
                      Tùy chỉnh các kênh nhận thông báo tự động khi công việc trong phòng ban được đổi trạng thái.
                    </p>
                  </div>

                  {/* 1. Thông báo In-App */}
                  <FormField
                    disabled={isPending}
                    control={updateWorkspaceForm.control}
                    name="notify_on_task_status_change"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-md border bg-background p-3 shadow-sm">
                        <div className="space-y-0.5 pr-4">
                          <FormLabel className="text-sm font-medium">Thông báo trong hệ thống (In-App)</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Gửi thông báo tới người thực hiện và quản lý phòng ban trên website khi trạng thái công việc thay đổi.
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isPending}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {/* 2. Kênh Discord */}
                  <div className="rounded-md border bg-background p-3 shadow-sm space-y-3">
                    <FormField
                      disabled={isPending}
                      control={updateWorkspaceForm.control}
                      name="notify_task_status_discord"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5 pr-4">
                            <FormLabel className="text-sm font-medium">Kênh thông báo Discord</FormLabel>
                            <p className="text-xs text-muted-foreground">
                              Bật/tắt gửi thông báo đổi trạng thái công việc tới phòng Discord của phòng ban.
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isPending}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      disabled={isPending}
                      control={updateWorkspaceForm.control}
                      name="discord_room_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-muted-foreground">Discord Channel ID</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              placeholder="Ví dụ: 123456789012345678"
                              className="h-9 text-xs"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* 3. Kênh Zalo */}
                  <div className="rounded-md border bg-background p-3 shadow-sm space-y-3">
                    <FormField
                      disabled={isPending}
                      control={updateWorkspaceForm.control}
                      name="notify_task_status_zalo"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between">
                          <div className="space-y-0.5 pr-4">
                            <FormLabel className="text-sm font-medium">Kênh thông báo Zalo</FormLabel>
                            <p className="text-xs text-muted-foreground">
                              Bật/tắt gửi thông báo đổi trạng thái công việc tới nhóm Zalo hoặc Zalo Bot của phòng ban.
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              disabled={isPending}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      disabled={isPending}
                      control={updateWorkspaceForm.control}
                      name="zalo_room_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-muted-foreground">Zalo Chat / Group ID</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="text"
                              placeholder="Nhập ID nhóm hoặc Chat ID Zalo..."
                              className="h-9 text-xs"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

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
                  render={({ field }) => (
                    <div className="flex flex-col gap-y-2">
                      <div className="flex items-center gap-x-5">
                        {field.value ? (
                          <div className="relative size-[72px] overflow-hidden rounded-md">
                            <Image
                              src={field.value instanceof File ? URL.createObjectURL(field.value) : field.value}
                              alt="Logo phòng ban"
                              fill
                              className="object-cover"
                            />
                          </div>
                        ) : (
                          <Avatar className="size-[72px]">
                            <AvatarFallback>
                              <ImageIcon className="size-[36px] text-neutral-400" />
                            </AvatarFallback>
                          </Avatar>
                        )}

                        <div className="flex flex-col">
                          <p className="text-sm font-medium">Biểu tượng phòng ban</p>
                          <p className="text-xs text-muted-foreground">JPG, PNG, hoặc JPEG, tối đa 1MB</p>

                          <input
                            type="file"
                            className="hidden"
                            onChange={handleImageChange}
                            accept=".jpg, .png, .jpeg"
                            ref={inputRef}
                            disabled={isPending}
                          />

                          {field.value ? (
                            <Button
                              type="button"
                              disabled={isPending}
                              variant="destructive"
                              size="xs"
                              className="mt-2 w-fit"
                              onClick={() => {
                                field.onChange('');

                                if (inputRef.current) inputRef.current.value = '';
                              }}
                            >
                              Xóa ảnh
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              disabled={isPending}
                              variant="tertiary"
                              size="xs"
                              className="mt-2 w-fit"
                              onClick={() => inputRef.current?.click()}
                            >
                              Tải ảnh lên
                            </Button>
                          )}
                        </div>
                      </div>

                      <FormMessage />
                    </div>
                  )}
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
