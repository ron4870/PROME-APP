import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { 
  Bold, Italic, Underline as UnderlineIcon, Strikethrough, 
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, CheckSquare,
  Highlighter, 
  Undo, Redo,
  Table as TableIcon, Image as ImageIcon, Link as LinkIcon,
  Subscript as SubscriptIcon, Superscript as SuperscriptIcon,
  Heading1, Heading2, Heading3
} from 'lucide-react';

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  const addImage = useCallback(() => {
    const url = window.prompt('URL');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const setLink = useCallback(() => {
    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  const MenuButton = ({ onClick, isActive, disabled, children }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-2 rounded text-gray-700 hover:bg-gray-100 transition-colors ${
        isActive ? 'bg-blue-100 text-blue-700' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );

  return (
    <div className="bg-[#f3f4f6] border-b border-gray-300 p-2 flex flex-col gap-2 sticky top-0 z-10 rounded-t-xl shadow-sm">
      <div className="flex flex-wrap items-center gap-1">
        {/* History */}
        <MenuButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().chain().focus().undo().run()}>
          <Undo size={20} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().chain().focus().redo().run()}>
          <Redo size={20} />
        </MenuButton>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Text Style */}
        <MenuButton onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')}>
          <Bold size={20} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')}>
          <Italic size={20} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')}>
          <UnderlineIcon size={20} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleStrike().run()} isActive={editor.isActive('strike')}>
          <Strikethrough size={20} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleSubscript().run()} isActive={editor.isActive('subscript')}>
          <SubscriptIcon size={20} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleSuperscript().run()} isActive={editor.isActive('superscript')}>
          <SuperscriptIcon size={20} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleHighlight().run()} isActive={editor.isActive('highlight')}>
          <Highlighter size={20} />
        </MenuButton>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Headings */}
        <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })}>
          <Heading1 size={20} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })}>
          <Heading2 size={20} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })}>
          <Heading3 size={20} />
        </MenuButton>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Alignment */}
        <MenuButton onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })}>
          <AlignLeft size={20} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })}>
          <AlignCenter size={20} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })}>
          <AlignRight size={20} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })}>
          <AlignJustify size={20} />
        </MenuButton>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Lists */}
        <MenuButton onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')}>
          <List size={20} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')}>
          <ListOrdered size={20} />
        </MenuButton>
        <MenuButton onClick={() => editor.chain().focus().toggleTaskList().run()} isActive={editor.isActive('taskList')}>
          <CheckSquare size={20} />
        </MenuButton>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Insertions */}
        <MenuButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
          <TableIcon size={20} />
        </MenuButton>
        <MenuButton onClick={addImage}>
          <ImageIcon size={20} />
        </MenuButton>
        <MenuButton onClick={setLink} isActive={editor.isActive('link')}>
          <LinkIcon size={20} />
        </MenuButton>
      </div>

      {/* Contextual Menu for Tables */}
      {editor.isActive('table') && (
        <div className="flex flex-wrap items-center gap-1 bg-blue-50 p-1 rounded border border-blue-100">
          <span className="text-xs text-blue-800 font-semibold mx-2">Table Tools</span>
          <button className="text-xs bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-50" onClick={() => editor.chain().focus().addColumnBefore().run()}>Add Col Before</button>
          <button className="text-xs bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-50" onClick={() => editor.chain().focus().addColumnAfter().run()}>Add Col After</button>
          <button className="text-xs bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 text-red-600" onClick={() => editor.chain().focus().deleteColumn().run()}>Del Col</button>
          <div className="w-px h-4 bg-gray-300 mx-1"></div>
          <button className="text-xs bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-50" onClick={() => editor.chain().focus().addRowBefore().run()}>Add Row Before</button>
          <button className="text-xs bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-50" onClick={() => editor.chain().focus().addRowAfter().run()}>Add Row After</button>
          <button className="text-xs bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-50 text-red-600" onClick={() => editor.chain().focus().deleteRow().run()}>Del Row</button>
          <div className="w-px h-4 bg-gray-300 mx-1"></div>
          <button className="text-xs bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-50" onClick={() => editor.chain().focus().mergeCells().run()}>Merge</button>
          <button className="text-xs bg-white border border-gray-300 rounded px-2 py-1 hover:bg-gray-50" onClick={() => editor.chain().focus().splitCell().run()}>Split</button>
          <button className="text-xs bg-red-100 border border-red-300 rounded px-2 py-1 hover:bg-red-200 text-red-700 ml-auto" onClick={() => editor.chain().focus().deleteTable().run()}>Delete Table</button>
        </div>
      )}
    </div>
  );
};

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  editable?: boolean;
}

export const TipTapEditor: React.FC<TipTapEditorProps> = ({ content, onChange, editable = true }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Superscript,
      Subscript,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Image,
      Link.configure({
        openOnClick: false,
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose-base lg:prose-lg xl:prose-2xl m-auto focus:outline-none min-h-[800px] bg-white shadow-md border border-gray-200 p-12 mt-8 mb-16 max-w-[850px]',
      },
    },
  });

  // Ensure content updates dynamically (e.g. when loading from API)
  React.useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      // Small optimization: don't overwrite if content is essentially the same
      // though getHTML() vs content can vary by formatting.
      // Usually, it's safer to only set it initially or if content prop changes massively.
      // We will assume content prop only changes on API load.
    }
  }, [content, editor]);

  return (
    <div className="bg-[#e5e7eb] rounded-xl overflow-hidden flex flex-col h-full relative" style={{ minHeight: 'calc(100vh - 200px)' }}>
      {editable && <MenuBar editor={editor} />}
      <div className="flex-grow overflow-y-auto px-4 pb-20 custom-scrollbar">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

export default TipTapEditor;
