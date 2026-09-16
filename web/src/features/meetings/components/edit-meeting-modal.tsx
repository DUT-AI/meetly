'use client';

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

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
      <div className="w-full h-full p-6 bg-white overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Chỉnh sửa cuộc họp</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Tên cuộc họp</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tên cuộc họp"
              disabled={isPending}
            />
          </div>

          {/* Time range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-startTime">Bắt đầu</Label>
              <Input
                id="edit-startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-endTime">Kết thúc</Label>
              <Input
                id="edit-endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Participant picker */}
          <div className="space-y-2">
            <Label>Thành viên tham gia</Label>
            <ScrollArea className="h-40 border rounded-md p-2">
              <div className="space-y-1">
                {members?.documents.map((member) => (
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
                      'flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors hover:bg-neutral-100',
                      participants.includes(member.$id) && 'bg-blue-50/50 hover:bg-blue-50'
                    )}
                  >
                    <MemberAvatar name={member.name} image={member.avatar_url} className="size-6" />
                    <span className="text-sm flex-1">{member.name}</span>
                    {participants.includes(member.$id) && <Check className="size-4 text-blue-600" />}
                  </div>
                ))}
                {!members?.documents?.length && (
                  <p className="text-sm text-neutral-500 text-center py-4">
                    Chưa có thành viên nào trong phòng ban
                  </p>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Report editor */}
          <div className="space-y-2">
            <Label>Biên bản cuộc họp (Tuỳ chọn)</Label>
            <MeetingReportEditor onContentChange={setReport} initialContent={report} />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending || !title || !startTime || !endTime}>
              {isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </Button>
          </div>
        </form>
      </div>
    </ResponsiveModal>
  );
};
