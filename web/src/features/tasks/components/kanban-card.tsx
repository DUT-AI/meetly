'use client';

import { Calendar, MoreHorizontal } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { MemberAvatar } from '@/features/members/components/member-avatar';
import { ProjectAvatar } from '@/features/projects/components/project-avatar';
import { TaskLabels } from '@/features/tasks/components/task-labels';
import { TaskPriorityBadge } from '@/features/tasks/components/task-priority-badge';
import type { PopulatedTask } from '@/features/tasks/types';
import { useWorkspaceId } from '@/features/workspaces/hooks/use-workspace-id';

import { TaskActions } from './task-actions';
import { TaskDate } from './task-date';

interface KanbanCardProps {
  task: PopulatedTask;
}

export const KanbanCard = ({ task }: KanbanCardProps) => {
  const router = useRouter();
  const currentWorkspaceId = useWorkspaceId();

  const handleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('[role="menuitem"]') ||
      target.closest('[data-radix-collection-item]')
    ) {
      return;
    }
    const wsId = task.workspaceId || task.workspace_id || currentWorkspaceId;
    const taskId = task.$id || task.id;
    if (wsId && taskId) {
      router.push(`/workspaces/${wsId}/tasks/${taskId}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="group mb-2 flex cursor-pointer flex-col gap-y-2 rounded-lg border border-neutral-200/80 bg-white p-3 shadow-xs transition hover:border-neutral-300 hover:shadow-md select-none"
    >
      {/* Top Header: Project Info & Actions Menu */}
      <div className="flex items-center justify-between gap-x-2">
        {task.project ? (
          <div className="flex items-center gap-1.5 min-w-0">
            <ProjectAvatar
              name={task.project.name}
              image={task.project.imageUrl}
              className="size-4 shrink-0"
              fallbackClassName="text-[8px]"
            />
            <span className="truncate text-xs font-medium text-neutral-500">
              {task.project.name}
            </span>
          </div>
        ) : (
          <span />
        )}

        <div onClick={(e) => e.stopPropagation()}>
          <TaskActions id={task.$id || task.id} projectId={task.projectId}>
            <button
              title="Tùy chọn"
              className="flex size-6 items-center justify-center rounded-md text-neutral-400 opacity-60 transition group-hover:opacity-100 hover:bg-neutral-100 hover:text-neutral-700"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </TaskActions>
        </div>
      </div>

      {/* Task Name */}
      <h4 className="line-clamp-2 text-sm font-semibold leading-snug text-neutral-900 group-hover:text-primary transition-colors">
        {task.name}
      </h4>

      {/* Labels (if any) */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <TaskLabels labels={task.labels} maxDisplay={3} />
        </div>
      )}

      {/* Footer: Priority Badge, Due Date & Assignee Avatar */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100">
        <div className="flex items-center gap-1.5 flex-wrap">
          <TaskPriorityBadge priority={task.priority} className="text-[10px] px-1.5 py-0.5" />

          {task.dueDate && (
            <div className="flex items-center gap-1 text-[11px] text-neutral-500 font-medium">
              <Calendar className="size-3 text-neutral-400 shrink-0" />
              <TaskDate value={task.dueDate} className="text-[11px]" />
            </div>
          )}
        </div>

        {task.assignee ? (
          <div title={task.assignee.name} className="shrink-0">
            <MemberAvatar
              name={task.assignee.name}
              image={task.assignee.avatar_url}
              className="size-6 border border-white shadow-xs"
              fallbackClassName="text-[10px] font-semibold"
            />
          </div>
        ) : (
          <div
            title="Chưa giao"
            className="size-6 rounded-full border border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-center text-[10px] text-neutral-400"
          >
            ?
          </div>
        )}
      </div>
    </div>
  );
};
