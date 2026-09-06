'use client';

import { Check, Loader2, Search, UserPlus, Users } from 'lucide-react';
import { useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAddMember } from '@/features/members/api/use-add-member';
import { useGetMembers } from '@/features/members/api/use-get-members';
import { useGetUsers } from '@/features/members/api/use-get-users';
import { MemberAvatar } from '@/features/members/components/member-avatar';
import { MemberRole } from '@/features/members/types';
import { useWorkspaceId } from '@/features/workspaces/hooks/use-workspace-id';
import { useDebounce } from '@/hooks/use-debounce';

export const AddMemberDialog = () => {
  const workspaceId = useWorkspaceId();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<MemberRole>(MemberRole.MEMBER);

  const debouncedSearch = useDebounce(search, 300);

  const { data: membersData } = useGetMembers({ workspaceId });
  const { data: usersData, isLoading: isLoadingUsers } = useGetUsers({
    search: debouncedSearch,
    pageSize: 20,
  });

  const { mutate: addMember, isPending: isAddingMember } = useAddMember();

  const existingMemberUserIds = new Set(
    (membersData?.documents || []).map((m) => String(m.user_id || m.userId || m.$id)),
  );

  const handleAdd = (userId: string | number) => {
    addMember(
      {
        json: {
          workspaceId,
          userId,
          role: selectedRole,
        },
      },
      {
        onSuccess: () => {
          // Keep dialog open so user can add multiple members if they want
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <UserPlus className="size-4" />
          Thêm nhân sự
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Users className="size-5 text-primary" />
            Thêm nhân sự vào phòng ban
          </DialogTitle>
          <DialogDescription>
            Tìm kiếm người dùng theo tên hoặc địa chỉ email để thêm vào phòng ban.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          {/* Search Bar & Role Selection */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Nhập tên hoặc email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
                autoFocus
              />
            </div>

            <Select
              value={selectedRole}
              onValueChange={(val) => setSelectedRole(val as MemberRole)}
            >
              <SelectTrigger className="w-full sm:w-[150px] h-9">
                <SelectValue placeholder="Vai trò" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={MemberRole.MEMBER}>Nhân viên</SelectItem>
                <SelectItem value={MemberRole.ADMIN}>Trưởng phòng</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Users List Container */}
          <div className="max-h-[320px] overflow-y-auto rounded-md border p-2 space-y-1 divide-y divide-neutral-100">
            {isLoadingUsers ? (
              <div className="flex h-32 flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-5 animate-spin" />
                <span className="text-xs">Đang tìm kiếm người dùng...</span>
              </div>
            ) : !usersData?.items || usersData.items.length === 0 ? (
              <div className="flex h-32 flex-col items-center justify-center text-center text-sm text-muted-foreground">
                <p>Không tìm thấy người dùng phù hợp.</p>
                <p className="text-xs text-neutral-400 mt-1">
                  Vui lòng thử tìm kiếm bằng từ khóa hoặc email khác.
                </p>
              </div>
            ) : (
              usersData.items.map((user) => {
                const isMember = existingMemberUserIds.has(String(user.id));

                return (
                  <div
                    key={String(user.id)}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg hover:bg-neutral-50 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <MemberAvatar
                        name={user.name}
                        image={user.avatar_url}
                        className="size-9"
                        fallbackClassName="text-sm font-semibold"
                      />
                      <div className="flex flex-col min-w-0">
                        <p className="text-sm font-medium truncate">{user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                    </div>

                    <div>
                      {isMember ? (
                        <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 gap-1">
                          <Check className="size-3" />
                          Đã tham gia
                        </Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleAdd(user.id)}
                          disabled={isAddingMember}
                          className="h-8 gap-1 text-xs hover:bg-primary hover:text-white transition"
                        >
                          <UserPlus className="size-3.5" />
                          Thêm
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
