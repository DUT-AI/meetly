'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { DatePicker } from '@/components/date-picker';
import { DateTimePicker } from '@/components/date-time-picker';
import { DottedSeparator } from '@/components/dotted-separator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { MemberAvatar } from '@/features/members/components/member-avatar';
import { ProjectAvatar } from '@/features/projects/components/project-avatar';
import { useCreateProjectModal } from '@/features/projects/hooks/use-create-project-modal';
import { useCreateTask } from '@/features/tasks/api/use-create-task';
import { TaskPriorityBadge } from '@/features/tasks/components/task-priority-badge';
import { createTaskSchema } from '@/features/tasks/schema';
import { TaskPriority, TaskStatus } from '@/features/tasks/types';
import { useGetLabels } from '@/features/workspaces/api/use-get-labels';
import { useWorkspaceId } from '@/features/workspaces/hooks/use-workspace-id';
import { cn } from '@/lib/utils';

interface CreateTaskFormProps {
  initialStatus?: TaskStatus | null;
  onCancel?: () => void;
  projectOptions: { id: string; name: string; imageUrl?: string }[];
  memberOptions: { id: string; name: string; imageUrl?: string }[];
}

export const CreateTaskForm = ({ initialStatus, onCancel, memberOptions, projectOptions }: CreateTaskFormProps) => {
  const workspaceId = useWorkspaceId();
  const { data: workspaceLabels } = useGetLabels({ workspaceId });
  const { open: openCreateProjectModal } = useCreateProjectModal();

  const { mutate: createTask, isPending } = useCreateTask();

  const createTaskForm = useForm<z.infer<typeof createTaskSchema>>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      name: '',
      dueDate: undefined,
      assigneeId: undefined,
      description: '',
      projectId: undefined,
      status: initialStatus ?? undefined,
      priority: TaskPriority.MEDIUM,
      labels: [],
      workspaceId,
    },
  });

  useEffect(() => {
    if (projectOptions.length === 1 && !createTaskForm.getValues('projectId')) {
      createTaskForm.setValue('projectId', projectOptions[0].id, { shouldValidate: true });
    }
  }, [projectOptions, createTaskForm]);

  const onSubmit = (values: z.infer<typeof createTaskSchema>) => {
    createTask(
      {
        json: values,
      },
      {
        onSuccess: () => {
          createTaskForm.reset();
          onCancel?.();
        },
      },
    );
  };

  return (
    <Card className="size-full border-none shadow-none">
      <CardHeader className="flex p-7 pb-4">
        <CardTitle className="text-xl font-bold">Create a new task</CardTitle>
      </CardHeader>

      <div className="px-7">
        <DottedSeparator />
      </div>

      <CardContent className="p-7">
        <Form {...createTaskForm}>
          <form onSubmit={createTaskForm.handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Properties */}
              <div className="flex flex-col gap-y-4">
                <FormField
                  disabled={isPending}
                  control={createTaskForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Task Name</FormLabel>

                      <FormControl>
                        <Input {...field} type="text" placeholder="Enter task name" />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    disabled={isPending}
                    control={createTaskForm.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>

                        <FormControl>
                          <DateTimePicker {...field} disabled={isPending} placeholder="Select due date and time" />
                        </FormControl>

                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    disabled={isPending}
                    control={createTaskForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>

                        <Select disabled={isPending} defaultValue={field.value} value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>{field.value ? <SelectValue placeholder="Select status" /> : 'Select status'}</SelectTrigger>
                          </FormControl>

                          <FormMessage />

                          <SelectContent>
                            <SelectItem value={TaskStatus.BACKLOG}>Backlog</SelectItem>
                            <SelectItem value={TaskStatus.TODO}>Todo</SelectItem>
                            <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                            <SelectItem value={TaskStatus.IN_REVIEW}>In Review</SelectItem>
                            <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    disabled={isPending}
                    control={createTaskForm.control}
                    name="projectId"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between">
                          <FormLabel>Project (Dự án)</FormLabel>
                          {projectOptions.length === 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                onCancel?.();
                                openCreateProjectModal();
                              }}
                              className="text-xs text-blue-600 hover:underline cursor-pointer font-medium"
                            >
                              + Tạo dự án mới
                            </button>
                          )}
                        </div>

                        <Select
                          disabled={isPending || projectOptions.length === 0}
                          defaultValue={field.value}
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              {field.value ? (
                                (() => {
                                  const selectedProject = projectOptions.find((p) => p.id === field.value);
                                  if (selectedProject) {
                                    return (
                                      <div className="flex items-center gap-x-2 truncate">
                                        <ProjectAvatar className="size-5" name={selectedProject.name} image={selectedProject.imageUrl} />
                                        <span className="truncate">{selectedProject.name}</span>
                                      </div>
                                    );
                                  }
                                  return <SelectValue placeholder="Select project" />;
                                })()
                              ) : (
                                projectOptions.length === 0 ? 'Chưa có dự án nào' : 'Select project'
                              )}
                            </SelectTrigger>
                          </FormControl>

                          <FormMessage />

                          <SelectContent>
                            {projectOptions.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                <div className="flex items-center gap-x-2">
                                  <ProjectAvatar className="size-5" name={project.name} image={project.imageUrl} />
                                  <span className="truncate">{project.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {projectOptions.length === 0 && (
                          <p className="text-xs text-amber-600 mt-1.5">
                            Phòng ban này chưa có dự án nào.{' '}
                            <button
                              type="button"
                              onClick={() => {
                                onCancel?.();
                                openCreateProjectModal();
                              }}
                              className="underline font-semibold cursor-pointer text-blue-600 hover:text-blue-700"
                            >
                              Tạo dự án mới tại đây
                            </button>{' '}
                            trước khi tạo công việc.
                          </p>
                        )}
                      </FormItem>
                    )}
                  />

                  <FormField
                    disabled={isPending}
                    control={createTaskForm.control}
                    name="assigneeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assignee</FormLabel>

                        <Select disabled={isPending} defaultValue={field.value} value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              {field.value ? (
                                (() => {
                                  const selectedMember = memberOptions.find((m) => m.id === field.value);
                                  if (selectedMember) {
                                    return (
                                      <div className="flex items-center gap-x-2 truncate">
                                        <MemberAvatar className="size-5" name={selectedMember.name} image={selectedMember.imageUrl} />
                                        <span className="truncate">{selectedMember.name}</span>
                                      </div>
                                    );
                                  }
                                  return <SelectValue placeholder="Select assignee" />;
                                })()
                              ) : (
                                'Select assignee'
                              )}
                            </SelectTrigger>
                          </FormControl>

                          <FormMessage />

                          <SelectContent>
                            {memberOptions.map((member) => (
                              <SelectItem key={member.id} value={member.id}>
                                <div className="flex items-center gap-x-2">
                                  <MemberAvatar className="size-5" name={member.name} image={member.imageUrl} />
                                  <span className="truncate">{member.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  disabled={isPending}
                  control={createTaskForm.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Priority (Độ ưu tiên)</FormLabel>

                      <Select disabled={isPending} defaultValue={field.value} value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn độ ưu tiên" />
                          </SelectTrigger>
                        </FormControl>

                        <FormMessage />

                        <SelectContent>
                          <SelectItem value={TaskPriority.LOW}>
                            <div className="flex items-center gap-x-2">
                              <TaskPriorityBadge priority={TaskPriority.LOW} />
                            </div>
                          </SelectItem>
                          <SelectItem value={TaskPriority.MEDIUM}>
                            <div className="flex items-center gap-x-2">
                              <TaskPriorityBadge priority={TaskPriority.MEDIUM} />
                            </div>
                          </SelectItem>
                          <SelectItem value={TaskPriority.HIGH}>
                            <div className="flex items-center gap-x-2">
                              <TaskPriorityBadge priority={TaskPriority.HIGH} />
                            </div>
                          </SelectItem>
                          <SelectItem value={TaskPriority.URGENT}>
                            <div className="flex items-center gap-x-2">
                              <TaskPriorityBadge priority={TaskPriority.URGENT} />
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />

                <FormField
                  disabled={isPending}
                  control={createTaskForm.control}
                  name="labels"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Labels (Nhãn công việc)</FormLabel>

                      <div className="flex flex-wrap gap-1.5 p-2 rounded-md border min-h-[42px] bg-background">
                        {(!workspaceLabels || workspaceLabels.length === 0) ? (
                          <p className="text-xs text-muted-foreground italic py-1">
                            Chưa có nhãn trong phòng ban. Bạn có thể thêm nhãn tại Cài đặt phòng ban.
                          </p>
                        ) : (
                          workspaceLabels.map((lbl) => {
                            const isSelected = (field.value || []).includes(lbl.name);
                            return (
                              <button
                                key={lbl.id}
                                type="button"
                                onClick={() => {
                                  const current = field.value || [];
                                  if (isSelected) {
                                    field.onChange(current.filter((name: string) => name !== lbl.name));
                                  } else {
                                    field.onChange([...current, lbl.name]);
                                  }
                                }}
                                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                                  isSelected
                                    ? 'text-white ring-2 ring-offset-1 ring-primary shadow-sm'
                                    : 'text-neutral-600 bg-neutral-100 hover:bg-neutral-200 opacity-70'
                                }`}
                                style={{
                                  backgroundColor: isSelected ? lbl.color : undefined,
                                }}
                              >
                                {lbl.name}
                              </button>
                            );
                          })
                        )}
                      </div>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Right Column: Description */}
              <div className="flex flex-col gap-y-4">
                <FormField
                  disabled={isPending}
                  control={createTaskForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem className="flex flex-col h-full">
                      <FormLabel>Description (Mô tả công việc)</FormLabel>

                      <FormControl className="flex-1">
                        <Textarea
                          {...field}
                          value={field.value || ''}
                          className="min-h-[260px] lg:min-h-[360px] resize-y leading-relaxed text-sm"
                          placeholder="Nhập mô tả chi tiết, hướng dẫn thực hiện, tiêu chí hoàn thành..."
                        />
                      </FormControl>

                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DottedSeparator className="my-6" />

            <div className="flex items-center justify-between">
              <Button
                disabled={isPending}
                type="button"
                size="lg"
                variant="secondary"
                onClick={onCancel}
                className={cn(!onCancel && 'invisible')}
              >
                Cancel
              </Button>

              <Button disabled={isPending} type="submit" size="lg">
                Create Task
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
