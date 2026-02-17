import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, List, ListOrdered, Heading2, Heading3, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useEffect } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  const buttons = [
    { action: () => editor.chain().focus().toggleBold().run(), active: editor.isActive('bold'), icon: Bold, label: 'Negrito' },
    { action: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive('italic'), icon: Italic, label: 'Itálico' },
    { action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: editor.isActive('heading', { level: 2 }), icon: Heading2, label: 'Título H2' },
    { action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(), active: editor.isActive('heading', { level: 3 }), icon: Heading3, label: 'Título H3' },
    { action: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive('bulletList'), icon: List, label: 'Lista' },
    { action: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive('orderedList'), icon: ListOrdered, label: 'Lista Numerada' },
    { action: () => editor.chain().focus().setHorizontalRule().run(), active: false, icon: Minus, label: 'Separador' },
  ];

  return (
    <div className="flex flex-wrap gap-1 border-b border-border p-1">
      {buttons.map((btn, i) => (
        <Button
          key={i}
          type="button"
          variant="ghost"
          size="icon"
          className={cn('h-8 w-8', btn.active && 'bg-muted')}
          onClick={btn.action}
          title={btn.label}
        >
          <btn.icon className="h-4 w-4" />
        </Button>
      ))}
    </div>
  );
};

const RichTextEditor = ({ content, onChange }: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  return (
    <div className="rounded-md border border-input bg-background">
      <MenuBar editor={editor} />
      <EditorContent
        editor={editor}
        className="prose-editor min-h-[120px] px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 rounded-b-md"
      />
    </div>
  );
};

export default RichTextEditor;
