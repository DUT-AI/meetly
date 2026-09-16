'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect } from 'react';
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
    extensions: [StarterKit],
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
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[200px] p-4 bg-white border rounded-md',
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

  return (
    <div className={cn('flex flex-col gap-2', readOnly && 'opacity-80')}>
      {!readOnly && (
        <div className="flex flex-wrap gap-2 mb-2 p-2 bg-neutral-100 rounded-md">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn('px-2 py-1 bg-white border rounded-sm text-sm', editor.isActive('bold') && 'bg-neutral-200')}
          >
            Đậm
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={cn('px-2 py-1 bg-white border rounded-sm text-sm', editor.isActive('italic') && 'bg-neutral-200')}
          >
            Nghiêng
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={cn('px-2 py-1 bg-white border rounded-sm text-sm', editor.isActive('heading', { level: 2 }) && 'bg-neutral-200')}
          >
            H2
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={cn('px-2 py-1 bg-white border rounded-sm text-sm', editor.isActive('bulletList') && 'bg-neutral-200')}
          >
            Bullet List
          </button>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
};
