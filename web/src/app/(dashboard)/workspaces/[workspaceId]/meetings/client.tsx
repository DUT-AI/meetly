'use client';

import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  LayoutGrid,
  Plus,
  PlusIcon,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { PageError } from '@/components/page-error';
import { PageLoader } from '@/components/page-loader';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { useCurrentMember } from '@/features/members/api/use-current-member';
import { useGetMembers } from '@/features/members/api/use-get-members';
import { MemberAvatar } from '@/features/members/components/member-avatar';
import { useGetMeetings } from '@/features/meetings/api/use-get-meetings';
import { CreateMeetingModal } from '@/features/meetings/components/create-meeting-modal';
import { MeetingActions } from '@/features/meetings/components/meeting-actions';
import { MeetingReportEditor } from '@/features/meetings/components/meeting-report-editor';
import type { Meeting } from '@/features/meetings/types';
import { useWorkspaceId } from '@/features/workspaces/hooks/use-workspace-id';
import { cn } from '@/lib/utils';

const WEEKDAY_LABELS_MONTH = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
const WEEKDAY_LABELS_WEEK = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật'];

const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);

const MEETING_COLORS = [
  'bg-blue-100 text-blue-900 border border-blue-200/90 hover:bg-blue-200/70',
  'bg-indigo-100 text-indigo-900 border border-indigo-200/90 hover:bg-indigo-200/70',
  'bg-violet-100 text-violet-900 border border-violet-200/90 hover:bg-violet-200/70',
  'bg-emerald-100 text-emerald-900 border border-emerald-200/90 hover:bg-emerald-200/70',
  'bg-rose-100 text-rose-900 border border-rose-200/90 hover:bg-rose-200/70',
  'bg-amber-100 text-amber-950 border border-amber-200/90 hover:bg-amber-200/70',
  'bg-cyan-100 text-cyan-900 border border-cyan-200/90 hover:bg-cyan-200/70',
  'bg-purple-100 text-purple-900 border border-purple-200/90 hover:bg-purple-200/70',
];

const MEETING_DOT_COLORS = [
  'bg-blue-600',
  'bg-indigo-600',
  'bg-violet-600',
  'bg-emerald-600',
  'bg-rose-600',
  'bg-amber-600',
  'bg-cyan-600',
  'bg-purple-600',
];

function getMeetingColorIndex(meetingId: string): number {
  let hash = 0;
  for (let i = 0; i < meetingId.length; i++) {
    hash = meetingId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % MEETING_COLORS.length;
}

export const MeetingsClient = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const { data: meetingsResponse, isLoading: isLoadingMeetings } = useGetMeetings(workspaceId);
  const { data: member, isLoading: isLoadingMember } = useCurrentMember({ workspaceId });
  const { data: membersResponse } = useGetMembers({ workspaceId });

  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [selectedDayOverview, setSelectedDayOverview] = useState<Date | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalDate, setCreateModalDate] = useState<Date | null>(null);

  const isLoading = isLoadingMeetings;
  const isAdmin = member?.role === 'ADMIN' || !member;

  // Lookup map: memberId → member object
  const memberMap = Object.fromEntries(
    (membersResponse?.documents ?? []).map((m) => [m.$id || m.id, m])
  );

  if (isLoading) return <PageLoader />;
  if (!meetingsResponse) return <PageError message="Không thể tải dữ liệu cuộc họp" />;

  const meetings: Meeting[] = meetingsResponse.documents || [];

  // Month grid calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const monthCalendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const monthCalendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const monthDays = eachDayOfInterval({ start: monthCalendarStart, end: monthCalendarEnd });

  // Week grid calculations (Monday to Sunday)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  function getMeetingsForDay(day: Date): Meeting[] {
    return meetings
      .filter((m) => {
        try {
          return m.start_time ? isSameDay(parseISO(m.start_time), day) : false;
        } catch {
          return false;
        }
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }

  function getMeetingsForDayAndHour(day: Date, hour: number): Meeting[] {
    return meetings.filter((m) => {
      try {
        if (!m.start_time) return false;
        const st = parseISO(m.start_time);
        return isSameDay(st, day) && st.getHours() === hour;
      } catch {
        return false;
      }
    });
  }

  const handleOpenCreateForDate = (date: Date, hour?: number) => {
    const d = new Date(date);
    if (hour !== undefined) {
      d.setHours(hour, 0, 0, 0);
    }
    setCreateModalDate(d);
    setIsCreateModalOpen(true);
  };

  const handlePrev = () => {
    if (viewMode === 'month') {
      setCurrentDate((d) => subMonths(d, 1));
    } else {
      setCurrentDate((d) => subWeeks(d, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate((d) => addMonths(d, 1));
    } else {
      setCurrentDate((d) => addWeeks(d, 1));
    }
  };

  const dayOverviewMeetings = selectedDayOverview ? getMeetingsForDay(selectedDayOverview) : [];

  return (
    <div className="flex flex-col h-full gap-4 w-full">
      {/* ── Bright Header Controls ── */}
      <div className="flex flex-wrap items-center justify-between bg-white px-5 py-3.5 rounded-2xl border border-slate-200/90 shadow-xs gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center size-10 rounded-xl bg-gradient-to-tr from-blue-500 via-indigo-500 to-purple-500 text-white shadow-xs">
            <CalendarIcon className="size-5" />
          </div>

          {/* View Switcher Tabs */}
          <div className="flex items-center bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                viewMode === 'month'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <LayoutGrid className="size-3.5" />
              Lịch Tháng
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
                viewMode === 'week'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              <CalendarDays className="size-3.5" />
              Lịch Tuần
            </button>
          </div>

          {/* Date Range Navigation */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-white text-slate-700 shadow-none transition-all"
                onClick={handlePrev}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg hover:bg-white text-slate-700 shadow-none transition-all"
                onClick={handleNext}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>

            <h1 className="text-base font-extrabold text-slate-800 capitalize min-w-[180px]">
              {viewMode === 'month'
                ? format(currentDate, "'Tháng' MM 'năm' yyyy", { locale: vi })
                : `Tuần ${format(weekStart, 'dd/MM')} → ${format(weekEnd, 'dd/MM/yyyy')}`}
            </h1>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentDate(new Date())}
              className="text-xs font-bold text-blue-700 bg-blue-50/80 border-blue-200 hover:bg-blue-100 rounded-xl"
            >
              Hôm nay
            </Button>
          </div>
        </div>

        {isAdmin && (
          <Button
            onClick={() => {
              setCreateModalDate(null);
              setIsCreateModalOpen(true);
            }}
            className="rounded-xl shadow-xs bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold transition-all"
          >
            <PlusIcon className="size-4" />
            Tạo cuộc họp
          </Button>
        )}
      </div>

      {/* ── Main Calendar Container ── */}
      <div className="flex-1 bg-white border border-slate-200/90 rounded-2xl shadow-xs flex flex-col overflow-hidden">
        {/* ── VIEW 1: MONTH VIEW ── */}
        {viewMode === 'month' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Bright Weekday Header Strip */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/90">
              {WEEKDAY_LABELS_MONTH.map((label, i) => (
                <div
                  key={label}
                  className={cn(
                    'py-2.5 text-center text-xs font-bold uppercase tracking-wider text-slate-600',
                    i === 0 && 'text-rose-600 font-extrabold' // Sunday accent
                  )}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Month Days Grid */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto">
              {monthDays.map((day, idx) => {
                const dayMeetings = getMeetingsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isCurrentDay = isToday(day);
                const visibleMeetings = dayMeetings.slice(0, 2);
                const hiddenCount = dayMeetings.length - visibleMeetings.length;

                return (
                  <div
                    key={idx}
                    className={cn(
                      'border-r border-b border-slate-100 p-2 flex flex-col group min-h-[115px] transition-all relative hover:bg-blue-50/30',
                      !isCurrentMonth && 'bg-slate-50/50 opacity-40',
                      isCurrentDay && 'bg-blue-50/40 font-medium'
                    )}
                  >
                    {/* Cell Header */}
                    <div className="flex items-center justify-between mb-1.5">
                      <span
                        className={cn(
                          'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-all',
                          isCurrentDay
                            ? 'bg-blue-600 text-white font-extrabold shadow-xs scale-105'
                            : isCurrentMonth
                            ? 'text-slate-800 group-hover:text-blue-700 font-bold'
                            : 'text-slate-400'
                        )}
                      >
                        {format(day, 'd')}
                      </span>

                      {isAdmin && (
                        <button
                          onClick={() => handleOpenCreateForDate(day)}
                          title="Thêm cuộc họp ngày này"
                          className="opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-slate-200/80 rounded-lg text-slate-700 transform hover:scale-110"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Meeting Chips */}
                    <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
                      {visibleMeetings.map((meeting) => {
                        const idx = getMeetingColorIndex(meeting.id);
                        return (
                          <button
                            key={meeting.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMeeting(meeting);
                            }}
                            className={cn(
                              'w-full text-left text-[11px] font-bold px-2 py-1 rounded-lg truncate transition-all transform hover:scale-[1.02] flex items-center gap-1.5',
                              MEETING_COLORS[idx]
                            )}
                          >
                            <span className={cn('size-1.5 rounded-full shrink-0', MEETING_DOT_COLORS[idx])} />
                            <span className="shrink-0 font-extrabold">
                              {format(parseISO(meeting.start_time), 'HH:mm')}
                            </span>
                            <span className="truncate">{meeting.title}</span>
                          </button>
                        );
                      })}

                      {/* +N More Meetings Pill Button */}
                      {hiddenCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDayOverview(day);
                          }}
                          className="mt-auto w-full text-left text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-2 py-1 rounded-lg transition-all flex items-center justify-between shadow-2xs group/pill"
                        >
                          <span className="flex items-center gap-1">
                            <Sparkles className="size-3 text-blue-600" />
                            <span>+{hiddenCount} cuộc họp khác</span>
                          </span>
                          <ChevronRight className="size-3 text-blue-600 group-hover/pill:translate-x-0.5 transition-transform" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── VIEW 2: WEEK VIEW (Bright Header & Crisp Grid) ── */}
        {viewMode === 'week' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Weekday Columns Header */}
            <div className="grid grid-cols-8 border-b border-slate-200 bg-slate-50/90 text-slate-700">
              {/* Corner cell */}
              <div className="py-2.5 px-3 text-center text-xs font-bold uppercase tracking-wider text-slate-500 border-r border-slate-200">
                Giờ
              </div>
              {/* 7 Days: T2 -> CN */}
              {weekDays.map((day, idx) => {
                const isCurrentDay = isToday(day);
                return (
                  <div
                    key={idx}
                    className={cn(
                      'py-2.5 px-2 text-center flex flex-col items-center justify-center border-r border-slate-200',
                      idx === 6 && 'text-rose-600 font-extrabold' // CN accent
                    )}
                  >
                    <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                      {WEEKDAY_LABELS_WEEK[idx]}
                    </span>
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full font-bold mt-0.5',
                        isCurrentDay ? 'bg-blue-600 text-white font-extrabold shadow-xs' : 'text-slate-800'
                      )}
                    >
                      {format(day, 'dd/MM')}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Scrollable Hours Grid Body */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {HOURS_24.map((hour) => {
                const hourFormatted = `${String(hour).padStart(2, '0')}:00`;
                return (
                  <div key={hour} className="grid grid-cols-8 min-h-[56px] group">
                    {/* Time Label Column */}
                    <div className="py-2 px-3 text-right text-xs font-semibold text-slate-400 border-r border-slate-100 bg-slate-50/40 flex items-start justify-end">
                      {hourFormatted}
                    </div>

                    {/* 7 Day Hour Slots */}
                    {weekDays.map((day, dayIdx) => {
                      const hourMeetings = getMeetingsForDayAndHour(day, hour);
                      const isCurrentDay = isToday(day);

                      return (
                        <div
                          key={dayIdx}
                          onClick={() => isAdmin && handleOpenCreateForDate(day, hour)}
                          className={cn(
                            'p-1.5 border-r border-slate-100 transition-colors flex flex-col gap-1 relative group/cell hover:bg-blue-50/30 cursor-pointer',
                            isCurrentDay && 'bg-blue-50/20'
                          )}
                        >
                          {/* Meetings inside this hour slot */}
                          {hourMeetings.map((meeting) => {
                            const idx = getMeetingColorIndex(meeting.id);
                            return (
                              <button
                                key={meeting.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedMeeting(meeting);
                                }}
                                className={cn(
                                  'w-full text-left text-[11px] font-bold px-2 py-1.5 rounded-lg truncate transition-all transform hover:scale-[1.02] shadow-2xs flex flex-col justify-center',
                                  MEETING_COLORS[idx]
                                )}
                              >
                                <div className="flex items-center gap-1.5">
                                  <span className={cn('size-1.5 rounded-full shrink-0', MEETING_DOT_COLORS[idx])} />
                                  <span className="font-extrabold">
                                    {format(parseISO(meeting.start_time), 'HH:mm')} - {format(parseISO(meeting.end_time), 'HH:mm')}
                                  </span>
                                </div>
                                <p className="truncate mt-0.5 text-xs font-bold">{meeting.title}</p>
                              </button>
                            );
                          })}

                          {/* Quick plus icon on cell hover */}
                          {isAdmin && hourMeetings.length === 0 && (
                            <div className="opacity-0 group-hover/cell:opacity-100 transition-opacity absolute inset-0 flex items-center justify-center">
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full shadow-2xs">
                                + Họp {hourFormatted}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Day Overview Modal ── */}
      {selectedDayOverview && (
        <ResponsiveModal
          open={!!selectedDayOverview}
          onOpenChange={(open) => !open && setSelectedDayOverview(null)}
          title={`Cuộc họp ngày ${format(selectedDayOverview, 'dd/MM/yyyy')}`}
          description={`Danh sách ${dayOverviewMeetings.length} cuộc họp diễn ra trong ngày.`}
        >
          <div className="p-6 bg-white flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3.5">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarIcon className="size-4 text-blue-600" />
                {format(selectedDayOverview, 'EEEE, dd/MM/yyyy', { locale: vi })}
              </h3>
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={() => {
                    const day = selectedDayOverview;
                    setSelectedDayOverview(null);
                    handleOpenCreateForDate(day);
                  }}
                  className="text-xs font-bold gap-1.5 rounded-xl bg-blue-600 text-white shadow-xs"
                >
                  <Plus className="size-3.5" />
                  Thêm cuộc họp
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-3">
              {dayOverviewMeetings.map((m) => {
                const idx = getMeetingColorIndex(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedDayOverview(null);
                      setSelectedMeeting(m);
                    }}
                    className={cn(
                      'group flex items-center justify-between p-4 rounded-2xl transition-all cursor-pointer shadow-xs border',
                      MEETING_COLORS[idx]
                    )}
                  >
                    <div className="flex items-center gap-3.5">
                      <div className={cn('w-2.5 h-12 rounded-full shrink-0 shadow-xs', MEETING_DOT_COLORS[idx])} />
                      <div className="flex flex-col">
                        <p className="text-sm font-extrabold text-slate-900 group-hover:text-blue-700 transition-colors">
                          {m.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-600 mt-1 font-semibold">
                          <Clock className="size-3.5 text-blue-600" />
                          <span>
                            {format(parseISO(m.start_time), 'HH:mm')} → {format(parseISO(m.end_time), 'HH:mm')}
                          </span>
                          <span>•</span>
                          <span className="font-extrabold text-blue-700">
                            {Math.round(
                              (new Date(m.end_time).getTime() - new Date(m.start_time).getTime()) / 60000
                            )}{' '}
                            phút
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700 bg-white px-3 py-1 rounded-full border border-slate-200">
                        {m.participants?.length || 0} người tham gia
                      </span>
                      <ChevronRight className="size-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ResponsiveModal>
      )}

      {/* ── Meeting Detail Side Panel / Modal ── */}
      {selectedMeeting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedMeeting(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200/90"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Bright Header */}
            <div className="px-6 py-5 bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-slate-50 border-b border-slate-200/80">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-xs uppercase tracking-wider font-extrabold text-blue-700 bg-blue-100/90 px-3 py-1 rounded-full">
                    Chi tiết cuộc họp
                  </span>
                  <h2 className="text-slate-900 text-xl font-extrabold leading-tight mt-2.5">{selectedMeeting.title}</h2>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isAdmin && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <MeetingActions meeting={selectedMeeting} workspaceId={workspaceId} />
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedMeeting(null)}
                    className="text-slate-400 hover:text-slate-700 rounded-full p-1.5 hover:bg-slate-200/60 transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Panel Body */}
            <div className="p-6 overflow-y-auto flex flex-col gap-5">
              {/* Time info */}
              <div className="flex items-start gap-3.5 bg-blue-50/40 p-4 rounded-2xl border border-blue-100">
                <Clock className="size-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-extrabold text-slate-900">
                    {format(parseISO(selectedMeeting.start_time), 'EEEE, dd/MM/yyyy HH:mm', { locale: vi })}
                    {' → '}
                    {format(parseISO(selectedMeeting.end_time), 'HH:mm', { locale: vi })}
                  </p>
                  <p className="text-xs text-blue-800 font-bold">
                    Thời lượng:{' '}
                    {Math.round(
                      (new Date(selectedMeeting.end_time).getTime() - new Date(selectedMeeting.start_time).getTime()) /
                        60000
                    )}{' '}
                    phút
                  </p>
                </div>
              </div>

              {/* Participants */}
              <div className="flex flex-col gap-2.5">
                <p className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="size-4 text-blue-600" />
                  Người tham gia ({selectedMeeting.participants?.length || 0})
                </p>
                {(selectedMeeting.participants?.length ?? 0) > 0 && (
                  <div className="flex flex-col gap-2 max-h-40 overflow-y-auto pr-1">
                    {selectedMeeting.participants.map((pid) => {
                      const m = memberMap[pid];
                      if (!m) return null;
                      return (
                        <div
                          key={pid}
                          className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-blue-50/50 transition-colors"
                        >
                          <MemberAvatar
                            name={m.name}
                            image={m.avatar_url ?? m.avatarUrl}
                            className="size-8 ring-2 ring-blue-200"
                          />
                          <div className="flex flex-col leading-tight">
                            <span className="text-sm font-bold text-slate-900">{m.name}</span>
                            <span className="text-xs text-slate-500 font-medium">{m.email}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Report Section with Fullscreen Navigation */}
              <div
                onClick={() => router.push(`/workspaces/${workspaceId}/meetings/${selectedMeeting.id}`)}
                className="group border border-blue-100 rounded-2xl p-4 bg-gradient-to-br from-slate-50 via-white to-blue-50/30 hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-extrabold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-blue-600" />
                    Biên bản cuộc họp
                  </p>
                  <span className="text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    Soạn thảo toàn màn hình <ChevronRight className="size-3.5" />
                  </span>
                </div>
                {selectedMeeting.report && Object.keys(selectedMeeting.report).length > 0 ? (
                  <MeetingReportEditor initialContent={selectedMeeting.report} readOnly={true} />
                ) : (
                  <div className="text-xs text-slate-500 font-medium py-4 text-center border border-dashed border-blue-200 rounded-xl bg-white/80">
                    Chưa có nội dung biên bản. Bấm để mở giao diện soạn thảo toàn màn hình.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Create Meeting Modal ── */}
      {isCreateModalOpen && (
        <CreateMeetingModal
          isOpen={isCreateModalOpen}
          setIsOpen={setIsCreateModalOpen}
          workspaceId={workspaceId}
          initialDate={createModalDate}
        />
      )}
    </div>
  );
};
