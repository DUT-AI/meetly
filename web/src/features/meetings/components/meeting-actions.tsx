'use client';

import { useState } from 'react';
import { MoreHorizontal, Trash, Pencil } from 'lucide-react';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useDeleteMeeting } from '../api/use-delete-meeting';
import { useConfirm } from '@/hooks/use-confirm';
import { EditMeetingModal } from './edit-meeting-modal';
import type { Meeting } from '../types';

interface MeetingActionsProps {
  meeting: Meeting;
  workspaceId: string;
}

export const MeetingActions = ({ meeting, workspaceId }: MeetingActionsProps) => {
  const { mutate: deleteMeeting, isPending: isDeleting } = useDeleteMeeting(workspaceId);
  const [ConfirmDialog, confirm] = useConfirm(
    'Xóa cuộc họp',
    'Bạn có chắc muốn xóa cuộc họp này không?',
    'destructive'
  );
  const [isEditOpen, setIsEditOpen] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm();
    if (ok) {
      deleteMeeting(meeting.id);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditOpen(true);
  };

  return (
    <>
      <ConfirmDialog />
      <EditMeetingModal
        isOpen={isEditOpen}
        setIsOpen={setIsEditOpen}
        workspaceId={workspaceId}
        meeting={meeting}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" className="size-8 p-0">
            <MoreHorizontal className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={handleEditClick} className="cursor-pointer">
            <Pencil className="size-4 mr-2" />
            Sửa cuộc họp
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDelete}
            className="text-red-500 cursor-pointer"
            disabled={isDeleting}
          >
            <Trash className="size-4 mr-2" />
            Xóa cuộc họp
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};
