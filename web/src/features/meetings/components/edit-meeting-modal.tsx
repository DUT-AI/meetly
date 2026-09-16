'use client';

import { useEffect, useState } from 'react';
import { Check, Clock, Edit3, FileText, Sparkles, Users } from 'lucide-react';

import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGetMembers } from '@/features/members/api/use-get-members';
import { MemberAvatar } from '@/features/members/components/member-avatar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import { useUpdateMeeting } from '../api/use-update-meeting';
import { MeetingReportEditor } from './meeting-report-editor';
import type { Meeting } from '../types';

interface EditMeetingModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  workspaceId: string;
  meeting: Meeting;
}

/** Converts an ISO UTC string to local datetime-local input value (YYYY-MM-DDTHH:mm) */
function toLocalDatetimeValue(isoString: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const EditMeetingModal = ({ isOpen, setIsOpen, workspaceId, meeting }: EditMeetingModalProps) => {
  const { mutate: updateMeeting, isPending } = useUpdateMeeting(workspaceId);
  const { data: members } = useGetMembers({ workspaceId });

  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [report, setReport] = useState<Record<string, any>>({});

  // Pre-fill form with existing meeting data when modal opens
  useEffect(() => {
    if (isOpen && meeting) {
      setTitle(meeting.title);
      setStartTime(toLocalDatetimeValue(meeting.start_time));
      setEndTime(toLocalDatetimeValue(meeting.end_time));
      setParticipants(meeting.participants ?? []);
      setReport(meeting.report ?? {});
    }
  }, [isOpen, meeting]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Vui lòng nhập tên cuộc họp');
      return;
    }
    if (!startTime) {
      toast.error('Vui lòng chọn thời gian bắt đầu');
      return;
    }
    if (!endTime) {
      toast.error('Vui lòng chọn thời gian kết thúc');
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end.getTime() <= start.getTime()) {
      toast.error('Thời gian kết thúc phải lớn hơn thời gian bắt đầu');
      return;
    }

    if (participants.length === 0) {
      toast.error('Cuộc họp phải có ít nhất 1 người tham gia');
      return;
    }

    updateMeeting(
      {
        meetingId: meeting.id,
        payload: {
          title: title.trim(),
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          participants,
          report,
        },
      },
      {
        onSuccess: () => {
          setIsOpen(false);
        },
      }
    );
  };

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={setIsOpen}
      title="Chỉnh sửa cuộc họp"
      description="Cập nhật thông tin của cuộc họp."
    >
      <div className="w-full h-full p-6 bg-gradient-to-b from-slate-50 via-white to-slate-50 overflow-y-auto">
        {/* Bright Header */}
        <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-slate-50 border border-purple-200/80">
          <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-xs">
            <Edit3 className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 leading-tight">Chỉnh sửa cuộc họp</h2>
            <p className="text-xs text-slate-500 font-semibold">Cập nhật thời gian, thành viên và biên bản cuộc họp</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title" className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="size-3.5 text-purple-600" />
              Tên cuộc họp
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tên cuộc họp..."
              disabled={isPending}
              className="rounded-xl border-slate-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-medium text-slate-800 h-11"
            />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-4 bg-purple-50/40 p-4 rounded-2xl border border-purple-100/80">
            <div className="space-y-2">
              <Label htmlFor="edit-startTime" className="text-xs font-bold text-purple-900 flex items-center gap-1.5 uppercase tracking-wide">
                <Clock className="size-3.5 text-purple-600" />
                Thời gian Bắt đầu
              </Label>
              <Input
                id="edit-startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isPending}
                className="rounded-xl border-slate-200 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-semibold text-slate-800 text-xs h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-endTime" className="text-xs font-bold text-purple-900 flex items-center gap-1.5 uppercase tracking-wide">
                <Clock className="size-3.5 text-indigo-600" />
                Thời gian Kết thúc
              </Label>
              <Input
                id="edit-endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isPending}
                className="rounded-xl border-slate-200 bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 font-semibold text-slate-800 text-xs h-10"
              />
            </div>
          </div>

          {/* Participant picker */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                <Users className="size-3.5 text-purple-600" />
                Thành viên tham gia
              </Label>
              <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-100">
                Đã chọn: {participants.length} người
              </span>
            </div>

            <ScrollArea className="h-44 border border-slate-200 rounded-2xl p-2 bg-white shadow-2xs">
              <div className="space-y-1.5">
                {members?.documents.map((member) => {
                  const isSelected = participants.includes(member.$id);
                  return (
                    <div
                      key={member.$id}
                      onClick={() => {
                        setParticipants((prev) =>
                          prev.includes(member.$id)
                            ? prev.filter((id) => id !== member.$id)
                            : [...prev, member.$id]
                        );
                      }}
                      className={cn(
                        'flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border',
                        isSelected
                          ? 'bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-300 shadow-2xs font-semibold text-purple-950'
                          : 'border-transparent hover:bg-slate-50 text-slate-700'
                      )}
                    >
                      <MemberAvatar name={member.name} image={member.avatar_url} className="size-7 ring-2 ring-purple-100" />
                      <div className="flex flex-col flex-1 leading-tight">
                        <span className="text-sm font-semibold">{member.name}</span>
                        <span className="text-xs text-slate-400 font-normal">{member.email}</span>
                      </div>
                      {isSelected && (
                        <div className="size-5 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-2xs">
                          <Check className="size-3.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
                {!members?.documents?.length && (
                  <p className="text-sm text-slate-400 text-center py-6 font-medium">
                    Chưa có thành viên nào trong phòng ban
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Report Editor */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
              <FileText className="size-3.5 text-purple-600" />
              Biên bản cuộc họp (Tuỳ chọn)
            </Label>
            <div className="border border-slate-200 rounded-2xl p-3 bg-white">
              <MeetingReportEditor onContentChange={setReport} initialContent={report} />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
              className="rounded-xl border-slate-200 text-slate-700 hover:bg-slate-100 font-medium px-5"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-xl shadow-md shadow-purple-500/25 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold px-6 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </div>
    </ResponsiveModal>
  );
};
