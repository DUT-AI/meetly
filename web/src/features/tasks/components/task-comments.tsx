'use client';

import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  AtSign,
  Edit2,
  Loader2,
  MessageSquare,
  MoreVertical,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { DottedSeparator } from '@/components/dotted-separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { useCurrent } from '@/features/auth/api/use-current';
import { useGetMembers } from '@/features/members/api/use-get-members';
import { MemberAvatar } from '@/features/members/components/member-avatar';
import type { Member } from '@/features/members/types';
import { useCreateTaskComment } from '@/features/tasks/api/use-create-task-comment';
import { useDeleteTaskComment } from '@/features/tasks/api/use-delete-task-comment';
import { useGetTaskComments } from '@/features/tasks/api/use-get-task-comments';
import { useUpdateTaskComment } from '@/features/tasks/api/use-update-task-comment';
import type { TaskComment } from '@/features/tasks/types';
import { useConfirm } from '@/hooks/use-confirm';
import { cn } from '@/lib/utils';

interface TaskCommentsProps {
  taskId: string;
  workspaceId: string;
}

export const TaskComments = ({ taskId, workspaceId }: TaskCommentsProps) => {
  const { data: currentUser } = useCurrent();
  const { data: membersData } = useGetMembers({ workspaceId });
  const members = membersData?.documents || [];

  const { data: comments, isLoading } = useGetTaskComments({ taskId });
  const { mutate: createComment, isPending: isCreating } = useCreateTaskComment({ taskId });
  const { mutate: updateComment, isPending: isUpdating } = useUpdateTaskComment({ taskId });
  const { mutate: deleteComment, isPending: isDeleting } = useDeleteTaskComment({ taskId });

  const [ConfirmDialog, confirmDelete] = useConfirm(
    'Xóa bình luận',
    'Bạn có chắc chắn muốn xóa bình luận này không?',
    'destructive',
  );

  const [content, setContent] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');

  // Mention system state for create comment
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredMembers = useMemo(() => {
    if (!mentionFilter) return members;
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(mentionFilter.toLowerCase()) ||
        m.email.toLowerCase().includes(mentionFilter.toLowerCase()),
    );
  }, [members, mentionFilter]);

  // Handle textarea text change & detecting @
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([\p{L}\w]*)$/u);

    if (atMatch) {
      setShowMentionMenu(true);
      setMentionFilter(atMatch[1]);
      setMentionIndex(0);
    } else {
      setShowMentionMenu(false);
    }
  };

  const handleSelectMention = (member: Member) => {
    if (!textareaRef.current) return;
    const cursorPos = textareaRef.current.selectionStart;
    const textBeforeCursor = content.slice(0, cursorPos);
    const textAfterCursor = content.slice(cursorPos);

    const atIndex = textBeforeCursor.lastIndexOf('@');
    if (atIndex !== -1) {
      const newTextBefore = textBeforeCursor.slice(0, atIndex) + `@${member.name} `;
      const newContent = newTextBefore + textAfterCursor;
      setContent(newContent);
      setShowMentionMenu(false);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = newTextBefore.length;
          textareaRef.current.selectionEnd = newTextBefore.length;
        }
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionMenu && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((prev) => (prev + 1) % filteredMembers.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((prev) => (prev - 1 + filteredMembers.length) % filteredMembers.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectMention(filteredMembers[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowMentionMenu(false);
        return;
      }
    }

    // Ctrl+Enter or Cmd+Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const extractMentionedUserIds = (text: string): string[] => {
    const mentionedIds: string[] = [];
    for (const m of members) {
      if (text.includes(`@${m.name}`)) {
        if (!mentionedIds.includes(m.userId)) {
          mentionedIds.push(m.userId);
        }
      }
    }
    return mentionedIds;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = content.trim();
    if (!clean) return;

    const mentions = extractMentionedUserIds(clean);

    createComment(
      { content: clean, mentions },
      {
        onSuccess: () => {
          setContent('');
          setShowMentionMenu(false);
        },
      },
    );
  };

  const handleStartEdit = (comment: TaskComment) => {
    setEditingCommentId(comment.id);
    setEditingContent(comment.content);
  };

  const handleSaveEdit = (commentId: string) => {
    const clean = editingContent.trim();
    if (!clean) return;

    const mentions = extractMentionedUserIds(clean);

    updateComment(
      {
        commentId,
        data: { content: clean, mentions },
      },
      {
        onSuccess: () => {
          setEditingCommentId(null);
        },
      },
    );
  };

  const handleDelete = async (commentId: string) => {
    const ok = await confirmDelete();
    if (!ok) return;

    deleteComment({ commentId });
  };

  // Render formatted content with highlight for mentions
  const renderFormattedContent = (text: string) => {
    const memberNames = members.map((m) => m.name).filter(Boolean);
    if (memberNames.length === 0) return text;

    const regex = new RegExp(`(@(?:${memberNames.join('|')}))`, 'g');
    const parts = text.split(regex);

    return parts.map((part, i) => {
      if (part.startsWith('@') && memberNames.includes(part.slice(1))) {
        return (
          <span
            key={i}
            className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold text-xs mx-0.5"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <>
      <ConfirmDialog />
      <div className="rounded-lg border bg-white p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="size-5 text-neutral-600" />
            <h3 className="text-lg font-semibold">Trao đổi & Bình luận</h3>
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-600">
              {comments?.length || 0}
            </span>
          </div>
        </div>

        <DottedSeparator />

        {/* Input box */}
        <div className="relative flex flex-col gap-2">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            placeholder="Viết bình luận... Gõ @ để nhắc tên đồng nghiệp (Ctrl+Enter để gửi)"
            className="min-h-[85px] resize-none bg-neutral-50/50 text-sm focus-visible:bg-white"
            disabled={isCreating}
          />

          {/* Autocomplete mention popover */}
          {showMentionMenu && filteredMembers.length > 0 && (
            <div className="absolute z-50 left-2 bottom-12 w-64 max-h-48 overflow-y-auto rounded-lg border bg-white shadow-lg p-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase">
                Nhắc tên thành viên
              </div>
              {filteredMembers.map((m, idx) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSelectMention(m)}
                  className={cn(
                    'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left text-xs transition cursor-pointer',
                    idx === mentionIndex ? 'bg-neutral-100 font-semibold text-primary' : 'hover:bg-neutral-50',
                  )}
                >
                  <MemberAvatar name={m.name} image={m.avatar_url} className="size-5" fallbackClassName="text-[10px]" />
                  <div className="flex flex-col truncate">
                    <span className="truncate">{m.name}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{m.email}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <AtSign className="size-3 text-muted-foreground" /> Gõ <kbd className="px-1 py-0.5 bg-neutral-100 rounded border">@</kbd> để mention
            </p>

            <Button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isCreating || !content.trim()}
              size="sm"
              className="gap-x-1.5"
            >
              {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-3.5" />}
              Bình luận
            </Button>
          </div>
        </div>

        <DottedSeparator />

        {/* Comments List */}
        <div className="space-y-4 pt-1">
          {isLoading ? (
            <div className="flex items-center justify-center p-6 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : !comments || comments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
              <MessageSquare className="size-8 stroke-1 mb-1 text-neutral-400" />
              <p className="text-sm font-medium">Chưa có bình luận nào</p>
              <p className="text-xs">Hãy bắt đầu cuộc thảo luận cho công việc này.</p>
            </div>
          ) : (
            comments.map((comment) => {
              const isAuthor =
                currentUser?.id &&
                (String(currentUser.id) === String(comment.user?.id) ||
                  String(currentUser.id) === String(comment.userId));
              const isEditing = editingCommentId === comment.id;
              const authorName = comment.user?.name || comment.userName || 'User';
              const authorAvatar =
                comment.user?.avatarUrl || comment.user?.avatar_url || comment.userAvatarUrl;

              return (
                <div key={comment.id} className="flex gap-3 text-sm group">
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage src={authorAvatar || undefined} />
                    <AvatarFallback className="text-xs bg-neutral-200 font-semibold">
                      {authorName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-neutral-800 text-xs">
                          {authorName}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt), {
                            addSuffix: true,
                            locale: vi,
                          })}
                        </span>
                      </div>

                      {isAuthor && !isEditing && (
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-6 opacity-0 group-hover:opacity-100 transition"
                            >
                              <MoreVertical className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem
                              onClick={() => handleStartEdit(comment)}
                              className="cursor-pointer gap-2 text-xs"
                            >
                              <Edit2 className="size-3" /> Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(comment.id)}
                              className="cursor-pointer gap-2 text-xs text-destructive focus:text-destructive"
                            >
                              <Trash2 className="size-3" /> Xóa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 pt-1">
                        <Textarea
                          value={editingContent}
                          onChange={(e) => setEditingContent(e.target.value)}
                          className="text-xs min-h-[60px]"
                          autoFocus
                        />
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            type="button"
                            variant="secondary"
                            size="xs"
                            onClick={() => setEditingCommentId(null)}
                          >
                            <X className="size-3 mr-1" /> Hủy
                          </Button>
                          <Button
                            type="button"
                            size="xs"
                            disabled={isUpdating || !editingContent.trim()}
                            onClick={() => handleSaveEdit(comment.id)}
                          >
                            Lưu
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-neutral-50 p-2.5 text-xs text-neutral-800 whitespace-pre-wrap leading-relaxed border border-neutral-100">
                        {renderFormattedContent(comment.content)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};
