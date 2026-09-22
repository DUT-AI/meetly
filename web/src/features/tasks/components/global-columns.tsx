'use client';

import { createColumnHelper } from '@tanstack/react-table';
import { ArrowUpDown, ExternalLink, MoreVertical } from 'lucide-react';
import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ProjectAvatar } from '@/features/projects/components/project-avatar';
import { TaskLabels } from '@/features/tasks/components/task-labels';
import { TaskPriorityBadge } from '@/features/tasks/components/task-priority-badge';
import type { PopulatedTask } from '@/features/tasks/types';
import { WorkspaceAvatar } from '@/features/workspaces/components/workspace-avatar';
import { snakeCaseToTitleCase } from '@/lib/utils';

import { type DataTableFeatures } from './data-table-features';
import { TaskDate } from './task-date';

const columnHelper = createColumnHelper<DataTableFeatures, PopulatedTask>();

export const globalColumns = columnHelper.columns([
  columnHelper.accessor('workspace', {
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Phòng ban
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const workspace = row.original.workspace;
      if (!workspace) return <span className="text-muted-foreground">-</span>;

      return (
        <div className="flex items-center gap-x-2 text-sm font-semibold">
          <WorkspaceAvatar className="size-6 text-xs" name={workspace.name} image={workspace.imageUrl} />
          <Link href={`/workspaces/${workspace.$id}`} className="line-clamp-1 hover:underline text-neutral-800">
            {workspace.name}
          </Link>
        </div>
      );
    },
  }),
  columnHelper.accessor('name', {
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Tên công việc
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const name = row.original.name;
      const workspaceId = row.original.workspaceId;
      const taskId = row.original.$id;

      return (
        <Link href={`/workspaces/${workspaceId}/tasks/${taskId}`} className="line-clamp-1 font-medium hover:underline text-primary">
          {name}
        </Link>
      );
    },
  }),
  columnHelper.accessor('project', {
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Dự án
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      const project = row.original.project;
      const workspaceId = row.original.workspaceId;

      return (
        <div className="flex items-center gap-x-2 text-sm font-medium">
          <ProjectAvatar className="size-6" name={project.name} image={project.imageUrl} />
          <Link
            href={`/workspaces/${workspaceId}/projects/${project.$id || project.id}`}
            className="line-clamp-1 hover:underline text-neutral-700"
          >
            {project.name}
          </Link>
        </div>
      );
    },
  }),
  columnHelper.accessor('dueDate', {
    header: ({ column }) => {
      return (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Hạn chót
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
          Trạng thái
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
      const taskId = row.original.$id;
      const workspaceId = row.original.workspaceId;
      const projectId = row.original.projectId;

      return (
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="size-8 p-0">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild className="p-[10px] font-medium cursor-pointer">
              <Link href={`/workspaces/${workspaceId}/tasks/${taskId}`}>
                <ExternalLink className="mr-2 size-4 stroke-2" />
                Chi tiết công việc
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="p-[10px] font-medium cursor-pointer">
              <Link href={`/workspaces/${workspaceId}/projects/${projectId}`}>
                <ExternalLink className="mr-2 size-4 stroke-2" />
                Đến dự án
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="p-[10px] font-medium cursor-pointer">
              <Link href={`/workspaces/${workspaceId}`}>
                <ExternalLink className="mr-2 size-4 stroke-2" />
                Đến phòng ban
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  }),
]);
