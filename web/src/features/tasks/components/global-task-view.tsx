'use client';

import {
  AlertCircle,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  Inbox,
  ListChecks,
  Loader2,
  Search,
} from 'lucide-react';
import {
  endOfDay,
  endOfWeek,
  isAfter,
  isBefore,
  isSameDay,
  parseISO,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { useQueryState } from 'nuqs';
import { useMemo } from 'react';

import { DottedSeparator } from '@/components/dotted-separator';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useGetMyGlobalTasks } from '@/features/tasks/api/use-get-my-global-tasks';
import { PopulatedTask, TaskStatus } from '@/features/tasks/types';

import { DataTable } from './data-table';
import { globalColumns } from './global-columns';

type DuePeriod = 'all' | 'overdue' | 'today' | 'this_week' | 'upcoming';

export const GlobalTaskView = () => {
  const [status, setStatus] = useQueryState('status', {
    defaultValue: 'all',
  });
  const [workspaceFilter, setWorkspaceFilter] = useQueryState('workspace', {
    defaultValue: 'all',
  });
  const [period, setPeriod] = useQueryState('period', {
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
      const wsId = task.workspace?.$id || task.workspace?.id || task.workspaceId;
      const wsName = task.workspace?.name || 'Phòng ban';
      if (wsId) {
        map.set(wsId, {
          id: String(wsId),
          name: wsName,
        });
      }
    }
    return Array.from(map.values());
  }, [tasks]);

  // Filter tasks by workspace first
  const workspaceFilteredTasks = useMemo(() => {
    if (!tasks?.documents) return [];
    if (workspaceFilter === 'all') return tasks.documents;
    return tasks.documents.filter((t) => t.workspaceId === workspaceFilter);
  }, [tasks, workspaceFilter]);

  // Group tasks by due date periods
  const classifiedTasks = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    // Week starts on Monday (weekStartsOn: 1)
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const overdue: PopulatedTask[] = [];
    const today: PopulatedTask[] = [];
    const thisWeek: PopulatedTask[] = [];
    const upcoming: PopulatedTask[] = [];
    const noDueDate: PopulatedTask[] = [];

    for (const task of workspaceFilteredTasks) {
      if (!task.dueDate) {
        noDueDate.push(task);
        continue;
      }

      const due = typeof task.dueDate === 'string' ? parseISO(task.dueDate) : new Date(task.dueDate);

      // Check overdue (dueDate is before today and task is not DONE)
      if (isBefore(due, todayStart)) {
        if (task.status !== TaskStatus.DONE) {
          overdue.push(task);
        } else {
          // Completed tasks in the past can go to all/history
          noDueDate.push(task);
        }
      } else if (isSameDay(due, now)) {
        today.push(task);
      } else if (isAfter(due, todayEnd) && (isBefore(due, weekEnd) || isSameDay(due, weekEnd))) {
        thisWeek.push(task);
      } else if (isAfter(due, weekEnd)) {
        upcoming.push(task);
      } else {
        upcoming.push(task);
      }
    }

    return {
      all: workspaceFilteredTasks,
      overdue,
      today,
      this_week: thisWeek,
      upcoming,
    };
  }, [workspaceFilteredTasks]);

  // Tasks to display based on active period tab
  const displayTasks = useMemo(() => {
    if (period === 'overdue') return classifiedTasks.overdue;
    if (period === 'today') return classifiedTasks.today;
    if (period === 'this_week') return classifiedTasks.this_week;
    if (period === 'upcoming') return classifiedTasks.upcoming;
    return classifiedTasks.all;
  }, [classifiedTasks, period]);

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
            <span>Tổng cộng: {workspaceFilteredTasks.length} việc</span>
          </div>
        </div>
      </div>

      <DottedSeparator />

      {/* Due Period Tabs */}
      <Tabs value={period} onValueChange={(val) => setPeriod(val as DuePeriod)} className="w-full">
        <TabsList className="w-full sm:w-auto flex flex-wrap h-auto gap-1 bg-muted/40 p-1.5 border rounded-lg">
          <TabsTrigger value="all" className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold">
            <Calendar className="size-3.5" />
            <span>Tất cả</span>
            <span className="ml-1 rounded-full bg-neutral-200 px-1.5 py-0.2 text-[10px] font-bold">
              {classifiedTasks.all.length}
            </span>
          </TabsTrigger>

          <TabsTrigger
            value="overdue"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold data-[state=active]:bg-red-100 data-[state=active]:text-red-700 hover:text-red-600"
          >
            <AlertCircle className="size-3.5 text-red-500" />
            <span>🔴 Quá hạn (Overdue)</span>
            {classifiedTasks.overdue.length > 0 && (
              <span className="ml-1 rounded-full bg-red-500 text-white px-1.5 py-0.2 text-[10px] font-bold">
                {classifiedTasks.overdue.length}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="today"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold data-[state=active]:bg-amber-100 data-[state=active]:text-amber-800 hover:text-amber-700"
          >
            <CalendarCheck className="size-3.5 text-amber-500" />
            <span>🟡 Hôm nay (Today)</span>
            {classifiedTasks.today.length > 0 && (
              <span className="ml-1 rounded-full bg-amber-500 text-white px-1.5 py-0.2 text-[10px] font-bold">
                {classifiedTasks.today.length}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="this_week"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 hover:text-blue-600"
          >
            <CalendarDays className="size-3.5 text-blue-500" />
            <span>🔵 Trong tuần này (This Week)</span>
            {classifiedTasks.this_week.length > 0 && (
              <span className="ml-1 rounded-full bg-blue-500 text-white px-1.5 py-0.2 text-[10px] font-bold">
                {classifiedTasks.this_week.length}
              </span>
            )}
          </TabsTrigger>

          <TabsTrigger
            value="upcoming"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold data-[state=active]:bg-purple-100 data-[state=active]:text-purple-700 hover:text-purple-600"
          >
            <CalendarRange className="size-3.5 text-purple-500" />
            <span>⚪ Sắp tới (Upcoming)</span>
            {classifiedTasks.upcoming.length > 0 && (
              <span className="ml-1 rounded-full bg-purple-500 text-white px-1.5 py-0.2 text-[10px] font-bold">
                {classifiedTasks.upcoming.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
      </Tabs>

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
        ) : displayTasks.length === 0 ? (
          <div className="flex h-64 w-full flex-col items-center justify-center gap-2 text-center">
            <Inbox className="size-8 text-muted-foreground" />
            <p className="text-base font-semibold">Chưa có công việc nào trong mục này</p>
            <p className="text-xs text-muted-foreground">
              {period === 'overdue' && 'Tuyệt vời! Bạn không có công việc nào bị quá hạn.'}
              {period === 'today' && 'Bạn không có công việc nào đến hạn trong hôm nay.'}
              {period === 'this_week' && 'Không có công việc nào đến hạn trong tuần này.'}
              {period === 'upcoming' && 'Không có công việc nào sắp tới.'}
              {period === 'all' && 'Bạn không có công việc nào phù hợp với bộ lọc hiện tại.'}
            </p>
          </div>
        ) : (
          <DataTable columns={globalColumns} data={displayTasks} />
        )}
      </div>
    </div>
  );
};
