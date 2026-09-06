'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { ArrowUpDown, MoreVertical } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/features/members/components/member-avatar';
import { ProjectAvatar } from '@/features/projects/components/project-avatar';
import { TaskPriorityBadge } from '@/features/tasks/components/task-priority-badge';
import { TaskLabels } from '@/features/tasks/components/task-labels';
import type { PopulatedTask } from '@/features/tasks/types';
import { snakeCaseToTitleCase } from '@/lib/utils';

import { type DataTableFeatures } from './data-table-features';
import { TaskActions } from './task-actions';
import { TaskDate } from './task-date';

const columnHelper = createColumnHelper<DataTableFeatures, PopulatedTask>();

export const columns = columnHelper.columns([
  columnHelper.accessor('name', {
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Task Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const name = row.original.name;

      return <p className="line-clamp-1">{name}</p>;
    },
  }),
  columnHelper.accessor('project', {
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Project
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const project = row.original.project;
      if (!project) return null;

      return (
        <div className="flex items-center gap-x-2 text-sm font-medium">
          <ProjectAvatar className="size-6" name={project.name} image={project.imageUrl} />

          <p className="line-clamp-1">{project.name}</p>
        </div>
      );
    },
  }),
  columnHelper.accessor('assignee', {
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Assignee
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const assignee = row.original.assignee;
      if (!assignee) {
        return <span className="text-xs text-muted-foreground italic">Chưa giao</span>;
      }

      return (
        <div className="flex items-center gap-x-2 text-sm font-medium">
          <MemberAvatar fallbackClassName="text-xs" className="size-6" name={assignee.name} image={assignee.avatar_url} />

          <p className="line-clamp-1">{assignee.name}</p>
        </div>
      );
    },
  }),
  columnHelper.accessor('dueDate', {
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Due Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const dueDate = row.original.dueDate;

      return <TaskDate value={dueDate} />;
    },
  }),
  columnHelper.accessor('priority', {
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Độ ưu tiên
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const priority = row.original.priority;
      return <TaskPriorityBadge priority={priority} />;
    },
  }),
  columnHelper.accessor('labels', {
    header: () => <span className="text-xs font-semibold px-4">Nhãn</span>,
    cell: ({ row }) => {
      const labels = row.original.labels;
      if (!labels || labels.length === 0) {
        return <span className="text-xs text-muted-foreground italic px-4">-</span>;
      }
      return <TaskLabels labels={labels} maxDisplay={2} />;
    },
  }),
  columnHelper.accessor('status', {
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Status
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const status = row.original.status;

      return <Badge variant={status}>{snakeCaseToTitleCase(status)}</Badge>;
    },
  }),
  columnHelper.display({
    id: 'actions',
    cell: ({ row }) => {
      const id = row.original.$id || row.original.id || '';
      const projectId = row.original.projectId || row.original.project_id || '';

      return (
        <TaskActions id={id} projectId={projectId}>
          <Button variant="ghost" className="size-8 p-0">
            <MoreVertical className="size-4" />
          </Button>
        </TaskActions>
      );
    },
  }),
]);
