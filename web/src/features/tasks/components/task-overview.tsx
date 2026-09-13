import { Pencil, XIcon } from 'lucide-react';
import { useState } from 'react';

import { DottedSeparator } from '@/components/dotted-separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MemberAvatar } from '@/features/members/components/member-avatar';
import { useUpdateTask } from '@/features/tasks/api/use-update-task';
import { TaskLabels } from '@/features/tasks/components/task-labels';
import { TaskPriorityBadge } from '@/features/tasks/components/task-priority-badge';
import { useEditTaskModal } from '@/features/tasks/hooks/use-edit-task-modal';
import type { PopulatedTask } from '@/features/tasks/types';
import { snakeCaseToTitleCase } from '@/lib/utils';

import { OverviewProperty } from './overview-property';
import { TaskDate } from './task-date';

interface TaskOverviewProps {
  task: PopulatedTask;
}

export const TaskOverview = ({ task }: TaskOverviewProps) => {
  const { open } = useEditTaskModal();
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState(task.description);
  const { mutate: editTask, isPending } = useUpdateTask();

  const handleSaveDesc = () => {
    editTask(
      {
        json: { description: descValue },
        param: { taskId: task.$id || task.id },
      },
      {
        onSuccess: () => setIsEditingDesc(false),
      },
    );
  };

  return (
    <div className="flex flex-col rounded-lg border bg-white p-6 shadow-sm">
      {/* Overview Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">Overview</h2>

        <Button onClick={() => open(task.$id || task.id)} size="sm" variant="secondary">
          <Pencil className="mr-2 size-4" />
          Edit
        </Button>
      </div>

      <DottedSeparator className="my-4" />

      {/* Properties Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <OverviewProperty label="Assignee">
          {task.assignees && task.assignees.length > 0 ? (
            <div className="flex flex-col gap-y-1.5">
              <div className="flex items-center -space-x-1.5">
                {task.assignees.map((m) => (
                  <MemberAvatar
                    key={m.id}
                    name={m.name || 'Member'}
                    image={m.avatar_url || (m as any)?.avatarUrl}
                    className="size-6 border-2 border-white shadow-xs"
                  />
                ))}
              </div>
              <p className="text-sm font-medium text-neutral-800 line-clamp-2">
                {task.assignees.map((m) => m.name).join(', ')}
              </p>
            </div>
          ) : task.assignee ? (
            <div className="flex items-center gap-x-2">
              <MemberAvatar name={task.assignee.name} image={task.assignee.avatar_url} className="size-6" />
              <p className="text-sm font-medium">{task.assignee.name}</p>
            </div>
          ) : (
            <p className="text-sm font-medium text-neutral-400 italic">Chưa giao</p>
          )}
        </OverviewProperty>

        <OverviewProperty label="Due Date">
          <TaskDate value={task.dueDate} className="text-sm font-medium" />
        </OverviewProperty>

        <OverviewProperty label="Status">
          <Badge variant={task.status}>{snakeCaseToTitleCase(task.status)}</Badge>
        </OverviewProperty>

        <OverviewProperty label="Priority">
          <TaskPriorityBadge priority={task.priority} />
        </OverviewProperty>

        <div className="col-span-full">
          <OverviewProperty label="Labels">
            {task.labels && task.labels.length > 0 ? (
              <TaskLabels labels={task.labels} />
            ) : (
              <span className="text-xs text-muted-foreground italic">Chưa gắn nhãn</span>
            )}
          </OverviewProperty>
        </div>
      </div>

      <DottedSeparator className="my-6" />

      {/* Description Section */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold text-neutral-900">Description</h3>
          <Button
            onClick={() => {
              setDescValue(task.description);
              setIsEditingDesc((prev) => !prev);
            }}
            size="sm"
            variant="secondary"
          >
            {isEditingDesc ? <XIcon className="mr-2 size-4" /> : <Pencil className="mr-2 size-4" />}
            {isEditingDesc ? 'Cancel' : 'Edit'}
          </Button>
        </div>

        {isEditingDesc ? (
          <div className="flex flex-col gap-y-3">
            <Textarea
              autoFocus
              placeholder="Add a description..."
              value={descValue || ''}
              rows={10}
              onChange={(e) => setDescValue(e.target.value)}
              disabled={isPending}
            />
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setIsEditingDesc(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSaveDesc} disabled={isPending}>
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-md bg-muted/40 p-4 text-sm leading-relaxed text-neutral-800 whitespace-pre-wrap">
            {task.description || <span className="italic text-muted-foreground">No description set...</span>}
          </div>
        )}
      </div>
    </div>
  );
};
