'use client';

import { useEffect, useState } from 'react';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGetMembers } from '@/features/members/api/use-get-members';
import { MemberAvatar } from '@/features/members/components/member-avatar';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateMeeting } from '../api/use-create-meeting';
import { MeetingReportEditor } from './meeting-report-editor';

interface CreateMeetingModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  workspaceId: string;
  initialDate?: Date | null;
}

export const CreateMeetingModal = ({ isOpen, setIsOpen, workspaceId, initialDate }: CreateMeetingModalProps) => {
  const { mutate: createMeeting, isPending } = useCreateMeeting(workspaceId);
  const { data: members } = useGetMembers({ workspaceId });

  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [report, setReport] = useState({});

  useEffect(() => {
    if (isOpen && initialDate) {
      const d = new Date(initialDate);
      const pad = (n: number) => String(n).padStart(2, '0');
      const year = d.getFullYear();
      const month = pad(d.getMonth() + 1);
      const day = pad(d.getDate());
      setStartTime(`${year}-${month}-${day}T09:00`);
      setEndTime(`${year}-${month}-${day}T10:00`);
    }
  }, [isOpen, initialDate]);

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
    const now = new Date();
    // Cho phép dung sai 60s để tránh trường hợp vừa chọn xong bấm Tạo bị tính là quá khứ vài giây
    if (start.getTime() < now.getTime() - 60000) {
      toast.error('Thời gian bắt đầu không được ở quá khứ');
      return;
    }

    if (end.getTime() <= start.getTime()) {
      toast.error('Thời gian kết thúc phải lớn hơn thời gian bắt đầu');
      return;
    }

    if (participants.length === 0) {
      toast.error('Cuộc họp phải có ít nhất 1 người tham gia');
      return;
    }

    createMeeting(
      {
        title: title.trim(),
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        report,
        participants,
      },
      {
        onSuccess: () => {
          setIsOpen(false);
          setTitle('');
          setStartTime('');
          setEndTime('');
          setParticipants([]);
          setReport({});
        },
      }
    );
  };

  return (
    <ResponsiveModal open={isOpen} onOpenChange={setIsOpen} title="Tạo cuộc họp mới" description="Điền thông tin để tạo một cuộc họp mới cho phòng ban.">
      <div className="w-full h-full p-6 bg-white overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Tạo cuộc họp mới</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Tên cuộc họp</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tên cuộc họp"
              disabled={isPending}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Bắt đầu</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Kết thúc</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Thành viên tham gia</Label>
            <ScrollArea className="h-40 border rounded-md p-2">
              <div className="space-y-1">
                {members?.documents.map((member) => (
                  <div
                    key={member.$id}
                    onClick={() => {
                      setParticipants(prev =>
                        prev.includes(member.$id)
                          ? prev.filter(id => id !== member.$id)
                          : [...prev, member.$id]
                      );
                    }}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-md cursor-pointer transition-colors hover:bg-neutral-100",
                      participants.includes(member.$id) && "bg-blue-50/50 hover:bg-blue-50"
                    )}
                  >
                    <MemberAvatar name={member.name} image={member.avatar_url} className="size-6" />
                    <span className="text-sm flex-1">{member.name}</span>
                    {participants.includes(member.$id) && (
                      <Check className="size-4 text-blue-600" />
                    )}
                  </div>
                ))}
                {!members?.documents?.length && (
                  <p className="text-sm text-neutral-500 text-center py-4">Chưa có thành viên nào trong phòng ban</p>
                )}
              </div>
            </ScrollArea>
          </div>
          <div className="space-y-2">
            <Label>Biên bản cuộc họp (Tuỳ chọn)</Label>
            <MeetingReportEditor onContentChange={setReport} initialContent={report} />
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending}>
              Tạo cuộc họp
            </Button>
          </div>
        </form>
      </div>
    </ResponsiveModal>
  );
};
