'use client';

import { Extension } from '@tiptap/core';
import { Collaboration } from '@tiptap/extension-collaboration';
import { yCursorPlugin } from '@tiptap/y-tiptap';
import { Highlight } from '@tiptap/extension-highlight';
import { Link } from '@tiptap/extension-link';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { Table } from '@tiptap/extension-table';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableRow } from '@tiptap/extension-table-row';
import { TaskItem } from '@tiptap/extension-task-item';
import { TaskList } from '@tiptap/extension-task-list';
import { TextAlign } from '@tiptap/extension-text-align';
import { Underline } from '@tiptap/extension-underline';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CheckSquare,
  Code,
  Expand,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Maximize2,
  Minimize2,
  Quote,
  Redo,
  Shrink,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const CollaborationCursor = Extension.create<{
  provider: any;
  user: { name?: string; color?: string };
  render?: (user: any) => HTMLElement;
}>({
  name: 'collaborationCursor',
  addOptions() {
    return {
      provider: null,
      user: {
        name: 'Thành viên',
        color: '#2563eb',
      },
      render: (user: any) => {
        const cursor = document.createElement('span');
        cursor.classList.add('collaboration-cursor__caret');
        cursor.setAttribute('style', `border-color: ${user.color || '#2563eb'}`);
        const label = document.createElement('div');
        label.classList.add('collaboration-cursor__label');
        label.setAttribute('style', `background-color: ${user.color || '#2563eb'}`);
        label.insertBefore(document.createTextNode(user.name || 'Thành viên'), null);
        cursor.insertBefore(label, null);
        return cursor;
      },
    };
  },
  addProseMirrorPlugins() {
    if (!this.options.provider?.awareness) {
      return [];
    }
    return [
      yCursorPlugin(this.options.provider.awareness, {
        cursorBuilder: this.options.render,
      }),
    ];
  },
});

function getCollabWsUrl(): string {
  if (process.env.NEXT_PUBLIC_COLLAB_WS_URL) {
    return process.env.NEXT_PUBLIC_COLLAB_WS_URL;
  }
  if (typeof window !== 'undefined') {
    const isHttps = window.location.protocol === 'https:';
    const host = window.location.hostname;
    if (host.includes('dutai.io.vn')) {
      return `${isHttps ? 'wss:' : 'ws:'}//${window.location.host}/collab`;
    }
    return `${isHttps ? 'wss:' : 'ws:'}//${host}:1234`;
  }
  return 'ws://localhost:1234';
}

const COLLAB_COLORS = ['#2563eb', '#7c3aed', '#db2777', '#ea580c', '#059669', '#0891b2', '#d97706', '#4f46e5'];

function getCollabColor(name: string = 'User'): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return COLLAB_COLORS[Math.abs(hash) % COLLAB_COLORS.length];
}

export function formatContentForTipTap(content: any): any {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (typeof content === 'object' && Object.keys(content).length === 0) return '';
  // If it's already a TipTap document with type === 'doc'
  if (content.type === 'doc') {
    if (!content.content || content.content.length === 0) return '';
    return content;
  }

  // If it's a structured meeting report object from backend (offline ASR + Qwen task extraction)
  if (typeof content === 'object') {
    if (content.html && typeof content.html === 'string') return content.html;

    const parts: string[] = [];

    if (content.summary) {
      parts.push(`<h2>1. Tóm tắt nội dung cuộc họp</h2><p>${content.summary}</p>`);
    }

    if (content.speakers && Array.isArray(content.speakers) && content.speakers.length > 0) {
      parts.push(
        `<h2>2. Thành viên phát biểu</h2><ul>${content.speakers.map((s: string) => `<li><strong>${s}</strong></li>`).join('')}</ul>`,
      );
    }

    if (content.action_items && Array.isArray(content.action_items) && content.action_items.length > 0) {
      parts.push(`<h2>3. Danh sách nhiệm vụ & Kết luận (Action Items)</h2><ul data-type="taskList">`);
      for (const item of content.action_items) {
        const title = item.task_title || item.title || 'Nhiệm vụ';
        const assignee = item.assignee || 'Chưa phân công';
        const deadline = item.deadline ? ` (Hạn: ${item.deadline})` : '';
        parts.push(
          `<li data-type="taskItem" data-checked="false"><p><strong>${title}</strong> — Người thực hiện: <em>${assignee}</em>${deadline}</p></li>`,
        );
      }
      parts.push(`</ul>`);
    }

    if (content.aligned_transcript || content.transcript) {
      const transcriptText = content.aligned_transcript || content.transcript;
      const lines = typeof transcriptText === 'string' ? transcriptText.split('\n') : [];
      if (lines.length > 0) {
        parts.push(`<h2>4. Trích lục hội thoại cuộc họp</h2>`);
        for (const line of lines) {
          if (line.trim()) {
            parts.push(`<p>${line}</p>`);
          }
        }
      }
    }

    if (parts.length > 0) {
      return parts.join('');
    }
    return '';
  }

  return '';
}

export interface MeetingReportEditorProps {
  initialContent?: Record<string, any> | string;
  onContentChange?: (content: Record<string, any>) => void;
  onEditorReady?: (editor: any) => void;
  readOnly?: boolean;
  meetingId?: string;
  currentUser?: { name: string; color?: string; avatar?: string };
  collabEnabled?: boolean;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
  isWideWidth?: boolean;
  onToggleWideWidth?: () => void;
}

function normalizeReportContent(content: any): any {
  if (!content || typeof content !== 'object' || Object.keys(content).length === 0) {
    return '';
  }
  if (content.type === 'doc' && Array.isArray(content.content)) {
    return content;
  }
  if (typeof content === 'string') {
    return content;
  }
  if (content.summary || content.action_items) {
    const summary = content.summary || '';
    const actionItems = Array.isArray(content.action_items) ? content.action_items : [];
    return {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '📋 Tóm tắt cuộc họp' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: summary }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: `✅ Nhiệm vụ & Action Items (${actionItems.length})` }],
        },
        {
          type: 'taskList',
          content:
            actionItems.length > 0
              ? actionItems.map((item: any) => ({
                  type: 'taskItem',
                  attrs: { checked: false },
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        { type: 'text', marks: [{ type: 'bold' }], text: `${item.task_title || 'Nhiệm vụ'}: ` },
                        { type: 'text', text: `Giao cho ${item.assignee || 'Chưa rõ'} (Hạn: ${item.deadline || 'Chưa rõ'})` },
                      ],
                    },
                  ],
                }))
              : [
                  {
                    type: 'taskItem',
                    attrs: { checked: false },
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Chưa có Action Item nào.' }],
                      },
                    ],
                  },
                ],
        },
      ],
    };
  }
  return '';
}

export const MeetingReportEditor = ({
  initialContent = {},
  onContentChange,
  onEditorReady,
  readOnly = false,
  meetingId,
  currentUser,
  collabEnabled = true,
  isFullScreen = false,
  onToggleFullScreen,
  isWideWidth = false,
  onToggleWideWidth,
}: MeetingReportEditorProps) => {
  const onContentChangeRef = useRef(onContentChange);
  onContentChangeRef.current = onContentChange;

  const onEditorReadyRef = useRef(onEditorReady);
  onEditorReadyRef.current = onEditorReady;

  const [activeUsers, setActiveUsers] = useState<Array<{ name: string; color: string }>>([]);
  const [isConnected, setIsConnected] = useState(false);
  const shouldCollab = Boolean(collabEnabled && meetingId && typeof window !== 'undefined');

  const { ydoc, provider } = useMemo(() => {
    if (!shouldCollab) {
      return { ydoc: null, provider: null };
    }
    const doc = new Y.Doc();
    const wsUrl = getCollabWsUrl();
    const roomName = `meeting-report-${meetingId}`;
    const wsProvider = new WebsocketProvider(wsUrl, roomName, doc, { connect: true });

    const userColor = currentUser?.color || getCollabColor(currentUser?.name || 'User');
    wsProvider.awareness.setLocalStateField('user', {
      name: currentUser?.name || 'Thành viên',
      color: userColor,
    });

    return { ydoc: doc, provider: wsProvider };
  }, [shouldCollab, meetingId, currentUser?.name, currentUser?.color]);

  useEffect(() => {
    if (!provider) return;

    const onStatus = (event: { status: 'connected' | 'connecting' | 'disconnected' }) => {
      setIsConnected(event.status === 'connected');
    };

    const onAwarenessChange = () => {
      const states = Array.from(provider.awareness.getStates().values());
      const users = states
        .map((s: any) => s.user)
        .filter((u): u is { name: string; color: string } => Boolean(u && u.name));
      setActiveUsers(users);
    };

    provider.on('status', onStatus);
    provider.awareness.on('change', onAwarenessChange);

    return () => {
      provider.off('status', onStatus);
      provider.awareness.off('change', onAwarenessChange);
      provider.destroy();
      if (ydoc) {
        ydoc.destroy();
      }
    };
  }, [provider, ydoc]);

  const userColor = useMemo(
    () => currentUser?.color || getCollabColor(currentUser?.name || 'User'),
    [currentUser?.color, currentUser?.name]
  );

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          link: false,
          underline: false,
          undoRedo: shouldCollab && ydoc ? false : {},
        }),
        Underline,
        Subscript,
        Superscript,
        Highlight.configure({ multicolor: true }),
        Placeholder.configure({
          placeholder: 'Nhập nội dung biên bản cuộc họp, ghi chú công việc hoặc kết luận tại đây...',
        }),
        TaskList,
        TaskItem.configure({ nested: true }),
        Table.configure({ resizable: true }),
        TableRow,
        TableHeader,
        TableCell,
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Link.configure({ openOnClick: false }),
        ...(shouldCollab && ydoc && provider
          ? [
              Collaboration.configure({
                document: ydoc,
              }),
              CollaborationCursor.configure({
                provider: provider,
                user: {
                  name: currentUser?.name || 'Thành viên',
                  color: userColor,
                },
              }),
            ]
          : []),
      ],
      content: shouldCollab && ydoc ? undefined : formatContentForTipTap(initialContent) || normalizeReportContent(initialContent) || '',
      editable: !readOnly,
      onUpdate: ({ editor }: { editor: any }) => {
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          const json = editor.getJSON();
          onContentChangeRef.current?.(json);
        }, 1500);
      },
      editorProps: {
        attributes: {
          class: cn(
            'prose prose-slate max-w-none focus:outline-none text-slate-800 text-base leading-relaxed font-sans tiptap',
            readOnly ? 'min-h-[200px]' : 'min-h-[750px]',
          ),
        },
      },
    },
    [shouldCollab, ydoc, provider, userColor]
  );

  // Sync initial content once when collaborative room is first initialized and empty
  useEffect(() => {
    if (!shouldCollab || !provider || !editor) return;

    const onSynced = (isSynced: boolean) => {
      if (isSynced && editor.isEmpty && initialContent) {
        const formatted = formatContentForTipTap(initialContent) || normalizeReportContent(initialContent);
        if (formatted) {
          editor.commands.setContent(formatted);
        }
      }
    };

    provider.on('sync', onSynced);
    return () => {
      provider.off('sync', onSynced);
    };
  }, [shouldCollab, provider, editor, initialContent]);

  useEffect(() => {
    if (!shouldCollab && editor && initialContent) {
      const normalized = normalizeReportContent(initialContent);
      if (normalized && (!editor.getText() || editor.getText().trim() === '')) {
        editor.commands.setContent(normalized);
      }
    }
  }, [editor, initialContent, shouldCollab]);

  useEffect(() => {
    if (editor && readOnly !== undefined) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  useEffect(() => {
    if (editor) {
      onEditorReadyRef.current?.(editor);
    }
  }, [editor]);

  const hasLoadedContentRef = useRef(false);

  // Sync content when initialContent updates externally (e.g. after AI transcription finishes)
  useEffect(() => {
    if (editor && initialContent && !hasLoadedContentRef.current) {
      const formatted = formatContentForTipTap(initialContent);
      if (formatted && (typeof formatted === 'string' ? formatted.trim() !== '' : Boolean(formatted.type))) {
        const currentJson = editor.getJSON();
        const isEmpty =
          !currentJson.content || currentJson.content.length === 0 || (currentJson.content.length === 1 && !currentJson.content[0].content);
        if (isEmpty) {
          hasLoadedContentRef.current = true;
          try {
            editor.commands.setContent(formatted);
          } catch (e) {
            console.warn('Failed to set initial TipTap content', e);
          }
        }
      }
    }
  }, [editor, initialContent]);

  if (!editor) {
    return null;
  }

  const setLink = () => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('Nhập đường dẫn URL:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  return (
    <div className={cn('flex flex-col gap-3', readOnly && 'opacity-90')}>
      {!readOnly && (
        <div className="sticky top-[53px] z-20 flex flex-wrap items-center gap-1 p-1.5 bg-slate-100/95 backdrop-blur-md border border-slate-200/90 rounded-2xl shadow-xs mb-6 print:hidden no-print">
          {/* Undo / Redo */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="h-8 px-2 rounded-xl text-slate-600 hover:bg-white hover:text-blue-600 disabled:opacity-30"
            title="Hoàn tác (Undo)"
          >
            <Undo className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="h-8 px-2 rounded-xl text-slate-600 hover:bg-white hover:text-blue-600 disabled:opacity-30"
            title="Làm lại (Redo)"
          >
            <Redo className="size-4" />
          </Button>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          {/* Headings */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={cn(
              'h-8 px-2 rounded-xl font-semibold text-slate-700 hover:bg-white hover:text-blue-600',
              editor.isActive('heading', { level: 1 }) && 'bg-white text-blue-600 shadow-2xs border border-slate-200',
            )}
            title="Tiêu đề 1"
          >
            <Heading1 className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn(
              'h-8 px-2 rounded-xl font-semibold text-slate-700 hover:bg-white hover:text-blue-600',
              editor.isActive('heading', { level: 2 }) && 'bg-white text-blue-600 shadow-2xs border border-slate-200',
            )}
            title="Tiêu đề 2"
          >
            <Heading2 className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={cn(
              'h-8 px-2 rounded-xl font-semibold text-slate-700 hover:bg-white hover:text-blue-600',
              editor.isActive('heading', { level: 3 }) && 'bg-white text-blue-600 shadow-2xs border border-slate-200',
            )}
            title="Tiêu đề 3"
          >
            <Heading3 className="size-4" />
          </Button>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          {/* Text Formatting */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(
              'h-8 px-2 rounded-xl font-semibold text-slate-700 hover:bg-white hover:text-blue-600',
              editor.isActive('bold') && 'bg-white text-blue-600 shadow-2xs border border-slate-200',
            )}
            title="In đậm (Ctrl+B)"
          >
            <Bold className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn(
              'h-8 px-2 rounded-xl font-semibold text-slate-700 hover:bg-white hover:text-blue-600',
              editor.isActive('italic') && 'bg-white text-blue-600 shadow-2xs border border-slate-200',
            )}
            title="In nghiêng (Ctrl+I)"
          >
            <Italic className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={cn(
              'h-8 px-2 rounded-xl font-semibold text-slate-700 hover:bg-white hover:text-blue-600',
              editor.isActive('underline') && 'bg-white text-blue-600 shadow-2xs border border-slate-200',
            )}
            title="Gạch chân (Ctrl+U)"
          >
            <UnderlineIcon className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={cn(
              'h-8 px-2 rounded-xl font-semibold text-slate-700 hover:bg-white hover:text-blue-600',
              editor.isActive('strike') && 'bg-white text-blue-600 shadow-2xs border border-slate-200',
            )}
            title="Gạch ngang"
          >
            <Strikethrough className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
            className={cn(
              'h-8 px-2 rounded-xl font-semibold text-slate-700 hover:bg-white hover:text-amber-600',
              editor.isActive('highlight') && 'bg-amber-100 text-amber-700 shadow-2xs border border-amber-300',
            )}
            title="Tô màu Highlight"
          >
            <Highlighter className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            className={cn(
              'h-8 px-2 rounded-xl font-semibold text-slate-700 hover:bg-white hover:text-blue-600',
              editor.isActive('subscript') && 'bg-white text-blue-600 shadow-2xs border border-slate-200',
            )}
            title="Chỉ số dưới (Subscript)"
          >
            <SubscriptIcon className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            className={cn(
              'h-8 px-2 rounded-xl font-semibold text-slate-700 hover:bg-white hover:text-blue-600',
              editor.isActive('superscript') && 'bg-white text-blue-600 shadow-2xs border border-slate-200',
            )}
            title="Chỉ số trên (Superscript)"
          >
            <SuperscriptIcon className="size-4" />
          </Button>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          {/* Text Alignment */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={cn(
              'h-8 px-2 rounded-xl text-slate-700 hover:bg-white hover:text-blue-600',
              editor.isActive({ textAlign: 'left' }) && 'bg-white text-blue-600 shadow-2xs border border-slate-200',
            )}
            title="Căn trái"
          >
            <AlignLeft className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={cn(
              'h-8 px-2 rounded-xl text-slate-700 hover:bg-white hover:text-blue-600',
              editor.isActive({ textAlign: 'center' }) && 'bg-white text-blue-600 shadow-2xs border border-slate-200',
            )}
            title="Căn giữa"
          >
            <AlignCenter className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={cn(
              'h-8 px-2 rounded-xl text-slate-700 hover:bg-white hover:text-blue-600',
              editor.isActive({ textAlign: 'right' }) && 'bg-white text-blue-600 shadow-2xs border border-slate-200',
            )}
            title="Căn phải"
          >
            <AlignRight className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={cn(
              'h-8 px-2 rounded-xl text-slate-700 hover:bg-white hover:text-blue-600',
              editor.isActive({ textAlign: 'justify' }) && 'bg-white text-blue-600 shadow-2xs border border-slate-200',
            )}
            title="Căn đều"
          >
            <AlignJustify className="size-4" />
          </Button>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          {/* Lists & Task List */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn(
              'h-8 px-2 rounded-xl text-slate-700 hover:bg-white hover:text-blue-600',
              editor.isActive('bulletList') && 'bg-white text-blue-600 shadow-2xs border border-slate-200',
            )}
            title="Danh sách gạch đầu dòng"
          >
            <List className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={cn(
              'h-8 px-2 rounded-xl text-slate-700 hover:bg-white hover:text-blue-600',
              editor.isActive('orderedList') && 'bg-white text-blue-600 shadow-2xs border border-slate-200',
            )}
            title="Danh sách đánh số"
          >
            <ListOrdered className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            className={cn(
              'h-8 px-2 rounded-xl text-slate-700 hover:bg-white hover:text-blue-600',
              editor.isActive('taskList') && 'bg-white text-blue-600 shadow-2xs border border-slate-200',
            )}
            title="Danh sách công việc (Checklist)"
          >
            <CheckSquare className="size-4 text-emerald-600" />
          </Button>

          <div className="h-4 w-px bg-slate-300 mx-1" />

          {/* Table & Insert Features */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            className="h-8 px-2 rounded-xl text-slate-700 hover:bg-white hover:text-blue-600"
            title="Chèn bảng (3x3)"
          >
            <TableIcon className="size-4 text-indigo-600" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={setLink}
            className={cn(
              'h-8 px-2 rounded-xl text-slate-700 hover:bg-white hover:text-blue-600',
              editor.isActive('link') && 'bg-white text-blue-600 shadow-2xs border border-slate-200',
            )}
            title="Chèn liên kết URL"
          >
            <LinkIcon className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={cn(
              'h-8 px-2 rounded-xl text-slate-700 hover:bg-white hover:text-blue-600',
              editor.isActive('blockquote') && 'bg-white text-blue-600 shadow-2xs border border-slate-200',
            )}
            title="Trích dẫn"
          >
            <Quote className="size-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={cn(
              'h-8 px-2 rounded-xl text-slate-700 hover:bg-white hover:text-blue-600',
              editor.isActive('codeBlock') && 'bg-white text-blue-600 shadow-2xs border border-slate-200',
            )}
            title="Khối mã (Code Block)"
          >
            <Code className="size-4" />
          </Button>

          <div className="flex items-center gap-1 ml-auto">
            {shouldCollab && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-300">
                <span
                  className={cn('size-2 rounded-full', isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400')}
                  title={isConnected ? 'Đã kết nối cộng tác thời gian thực' : 'Đang kết nối máy chủ cộng tác...'}
                />
                <span className="text-[11px] font-semibold text-slate-500 hidden md:inline">
                  {isConnected ? `${activeUsers.length} người đang xem/sửa` : 'Đang kết nối...'}
                </span>
                <div className="flex -space-x-1.5 overflow-hidden">
                  {activeUsers.slice(0, 4).map((u, i) => (
                    <div
                      key={i}
                      className="size-5.5 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-1.5 ring-white shadow-2xs"
                      style={{ backgroundColor: u.color }}
                      title={u.name}
                    >
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Layout controls: Width & Fullscreen toggle */}
            {(onToggleWideWidth || onToggleFullScreen) && (
              <div className="flex items-center gap-1 pl-2 border-l border-slate-300">
                {onToggleWideWidth && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onToggleWideWidth}
                    className={cn(
                      'h-8 px-2 rounded-xl text-slate-700 hover:bg-white hover:text-blue-600',
                      isWideWidth && 'bg-white text-blue-600 shadow-2xs border border-slate-200'
                    )}
                    title={isWideWidth ? 'Chuyển về khổ A4 tiêu chuẩn (900px)' : 'Mở rộng chiều ngang biên bản (1200px)'}
                  >
                    {isWideWidth ? <Shrink className="size-4" /> : <Expand className="size-4" />}
                    <span className="hidden xl:inline text-xs font-semibold ml-1">
                      {isWideWidth ? 'Khổ A4' : 'Mở rộng'}
                    </span>
                  </Button>
                )}

                {onToggleFullScreen && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onToggleFullScreen}
                    className={cn(
                      'h-8 px-2 rounded-xl text-slate-700 hover:bg-white hover:text-blue-600',
                      isFullScreen && 'bg-white text-blue-600 shadow-2xs border border-slate-200'
                    )}
                    title={isFullScreen ? 'Thoát toàn màn hình (Esc)' : 'Toàn màn hình'}
                  >
                    {isFullScreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                    <span className="hidden xl:inline text-xs font-semibold ml-1">
                      {isFullScreen ? 'Thu nhỏ' : 'Toàn màn hình'}
                    </span>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
};
