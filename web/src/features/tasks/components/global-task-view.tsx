'use client';

import { Loader2, PlusIcon, Search, ListChecks, UserIcon, Folder, BriefcaseBusiness } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { useCallback, useMemo } from 'react';

import { DottedSeparator } from '@/components/dotted-separator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DatePicker } from '@/components/date-picker';
import { MemberAvatar } from '@/features/members/components/member-avatar';
import { useGetMyGlobalTasks } from '@/features/tasks/api/use-get-my-global-tasks';
import { useBulkUpdateTasks } from '@/features/tasks/api/use-bulk-update-tasks';
import { useCreateTaskModal } from '@/features/tasks/hooks/use-create-task-modal';
import { TaskStatus } from '@/features/tasks/types';

import { globalColumns } from './global-columns';
import { DataCalendar } from './data-calendar';
import { DataKanban } from './data-kanban';
import { DataTable } from './data-table';

interface GlobalTaskViewProps {
  userId: string;
}

export const GlobalTaskView = ({ userId }: GlobalTaskViewProps) => {
  const [view, setView] = useQueryState('task-view', {
    defaultValue: 'table',
  });
  
  // Filters state
  const [assigneeFilter, setAssigneeFilter] = useQueryState('assignee', {
    defaultValue: userId,
  });
  const [statusFilter, setStatusFilter] = useQueryState('status', {
    defaultValue: 'all',
  });
  const [workspaceFilter, setWorkspaceFilter] = useQueryState('workspace', {
    defaultValue: 'all',
  });
  const [projectFilter, setProjectFilter] = useQueryState('project', {
    defaultValue: 'all',
  });
  const [dueDateFilter, setDueDateFilter] = useQueryState('dueDate', {
    defaultValue: '',
  });
  const [search, setSearch] = useQueryState('search', {
    defaultValue: '',
  });

  const { open } = useCreateTaskModal();
  const { data: tasks, isLoading } = useGetMyGlobalTasks({
    status: statusFilter === 'all' ? null : (statusFilter as TaskStatus),
    search: search ? search : null,
  });
  const { mutate: bulkUpdateTasks } = useBulkUpdateTasks();

  const onKanbanChange = useCallback(
    (updatedTasks: { $id: string; status: TaskStatus; position: number }[]) => {
      bulkUpdateTasks({
        json: { tasks: updatedTasks },
      });
    },
    [bulkUpdateTasks],
  );

  // Extract unique workspaces, projects, assignees for dropdowns
  const workspaces = useMemo(() => {
    if (!tasks?.documents) return [];
    const map = new Map();
    tasks.documents.forEach((t) => {
      if (t.workspace) {
        map.set(t.workspaceId, t.workspace);
      }
    });
    return Array.from(map.values());
  }, [tasks]);

  const projects = useMemo(() => {
    if (!tasks?.documents) return [];
    const map = new Map();
    tasks.documents.forEach((t) => {
      if (t.project) {
        map.set(t.projectId, t.project);
      }
    });
    return Array.from(map.values());
  }, [tasks]);

  const assignees = useMemo(() => {
    if (!tasks?.documents) return [];
    const map = new Map();
    tasks.documents.forEach((t) => {
      if (t.assignee) {
        const id = t.assignee.userId || t.assignee.user_id || t.assignee.$id || t.assignee.id;
        map.set(id, {
          id,
          name: t.assignee.name,
          avatarUrl: t.assignee.avatarUrl || t.assignee.avatar_url,
        });
      }
    });
    return Array.from(map.values());
  }, [tasks]);

  // Client-side filtering
  const displayTasks = useMemo(() => {
    let result = tasks?.documents || [];

    if (workspaceFilter !== 'all') {
      result = result.filter((t) => t.workspaceId === workspaceFilter);
    }
    
    if (projectFilter !== 'all') {
      result = result.filter((t) => t.projectId === projectFilter);
    }

    if (assigneeFilter !== 'all') {
      result = result.filter((t) => {
        const uId = t.assignee?.userId || t.assignee?.user_id || t.assignee?.$id || t.assignee?.id;
        return String(uId) === assigneeFilter;
      });
    }
    
    if (dueDateFilter) {
      result = result.filter((t) => {
        if (!t.dueDate) return false;
        return t.dueDate.startsWith(dueDateFilter.split('T')[0]);
      });
    }

    return result;
  }, [tasks, workspaceFilter, projectFilter, assigneeFilter, dueDateFilter]);

  return (
    <Tabs defaultValue={view} onValueChange={setView} className="w-full flex-1 rounded-lg border bg-white">
      <div className="flex h-full flex-col overflow-auto p-4">
        <div className="flex flex-col items-center justify-between gap-y-2 lg:flex-row">
          <TabsList className="w-full lg:w-auto">
            <TabsTrigger className="h-8 w-full lg:w-auto" value="table">
              Table
            </TabsTrigger>
            <TabsTrigger className="h-8 w-full lg:w-auto" value="kanban">
              Kanban
            </TabsTrigger>
            <TabsTrigger className="h-8 w-full lg:w-auto" value="calendar">
              Calendar
            </TabsTrigger>
          </TabsList>

          <Button onClick={() => open()} size="sm" className="w-full lg:w-auto">
            <PlusIcon className="size-4" />
            New
          </Button>
        </div>
        <DottedSeparator className="my-4" />

        <div className="flex flex-col justify-between gap-2 xl:flex-row xl:items-center">
          {/* Filters */}
          <div className="flex flex-col gap-2 lg:flex-row">
            {/* Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 w-full lg:w-auto">
                <div className="flex items-center pr-2">
                  <ListChecks className="mr-2 size-4" />
                  <SelectValue placeholder="All statuses" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectSeparator />
                <SelectItem value={TaskStatus.BACKLOG}>Backlog</SelectItem>
                <SelectItem value={TaskStatus.TODO}>Todo</SelectItem>
                <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                <SelectItem value={TaskStatus.IN_REVIEW}>In Review</SelectItem>
                <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
              </SelectContent>
            </Select>

            {/* Assignees */}
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="h-8 w-full lg:w-auto">
                <div className="flex items-center pr-2">
                  <UserIcon className="mr-2 size-4" />
                  <SelectValue placeholder="All assignees" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All assignees</SelectItem>
                <SelectSeparator />
                {assignees.map((assignee) => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    <div className="flex items-center gap-x-2">
                      <MemberAvatar className="size-5" name={assignee.name} image={assignee.avatarUrl} />
                      <span>{assignee.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Projects */}
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="h-8 w-full lg:w-auto">
                <div className="flex items-center pr-2">
                  <Folder className="mr-2 size-4" />
                  <SelectValue placeholder="All projects" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                <SelectSeparator />
                {projects.map((project: any) => (
                  <SelectItem key={project.id || project.$id} value={project.id || project.$id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Workspaces */}
            <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
              <SelectTrigger className="h-8 w-full lg:w-auto">
                <div className="flex items-center pr-2">
                  <BriefcaseBusiness className="mr-2 size-4" />
                  <SelectValue placeholder="All workspaces" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All workspaces</SelectItem>
                <SelectSeparator />
                {workspaces.map((ws: any) => (
                  <SelectItem key={ws.id || ws.$id} value={ws.id || ws.$id}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Due Date */}
            <DatePicker
              placeholder="Due date"
              className="h-8 w-full lg:w-auto"
              value={dueDateFilter ? new Date(dueDateFilter) : undefined}
              onChange={(date) => setDueDateFilter(date ? date.toISOString() : '')}
              showReset
            />
          </div>

          <div className="relative w-full xl:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value || '')}
              placeholder="Search for a task..."
              className="pl-9 h-8"
            />
          </div>
        </div>

        <DottedSeparator className="my-4" />
        
        {isLoading ? (
          <div className="flex h-[200px] w-full flex-col items-center justify-center rounded-lg border">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <TabsContent value="table" className="mt-0">
              <DataTable columns={globalColumns} data={displayTasks} />
            </TabsContent>

            <TabsContent value="kanban" className="mt-0">
              <DataKanban data={displayTasks} onChange={onKanbanChange} />
            </TabsContent>

            <TabsContent value="calendar" className="mt-0 h-full pb-4">
              <DataCalendar data={displayTasks} />
            </TabsContent>
          </>
        )}
      </div>
    </Tabs>
  );
};
