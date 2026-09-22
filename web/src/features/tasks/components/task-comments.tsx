'use client';

import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { AtSign, Edit2, Loader2, MessageSquare, MoreVertical, Paperclip, Send, Trash2, X } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { DottedSeparator } from '@/components/dotted-separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { CommentAttachments } from '@/features/assets';
import { useUploadAsset } from '@/features/assets/api/use-upload-asset';
import { formatFileSize } from '@/features/assets/components/asset-icon';
import { DocumentBadgeIcon } from '@/features/assets/components/document-badge-icon';
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
  const { mutateAsync: createCommentAsync, isPending: isCreating } = useCreateTaskComment({ taskId });
  const { mutate: updateComment, isPending: isUpdating } = useUpdateTaskComment({ taskId });
  const { mutate: deleteComment, isPending: isDeleting } = useDeleteTaskComment({ taskId });

  const [ConfirmDialog, confirmDelete] = useConfirm('Xóa bình luận', 'Bạn có chắc chắn muốn xóa bình luận này không?', 'destructive');

  const [content, setContent] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [isDragOverComment, setIsDragOverComment] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mutateAsync: uploadAsset } = useUploadAsset();

  // Mention system state for create comment
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const filteredMembers = useMemo(() => {
    if (!mentionFilter) return members;
    return members.filter(
      (m) => m.name.toLowerCase().includes(mentionFilter.toLowerCase()) || m.email.toLowerCase().includes(mentionFilter.toLowerCase()),
    );
  }, [members, mentionFilter]);

  const addFiles = (files: FileList | File[] | null) => {
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files).map((file) => {
      // If it's a generic screenshot from clipboard (e.g. image.png, blob), assign a descriptive timestamped name
      if (file.name === 'image.png' || file.name === 'blob' || !file.name) {
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
        const ext = file.type.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
        return new File([file], `screenshot_${timestamp}.${ext}`, {
          type: file.type || 'image/png',
        });
      }
      return file;
    });

    setPendingFiles((prev) => [...prev, ...newFiles]);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // Support Ctrl + V / Cmd + V pasting of images or files directly into comment
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const clipboardFiles: File[] = [];

    if (e.clipboardData?.items) {
      for (let i = 0; i < e.clipboardData.items.length; i++) {
        const item = e.clipboardData.items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) clipboardFiles.push(file);
        }
      }
    } else if (e.clipboardData?.files) {
      for (let i = 0; i < e.clipboardData.files.length; i++) {
        clipboardFiles.push(e.clipboardData.files[i]);
      }
    }

    if (clipboardFiles.length > 0) {
      e.preventDefault();
      addFiles(clipboardFiles);
    }
  };

  // Handle textarea text change & detecting @
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    e.target.style.height = 'auto';
    e.target.style.height = `${e.target.scrollHeight}px`;

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = content.trim() || (pendingFiles.length > 0 ? 'Đã đính kèm tệp' : '');
    if (!clean && pendingFiles.length === 0) return;

    const mentions = extractMentionedUserIds(clean);
    const filesToUpload = [...pendingFiles];

    try {
      setIsUploadingAttachments(true);
      const newComment = await createCommentAsync({ content: clean, mentions });

      if (newComment && newComment.id && filesToUpload.length > 0) {
        for (const file of filesToUpload) {
          try {
            await uploadAsset({
              workspaceId,
              entityType: 'TASK_COMMENT',
              entityId: newComment.id,
              file,
            });
          } catch (uploadErr) {
            console.error('Failed to upload comment attachment:', uploadErr);
          }
        }
      }

      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
      setPendingFiles([]);
      setShowMentionMenu(false);
    } catch (err) {
      console.error('Failed to create comment:', err);
    } finally {
      setIsUploadingAttachments(false);
    }
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
          <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold text-xs mx-0.5">
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
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-600">{comments?.length || 0}</span>
          </div>
        </div>

        <DottedSeparator />

        {/* Input box */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOverComment(true);
          }}
          onDragLeave={() => setIsDragOverComment(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOverComment(false);
            addFiles(e.dataTransfer.files);
          }}
          className={cn(
            'relative flex flex-col gap-2 rounded-lg transition-colors',
            isDragOverComment && 'bg-primary/5 p-1 rounded-lg border border-dashed border-primary',
          )}
        >
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={handleContentChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Viết bình luận... Gõ @ để nhắc tên, dán ảnh (Ctrl+V) hoặc đính kèm tệp"
            className="min-h-[85px] resize-none overflow-hidden bg-neutral-50/50 text-sm focus-visible:bg-white"
            disabled={isCreating || isUploadingAttachments}
          />

          {/* Pending files preview bar */}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 rounded-lg border border-neutral-200/80 bg-neutral-50/70 p-2">
              {pendingFiles.map((file, idx) => {
                const isImage = file.type.startsWith('image/');
                return (
                  <div
                    key={`${file.name}-${idx}`}
                    className="group relative flex items-center gap-2 rounded-md border border-neutral-200 bg-white px-2 py-1 text-xs shadow-2xs"
                  >
                    {isImage ? (
                      <img src={URL.createObjectURL(file)} alt={file.name} className="size-7 rounded object-cover" />
                    ) : (
                      <DocumentBadgeIcon extension={file.name.split('.').pop() || ''} className="scale-60 -mx-2" />
                    )}
                    <div className="flex flex-col min-w-0 max-w-[140px]">
                      <span className="truncate text-[11px] font-medium text-neutral-800" title={file.name}>
                        {file.name}
                      </span>
                      <span className="text-[9px] text-neutral-400">{formatFileSize(file.size)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePendingFile(idx)}
                      className="ml-1 rounded-full p-0.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 cursor-pointer"
                      title="Bỏ tệp"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Autocomplete mention popover */}
          {showMentionMenu && filteredMembers.length > 0 && (
            <div className="absolute z-50 left-2 bottom-12 w-64 max-h-48 overflow-y-auto rounded-lg border bg-white shadow-lg p-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground uppercase">Nhắc tên thành viên</div>
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
            <div className="flex items-center gap-2">
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  addFiles(e.target.files);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
              />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isCreating || isUploadingAttachments}
                className="h-7 gap-1 px-2 text-xs text-neutral-600 hover:text-neutral-900 border border-neutral-200/60 hover:bg-neutral-100"
              >
                <Paperclip className="size-3.5" />
                <span>Đính kèm tệp</span>
              </Button>

              <span className="text-neutral-300 text-xs hidden sm:inline">|</span>

              <p className="text-[11px] text-muted-foreground hidden sm:flex items-center gap-1">
                <AtSign className="size-3 text-muted-foreground" /> Gõ <kbd className="px-1 py-0.5 bg-neutral-100 rounded border">@</kbd> để
                mention
              </p>
            </div>

            <Button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isCreating || isUploadingAttachments || (!content.trim() && pendingFiles.length === 0)}
              size="sm"
              className="gap-x-1.5"
            >
              {isCreating || isUploadingAttachments ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>{isUploadingAttachments ? 'Đang tải tệp...' : 'Đang gửi...'}</span>
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  <span>Bình luận</span>
                </>
              )}
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
              const isAuthor = Boolean(
                currentUser?.id &&
                (String(currentUser.id) === String(comment.user?.id) || String(currentUser.id) === String(comment.userId)),
              );
              const isEditing = editingCommentId === comment.id;
              const authorName = comment.user?.name || comment.userName || 'User';
              const authorAvatar = comment.user?.avatarUrl || comment.user?.avatar_url || comment.userAvatarUrl;

              return (
                <div key={comment.id} className="flex gap-3 text-sm group">
                  <Avatar className="size-8 shrink-0">
                    <AvatarImage src={authorAvatar || undefined} />
                    <AvatarFallback className="text-xs bg-neutral-200 font-semibold">{authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold text-neutral-800 text-xs">{authorName}</span>
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
                            <Button variant="ghost" size="icon" className="size-6 opacity-0 group-hover:opacity-100 transition">
                              <MoreVertical className="size-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem onClick={() => handleStartEdit(comment)} className="cursor-pointer gap-2 text-xs">
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
                          onChange={(e) => {
                            setEditingContent(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          onFocus={(e) => {
                            e.target.style.height = 'auto';
                            e.target.style.height = `${e.target.scrollHeight}px`;
                          }}
                          className="text-xs min-h-[60px] resize-none overflow-hidden"
                          autoFocus
                        />
                        <div className="flex items-center gap-1 justify-end">
                          <Button type="button" variant="secondary" size="xs" onClick={() => setEditingCommentId(null)}>
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
                      <div className="flex flex-col gap-1">
                        <div className="rounded-lg bg-neutral-50 p-2.5 text-xs text-neutral-800 whitespace-pre-wrap break-all leading-relaxed border border-neutral-100">
                          {renderFormattedContent(comment.content)}
                        </div>

                        {/* Attached files and images for this comment */}
                        <CommentAttachments workspaceId={workspaceId} commentId={comment.id} canDelete={isAuthor} />
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
