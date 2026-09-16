'use client';

import {
  addDays,
  addMonths,
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
} from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, Plus, PlusIcon, Users, X } from 'lucide-react';
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

const WEEKDAY_LABELS = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];

const MEETING_COLORS = [
  'bg-blue-600 text-white',
  'bg-violet-600 text-white',
  'bg-emerald-600 text-white',
  'bg-amber-600 text-white',
  'bg-rose-600 text-white',
  'bg-cyan-600 text-white',
  'bg-indigo-600 text-white',
  'bg-teal-600 text-white',
];

function getMeetingColor(meetingId: string): string {
  let hash = 0;
  for (let i = 0; i < meetingId.length; i++) {
    hash = meetingId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return MEETING_COLORS[Math.abs(hash) % MEETING_COLORS.length];
}

export const MeetingsClient = () => {
  const workspaceId = useWorkspaceId();
  const { data: meetingsResponse, isLoading: isLoadingMeetings } = useGetMeetings(workspaceId);
  const { data: member, isLoading: isLoadingMember } = useCurrentMember({ workspaceId });
  const { data: membersResponse } = useGetMembers({ workspaceId });

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [selectedDayOverview, setSelectedDayOverview] = useState<Date | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createModalDate, setCreateModalDate] = useState<Date | null>(null);

  const isLoading = isLoadingMeetings || isLoadingMember;
  const isAdmin = member?.role === 'ADMIN';

  // Lookup map: memberId → member object
  const memberMap = Object.fromEntries(
    (membersResponse?.documents ?? []).map((m) => [m.$id, m])
  );

  if (isLoading) return <PageLoader />;
  if (!meetingsResponse || !member) return <PageError message="Không thể tải dữ liệu cuộc họp" />;

  const meetings: Meeting[] = meetingsResponse.documents || [];

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  function getMeetingsForDay(day: Date): Meeting[] {
    return meetings
      .filter((m) => isSameDay(parseISO(m.start_time), day))
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }

  const handleOpenCreateForDate = (date: Date) => {
    setCreateModalDate(date);
    setIsCreateModalOpen(true);
  };

  const dayOverviewMeetings = selectedDayOverview ? getMeetingsForDay(selectedDayOverview) : [];

  return (
    <div className="flex flex-col h-full bg-slate-50/50 p-4 gap-4 overflow-hidden">
      {/* ── Header Controls ── */}
      <div className="flex items-center justify-between bg-white px-5 py-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-white text-slate-600 shadow-none"
              onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-white text-slate-600 shadow-none"
              onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <h1 className="text-lg font-bold text-slate-900 capitalize min-w-[200px]">
            {format(currentMonth, "'Tháng' MM 'năm' yyyy", { locale: vi })}
          </h1>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentMonth(new Date())}
            className="text-xs font-semibold text-slate-700 rounded-xl border-slate-200 hover:bg-slate-50"
          >
            Hôm nay
          </Button>
        </div>

        {isAdmin && (
          <Button
            onClick={() => {
              setCreateModalDate(null);
              setIsCreateModalOpen(true);
            }}
            className="rounded-xl shadow-xs bg-blue-600 hover:bg-blue-700 text-white gap-2 font-medium"
          >
            <PlusIcon className="size-4" />
            Tạo cuộc họp
          </Button>
        )}
      </div>

      {/* ── Calendar Grid Card ── */}
      <div className="flex-1 bg-white border border-slate-200/80 rounded-2xl shadow-xs flex flex-col overflow-hidden">
        {/* Weekday labels */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/80">
          {WEEKDAY_LABELS.map((label, i) => (
            <div
              key={label}
              className={cn(
                'py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider',
                i === 0 && 'text-rose-500/80' // Sunday highlight
              )}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto">
          {calendarDays.map((day, idx) => {
            const dayMeetings = getMeetingsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isCurrentDay = isToday(day);
            const visibleMeetings = dayMeetings.slice(0, 2);
            const hiddenCount = dayMeetings.length - visibleMeetings.length;

            return (
              <div
                key={idx}
                className={cn(
                  'border-r border-b border-slate-100 p-2 flex flex-col group min-h-[115px] transition-colors relative hover:bg-slate-50/70',
                  !isCurrentMonth && 'bg-slate-50/40 opacity-50',
                  isCurrentDay && 'bg-blue-50/30 font-medium'
                )}
              >
                {/* Cell Header: Date & Quick Add Button */}
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={cn(
                      'text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full transition-all',
                      isCurrentDay
                        ? 'bg-blue-600 text-white font-bold shadow-xs'
                        : isCurrentMonth
                        ? 'text-slate-700 group-hover:text-slate-900'
                        : 'text-slate-400'
                    )}
                  >
                    {format(day, 'd')}
                  </span>

                  {isAdmin && (
                    <button
                      onClick={() => handleOpenCreateForDate(day)}
                      title="Thêm cuộc họp ngày này"
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-200/70 rounded-lg text-slate-600"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Meeting Chips */}
                <div className="flex flex-col gap-1 flex-1 overflow-hidden">
                  {visibleMeetings.map((meeting) => (
                    <button
                      key={meeting.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMeeting(meeting);
                      }}
                      className={cn(
                        'w-full text-left text-[11px] font-semibold px-2 py-1 rounded-lg truncate transition-transform active:scale-[0.98] shadow-xs flex items-center gap-1.5',
                        getMeetingColor(meeting.id)
                      )}
                    >
                      <span className="opacity-90 shrink-0 font-medium">
                        {format(parseISO(meeting.start_time), 'HH:mm')}
                      </span>
                      <span className="truncate">{meeting.title}</span>
                    </button>
                  ))}

                  {/* +N More Meetings Button */}
                  {hiddenCount > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDayOverview(day);
                      }}
                      className="mt-auto w-full text-left text-[11px] font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 px-2 py-1 rounded-lg transition-colors flex items-center justify-between"
                    >
                      <span>+{hiddenCount} cuộc họp khác</span>
                      <ChevronRight className="size-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Day Overview Modal (When clicking +N meetings) ── */}
      {selectedDayOverview && (
        <ResponsiveModal
          open={!!selectedDayOverview}
          onOpenChange={(open) => !open && setSelectedDayOverview(null)}
          title={`Các cuộc họp ngày ${format(selectedDayOverview, 'dd/MM/yyyy')}`}
          description={`Danh sách ${dayOverviewMeetings.length} cuộc họp diễn ra trong ngày.`}
        >
          <div className="p-6 bg-white flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {format(selectedDayOverview, 'EEEE, dd/MM/yyyy', { locale: vi })}
              </h3>
              {isAdmin && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const day = selectedDayOverview;
                    setSelectedDayOverview(null);
                    handleOpenCreateForDate(day);
                  }}
                  className="text-xs font-semibold gap-1.5 rounded-lg"
                >
                  <Plus className="size-3.5" />
                  Thêm cuộc họp
                </Button>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              {dayOverviewMeetings.map((m) => (
                <div
                  key={m.id}
                  onClick={() => {
                    setSelectedDayOverview(null);
                    setSelectedMeeting(m);
                  }}
                  className="group flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-100/80 hover:border-slate-200 transition-all cursor-pointer shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('w-2 h-10 rounded-full shrink-0', getMeetingColor(m.id))} />
                    <div className="flex flex-col">
                      <p className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
                        {m.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        <Clock className="size-3.5 text-slate-400" />
                        <span>
                          {format(parseISO(m.start_time), 'HH:mm')} → {format(parseISO(m.end_time), 'HH:mm')}
                        </span>
                        <span>•</span>
                        <span>
                          {Math.round(
                            (new Date(m.end_time).getTime() - new Date(m.start_time).getTime()) / 60000
                          )}{' '}
                          phút
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-500">
                      {m.participants?.length || 0} người tham gia
                    </span>
                    <ChevronRight className="size-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ResponsiveModal>
      )}

      {/* ── Meeting Detail Side Panel / Modal ── */}
      {selectedMeeting && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedMeeting(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Panel Header */}
            <div className={cn('px-6 py-5', getMeetingColor(selectedMeeting.id))}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-white text-xl font-bold leading-tight">{selectedMeeting.title}</h2>
                <div className="flex items-center gap-1 shrink-0">
                  {isAdmin && (
                    <div onClick={(e) => e.stopPropagation()}>
                      <MeetingActions meeting={selectedMeeting} workspaceId={workspaceId} />
                    </div>
                  )}
                  <button
                    onClick={() => setSelectedMeeting(null)}
                    className="text-white/80 hover:text-white rounded-full p-1.5 hover:bg-white/20 transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Panel Body */}
            <div className="p-6 overflow-y-auto flex flex-col gap-5">
              {/* Time info */}
              <div className="flex items-start gap-3.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                <Clock className="size-4 text-blue-600 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <p className="text-sm font-semibold text-slate-800">
                    {format(parseISO(selectedMeeting.start_time), 'EEEE, dd/MM/yyyy HH:mm', { locale: vi })}
                    {' → '}
                    {format(parseISO(selectedMeeting.end_time), 'HH:mm', { locale: vi })}
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
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
              <div className="flex items-start gap-3.5">
                <Users className="size-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="flex flex-col gap-2 flex-1">
                  <p className="text-sm font-bold text-slate-800">
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
                            className="flex items-center gap-2.5 p-2 rounded-lg bg-slate-50 hover:bg-slate-100/70 transition-colors"
                          >
                            <MemberAvatar
                              name={m.name}
                              image={m.avatar_url ?? m.avatarUrl}
                              className="size-7"
                            />
                            <div className="flex flex-col leading-tight">
                              <span className="text-sm font-medium text-slate-800">{m.name}</span>
                              <span className="text-xs text-slate-400">{m.email}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Report */}
              {selectedMeeting.report && Object.keys(selectedMeeting.report).length > 0 && (
                <div className="border border-slate-200/80 rounded-xl p-4 bg-slate-50/50">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Biên bản cuộc họp
                  </p>
                  <MeetingReportEditor initialContent={selectedMeeting.report} readOnly={true} />
                </div>
              )}
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
