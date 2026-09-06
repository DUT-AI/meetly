'use client';

import { CheckCircle2, Inbox, ListChecks, Loader2, Search } from 'lucide-react';
import { useQueryState } from 'nuqs';
import { useMemo } from 'react';

import { DottedSeparator } from '@/components/dotted-separator';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGetMyGlobalTasks } from '@/features/tasks/api/use-get-my-global-tasks';
import { TaskStatus } from '@/features/tasks/types';

import { DataTable } from './data-table';
import { globalColumns } from './global-columns';

export const GlobalTaskView = () => {
  const [status, setStatus] = useQueryState('status', {
    defaultValue: 'all',
  });
  const [workspaceFilter, setWorkspaceFilter] = useQueryState('workspace', {
    defaultValue: 'all',
  });
  const [search, setSearch] = useQueryState('search', {
    defaultValue: '',
  });

  const { data: tasks, isLoading } = useGetMyGlobalTasks({
    status: status === 'all' ? null : (status as TaskStatus),
    search: search ? search : null,
  });

  // Extract unique departments from the returned tasks for filtering
  const workspaces = useMemo(() => {
    if (!tasks?.documents) return [];
    const map = new Map<string, { id: string; name: string }>();
    for (const task of tasks.documents) {
      if (task.workspace) {
        map.set(task.workspace.$id, {
          id: task.workspace.$id,
          name: task.workspace.name,
        });
      }
    }
    return Array.from(map.values());
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    if (!tasks?.documents) return [];
    if (workspaceFilter === 'all') return tasks.documents;
    return tasks.documents.filter((t) => t.workspaceId === workspaceFilter);
  }, [tasks, workspaceFilter]);

  return (
    <div className="flex flex-col gap-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tất cả việc của tôi</h1>
          <p className="text-sm text-muted-foreground">
            Tổng hợp toàn bộ công việc được giao cho bạn qua tất cả phòng ban và dự án
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-md bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <span>Tổng cộng: {filteredTasks.length} việc</span>
          </div>
        </div>
      </div>

      <DottedSeparator />

      {/* Filter toolbar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value || null)}
            placeholder="Tìm kiếm công việc..."
            className="pl-9 h-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Tất cả phòng ban" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả phòng ban</SelectItem>
              {workspaces.map((ws) => (
                <SelectItem key={ws.id} value={ws.id}>
                  {ws.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[170px]">
              <div className="flex items-center gap-2">
                <ListChecks className="size-4" />
                <SelectValue placeholder="Trạng thái" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value={TaskStatus.BACKLOG}>Backlog</SelectItem>
              <SelectItem value={TaskStatus.TODO}>Cần làm (Todo)</SelectItem>
              <SelectItem value={TaskStatus.IN_PROGRESS}>Đang làm</SelectItem>
              <SelectItem value={TaskStatus.IN_REVIEW}>Đang duyệt</SelectItem>
              <SelectItem value={TaskStatus.DONE}>Hoàn thành</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-lg border bg-white p-4">
        {isLoading ? (
          <div className="flex h-64 w-full flex-col items-center justify-center gap-2">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Đang tải công việc của bạn...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex h-64 w-full flex-col items-center justify-center gap-2 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="text-base font-semibold">Chưa có công việc nào</p>
            <p className="text-xs text-muted-foreground">
              Bạn không có công việc nào phù hợp với bộ lọc hiện tại.
            </p>
          </div>
        ) : (
          <DataTable columns={globalColumns} data={filteredTasks} />
        )}
      </div>
    </div>
  );
};
