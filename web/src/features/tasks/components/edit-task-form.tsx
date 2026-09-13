'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { DatePicker } from '@/components/date-picker';
import { DottedSeparator } from '@/components/dotted-separator';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MemberAvatar } from '@/features/members/components/member-avatar';
import { Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ProjectAvatar } from '@/features/projects/components/project-avatar';
import { useUpdateTask } from '@/features/tasks/api/use-update-task';
import { TaskPriorityBadge } from '@/features/tasks/components/task-priority-badge';
import { createTaskSchema } from '@/features/tasks/schema';
import { type PopulatedTask, TaskPriority, TaskStatus } from '@/features/tasks/types';
import { useGetLabels } from '@/features/workspaces/api/use-get-labels';
import { cn } from '@/lib/utils';

interface EditTaskFormProps {
  onCancel?: () => void;
  projectOptions: { id: string; name: string; imageUrl?: string }[];
  memberOptions: { id: string; name: string; imageUrl?: string }[];
  initialValues: PopulatedTask;
}

export const EditTaskForm = ({ onCancel, memberOptions, projectOptions, initialValues }: EditTaskFormProps) => {
  const { data: workspaceLabels } = useGetLabels({ workspaceId: initialValues.workspaceId });
  const { mutate: updateTask, isPending } = useUpdateTask();

  const editTaskSchema = createTaskSchema.omit({ workspaceId: true, description: true });
  type EditTaskValues = z.infer<typeof editTaskSchema>;

  const editTaskForm = useForm<EditTaskValues>({
    resolver: zodResolver(editTaskSchema),
    defaultValues: {
      name: initialValues.name,
      status: initialValues.status,
      priority: initialValues.priority || TaskPriority.MEDIUM,
      labels: initialValues.labels || [],
      projectId: initialValues.projectId,
      assigneeId: initialValues.assigneeId,
      assigneeIds: initialValues.assigneeIds?.length
        ? initialValues.assigneeIds
        : (initialValues.assignees?.map((m) => m.id) ?? (initialValues.assigneeId ? [initialValues.assigneeId] : [])),
      dueDate: initialValues.dueDate ? new Date(initialValues.dueDate) : undefined,
    },
  });

  const onSubmit = (values: EditTaskValues) => {
    updateTask(
      {
        json: {
          ...values,
          assigneeId: values.assigneeIds?.[0] || values.assigneeId || undefined,
        },
        param: { taskId: initialValues.id || initialValues.$id },
      },
      {
        onSuccess: () => {
          onCancel?.();
        },
      },
    );
  };

  return (
    <Card className="size-full border-none shadow-none">
      <CardHeader className="flex p-7">
        <CardTitle className="text-xl font-bold">Edit a task</CardTitle>
      </CardHeader>

      <div className="px-7">
        <DottedSeparator />
      </div>

      <CardContent className="p-7">
        <Form {...editTaskForm}>
          <form onSubmit={editTaskForm.handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-y-4">
              <FormField
                disabled={isPending}
                control={editTaskForm.control}
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

              <FormField
                disabled={isPending}
                control={editTaskForm.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date</FormLabel>

                    <FormControl>
                      <DatePicker {...field} disabled={isPending} placeholder="Select due date" />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                disabled={isPending}
                control={editTaskForm.control}
                name="assigneeIds"
                render={({ field }) => {
                  const selectedIds = field.value || [];
                  const selectedMembers = memberOptions.filter((m) => selectedIds.includes(m.id));

                  const toggleMember = (memberId: string) => {
                    const next = selectedIds.includes(memberId)
                      ? selectedIds.filter((id) => id !== memberId)
                      : [...selectedIds, memberId];
                    field.onChange(next);
                    editTaskForm.setValue('assigneeId', next[0] || undefined);
                  };

                  return (
                    <FormItem>
                      <FormLabel>Assignees (Người thực hiện)</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              disabled={isPending}
                              className="w-full justify-between font-normal h-10 px-3"
                            >
                              {selectedMembers.length === 0 && (
                                <span className="text-muted-foreground">Select assignees</span>
                              )}
                              {selectedMembers.length > 0 && (
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                  <div className="flex -space-x-1.5 overflow-hidden">
                                    {selectedMembers.slice(0, 3).map((m) => (
                                      <MemberAvatar key={m.id} className="size-5 border border-background" name={m.name} image={m.imageUrl} />
                                    ))}
                                  </div>
                                  <span className="truncate text-xs">
                                    {selectedMembers.map((m) => m.name).join(', ')}
                                  </span>
                                </div>
                              )}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-2" align="start">
                          <div className="space-y-1 max-h-56 overflow-y-auto">
                            {memberOptions.map((member) => {
                              const isSelected = selectedIds.includes(member.id);
                              return (
                                <div
                                  key={member.id}
                                  onClick={() => toggleMember(member.id)}
                                  className={cn(
                                    'flex items-center justify-between p-2 rounded-md cursor-pointer hover:bg-accent text-sm',
                                    isSelected && 'bg-accent/50 font-medium'
                                  )}
                                >
                                  <div className="flex items-center gap-x-2 truncate">
                                    <MemberAvatar className="size-5" name={member.name} image={member.imageUrl} />
                                    <span className="truncate">{member.name}</span>
                                  </div>
                                  {isSelected && <Check className="size-4 text-primary shrink-0" />}
                                </div>
                              );
                            })}
                            {memberOptions.length === 0 && (
                              <p className="text-xs text-muted-foreground p-2">No members found</p>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              <FormField
                disabled={isPending}
                control={editTaskForm.control}
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
                        <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                        <SelectItem value={TaskStatus.IN_REVIEW}>In Review</SelectItem>
                        <SelectItem value={TaskStatus.TODO}>Todo</SelectItem>
                        <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                disabled={isPending}
                control={editTaskForm.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>

                    <Select disabled={isPending} defaultValue={field.value} value={field.value} onValueChange={field.onChange}>
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
                            'Select project'
                          )}
                        </SelectTrigger>
                      </FormControl>

                      <FormMessage />

                      <SelectContent>
                        {projectOptions.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            <div className="flex items-center gap-x-2">
                              <ProjectAvatar className="size-6" name={project.name} image={project.imageUrl} />
                              {project.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />

              <FormField
                disabled={isPending}
                control={editTaskForm.control}
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
                control={editTaskForm.control}
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

            <DottedSeparator className="py-7" />

            <FormMessage />

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
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};
