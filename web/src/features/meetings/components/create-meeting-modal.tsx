'use client';

import { useEffect, useMemo, useState } from 'react';
import { ResponsiveModal } from '@/components/responsive-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useGetMembers } from '@/features/members/api/use-get-members';
import { MemberAvatar } from '@/features/members/components/member-avatar';
import { cn } from '@/lib/utils';
import { Check, CheckCheck, Clock, Search, Sparkles, UserCheck, Users, Video, X } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateMeeting } from '../api/use-create-meeting';

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
  const [searchQuery, setSearchQuery] = useState('');

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

  const memberList = useMemo(() => {
    return members?.documents ?? [];
  }, [members]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return memberList;
    const query = searchQuery.toLowerCase().trim();
    return memberList.filter(
      (m) =>
        m.name?.toLowerCase().includes(query) ||
        m.email?.toLowerCase().includes(query)
    );
  }, [memberList, searchQuery]);

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredMembers.map((m) => m.$id);
    setParticipants((prev) => {
      const combined = new Set([...prev, ...filteredIds]);
      return Array.from(combined);
    });
  };

  const handleDeselectAll = () => {
    setParticipants([]);
  };

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
        participants,
      },
      {
        onSuccess: () => {
          setIsOpen(false);
          setTitle('');
          setStartTime('');
          setEndTime('');
          setParticipants([]);
          setSearchQuery('');
        },
      }
    );
  };

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={setIsOpen}
      title="Tạo cuộc họp mới"
      description="Điền thông tin để tạo một cuộc họp mới cho phòng ban."
      className="max-w-2xl sm:max-w-3xl md:max-w-3xl lg:max-w-4xl"
    >
      <div className="w-full h-full p-6 sm:p-7 bg-gradient-to-b from-slate-50/80 via-white to-slate-50/80 overflow-y-auto">
        {/* Bright Header */}
        <div className="flex items-center gap-3.5 mb-6 p-4 rounded-2xl bg-gradient-to-r from-blue-50 via-indigo-50/80 to-purple-50/50 border border-blue-200/80 shadow-xs">
          <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl text-white shadow-md shadow-blue-500/20">
            <Video className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900 leading-tight">Tạo cuộc họp mới</h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Lên lịch họp và gửi thông báo tự động cho các thành viên
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
              <Sparkles className="size-3.5 text-indigo-600" />
              Tên cuộc họp
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tên cuộc họp (ví dụ: Họp Sprint Review tuần 3)..."
              disabled={isPending}
              className="rounded-xl border-slate-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-800 placeholder:text-slate-400 h-11 shadow-2xs"
            />
          </div>

          {/* Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gradient-to-r from-indigo-50/50 via-blue-50/30 to-purple-50/40 p-4 rounded-2xl border border-indigo-100/90 shadow-2xs">
            <div className="space-y-2">
              <Label htmlFor="startTime" className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 uppercase tracking-wide">
                <Clock className="size-3.5 text-indigo-600" />
                Thời gian Bắt đầu
              </Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isPending}
                className="rounded-xl border-slate-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-semibold text-slate-800 text-xs h-10 shadow-2xs"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime" className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 uppercase tracking-wide">
                <Clock className="size-3.5 text-purple-600" />
                Thời gian Kết thúc
              </Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isPending}
                className="rounded-xl border-slate-200 bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 font-semibold text-slate-800 text-xs h-10 shadow-2xs"
              />
            </div>
          </div>

          {/* Expanded Participants Section */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wide">
                <Users className="size-3.5 text-indigo-600" />
                Thành viên tham gia
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200/80 shadow-2xs">
                  Đã chọn: <span className="font-bold text-indigo-900">{participants.length}</span> / {memberList.length} thành viên
                </span>
              </div>
            </div>

            {/* Search & Bulk Selection Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                <Input
                  placeholder="Tìm kiếm theo tên hoặc email thành viên..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isPending}
                  className="pl-9 h-9 text-xs rounded-xl border-slate-200 bg-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllFiltered}
                  disabled={isPending || filteredMembers.length === 0}
                  className="h-9 text-xs font-semibold rounded-xl border-slate-200 bg-white hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-colors"
                >
                  <CheckCheck className="size-3.5 mr-1 text-indigo-600" />
                  Chọn tất cả
                </Button>
                {participants.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDeselectAll}
                    disabled={isPending}
                    className="h-9 text-xs font-semibold rounded-xl text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  >
                    <X className="size-3.5 mr-1 text-rose-500" />
                    Bỏ chọn ({participants.length})
                  </Button>
                )}
              </div>
            </div>

            {/* Multi-column Grid Member Selection Area */}
            <ScrollArea className="h-64 sm:h-72 border border-slate-200/90 rounded-2xl p-2.5 bg-slate-50/40 shadow-inner">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {filteredMembers.map((member) => {
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
                        'flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all border select-none group',
                        isSelected
                          ? 'bg-gradient-to-r from-blue-50/90 via-indigo-50/90 to-purple-50/50 border-indigo-300 ring-1 ring-indigo-300/50 shadow-xs font-semibold text-indigo-950'
                          : 'bg-white border-slate-200/80 hover:bg-slate-50 hover:border-slate-300 text-slate-700'
                      )}
                    >
                      <MemberAvatar
                        name={member.name}
                        image={member.avatar_url}
                        className={cn(
                          'size-8 shrink-0 transition-transform group-hover:scale-105',
                          isSelected ? 'ring-2 ring-indigo-500' : 'ring-1 ring-slate-200'
                        )}
                      />
                      <div className="flex flex-col flex-1 min-w-0 leading-tight">
                        <span className="text-sm font-semibold truncate group-hover:text-indigo-600 transition-colors">
                          {member.name}
                        </span>
                        <span className="text-xs text-slate-400 font-normal truncate">
                          {member.email}
                        </span>
                      </div>
                      <div
                        className={cn(
                          'size-5 rounded-md flex items-center justify-center shrink-0 transition-all',
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'border border-slate-300 group-hover:border-indigo-400 bg-white'
                        )}
                      >
                        {isSelected && <Check className="size-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}

                {filteredMembers.length === 0 && memberList.length > 0 && (
                  <div className="col-span-full py-8 text-center">
                    <p className="text-xs font-medium text-slate-500">
                      Không tìm thấy thành viên nào khớp với từ khóa &ldquo;{searchQuery}&rdquo;
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchQuery('')}
                      className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-semibold mt-1 h-7"
                    >
                      Xóa tìm kiếm
                    </Button>
                  </div>
                )}

                {memberList.length === 0 && (
                  <div className="col-span-full py-8 text-center text-slate-400">
                    <Users className="size-8 mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                    <p className="text-xs font-medium">Chưa có thành viên nào trong không gian làm việc</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200/80">
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
              className="rounded-xl shadow-md shadow-indigo-500/25 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-6 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Tạo cuộc họp
            </Button>
          </div>
        </form>
      </div>
    </ResponsiveModal>
  );
};
