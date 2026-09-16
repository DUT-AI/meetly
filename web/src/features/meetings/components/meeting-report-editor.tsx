'use client';

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
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  CheckSquare,
  Table as TableIcon,
  Quote,
  Code,
  Link as LinkIcon,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Undo,
  Redo,
} from 'lucide-react';
import { useEffect } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MeetingReportEditorProps {
  initialContent?: Record<string, any>;
  onContentChange?: (content: Record<string, any>) => void;
  readOnly?: boolean;
}

export const MeetingReportEditor = ({
  initialContent = {},
  onContentChange,
  readOnly = false,
}: MeetingReportEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
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
    ],
    content: initialContent && Object.keys(initialContent).length > 0 ? initialContent : '',
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      if (onContentChange) {
        onContentChange(json);
      }
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-slate max-w-none focus:outline-none text-slate-800 text-base leading-relaxed font-sans tiptap',
          readOnly ? 'min-h-[200px]' : 'min-h-[750px]'
        ),
      },
    },
  });

  useEffect(() => {
    if (editor && readOnly !== undefined) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

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
              editor.isActive('heading', { level: 1 }) && 'bg-white text-blue-600 shadow-2xs border border-slate-200'
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
              editor.isActive('heading', { level: 2 }) && 'bg-white text-blue-600 shadow-2xs border border-slate-200'
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
              editor.isActive('heading', { level: 3 }) && 'bg-white text-blue-600 shadow-2xs border border-slate-200'
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
              editor.isActive('bold') && 'bg-white text-blue-600 shadow-2xs border border-slate-200'
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
              editor.isActive('italic') && 'bg-white text-blue-600 shadow-2xs border border-slate-200'
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
              editor.isActive('underline') && 'bg-white text-blue-600 shadow-2xs border border-slate-200'
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
              editor.isActive('strike') && 'bg-white text-blue-600 shadow-2xs border border-slate-200'
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
              editor.isActive('highlight') && 'bg-amber-100 text-amber-700 shadow-2xs border border-amber-300'
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
              editor.isActive('subscript') && 'bg-white text-blue-600 shadow-2xs border border-slate-200'
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
              editor.isActive('superscript') && 'bg-white text-blue-600 shadow-2xs border border-slate-200'
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
              editor.isActive({ textAlign: 'left' }) && 'bg-white text-blue-600 shadow-2xs border border-slate-200'
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
              editor.isActive({ textAlign: 'center' }) && 'bg-white text-blue-600 shadow-2xs border border-slate-200'
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
              editor.isActive({ textAlign: 'right' }) && 'bg-white text-blue-600 shadow-2xs border border-slate-200'
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
              editor.isActive({ textAlign: 'justify' }) && 'bg-white text-blue-600 shadow-2xs border border-slate-200'
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
              editor.isActive('bulletList') && 'bg-white text-blue-600 shadow-2xs border border-slate-200'
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
              editor.isActive('orderedList') && 'bg-white text-blue-600 shadow-2xs border border-slate-200'
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
              editor.isActive('taskList') && 'bg-white text-blue-600 shadow-2xs border border-slate-200'
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
            onClick={() =>
              editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
            }
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
              editor.isActive('link') && 'bg-white text-blue-600 shadow-2xs border border-slate-200'
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
              editor.isActive('blockquote') && 'bg-white text-blue-600 shadow-2xs border border-slate-200'
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
              editor.isActive('codeBlock') && 'bg-white text-blue-600 shadow-2xs border border-slate-200'
            )}
            title="Khối mã (Code Block)"
          >
            <Code className="size-4" />
          </Button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
};
