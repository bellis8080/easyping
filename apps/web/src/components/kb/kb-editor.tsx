'use client';

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import TurndownService from 'turndown';
import { marked } from 'marked';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from '@/components/ui/tooltip';

interface KBEditorProps {
  content: string;
  onChange: (markdown: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

// Initialize turndown service for HTML to Markdown conversion
const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-',
});

// Custom rule for code blocks
turndown.addRule('codeBlock', {
  filter: (node) => {
    return node.nodeName === 'PRE' && node.querySelector('code') !== null;
  },
  replacement: (_content, node) => {
    const codeNode = (node as Element).querySelector('code');
    const text = codeNode?.textContent || '';
    const language =
      codeNode?.getAttribute('class')?.replace('language-', '') || '';
    return `\n\`\`\`${language}\n${text}\n\`\`\`\n`;
  },
});

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  label: string;
  shortcut?: string;
}

function ToolbarButton({
  onClick,
  isActive = false,
  disabled = false,
  children,
  label,
  shortcut,
}: ToolbarButtonProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className={`h-8 w-8 p-0 ${
              isActive
                ? 'bg-slate-200 text-slate-900'
                : 'text-slate-600 hover:text-slate-900'
            } focus-visible:ring-2 focus-visible:ring-blue-500`}
            aria-label={label}
            aria-pressed={isActive}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <span>{label}</span>
          {shortcut && <span className="ml-2 text-slate-400">{shortcut}</span>}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function EditorToolbar({ editor }: { editor: Editor }) {
  const addLink = useCallback(() => {
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  return (
    <div
      className="flex flex-wrap gap-1 border-b bg-slate-50 p-2"
      role="toolbar"
      aria-label="Text formatting"
    >
      {/* Text formatting */}
      <div className="flex gap-0.5 border-r pr-2 mr-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          label="Bold"
          shortcut="Ctrl+B"
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          label="Italic"
          shortcut="Ctrl+I"
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Headings */}
      <div className="flex gap-0.5 border-r pr-2 mr-1">
        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          isActive={editor.isActive('heading', { level: 1 })}
          label="Heading 1"
        >
          <Heading1 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          isActive={editor.isActive('heading', { level: 2 })}
          label="Heading 2"
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          isActive={editor.isActive('heading', { level: 3 })}
          label="Heading 3"
        >
          <Heading3 className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Lists */}
      <div className="flex gap-0.5 border-r pr-2 mr-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          label="Bullet list"
        >
          <List className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          label="Numbered list"
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Code */}
      <div className="flex gap-0.5 border-r pr-2 mr-1">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          isActive={editor.isActive('codeBlock')}
          label="Code block"
        >
          <Code className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Links and Images */}
      <div className="flex gap-0.5 border-r pr-2 mr-1">
        <ToolbarButton
          onClick={addLink}
          isActive={editor.isActive('link')}
          label="Insert link"
          shortcut="Ctrl+K"
        >
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton onClick={addImage} label="Insert image">
          <ImageIcon className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Undo/Redo */}
      <div className="flex gap-0.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          label="Undo"
          shortcut="Ctrl+Z"
        >
          <Undo className="h-4 w-4" />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          label="Redo"
          shortcut="Ctrl+Y"
        >
          <Redo className="h-4 w-4" />
        </ToolbarButton>
      </div>
    </div>
  );
}

export function KBEditor({
  content,
  onChange,
  placeholder: _placeholder = 'Start writing...',
  className = '',
  readOnly = false,
}: KBEditorProps) {
  // Track if we've initialized content to avoid re-setting on every change
  const contentInitializedRef = useRef(false);
  // Track content we've output via onChange to distinguish user edits from external changes
  const lastOutputContentRef = useRef<string>('');

  // Convert markdown to HTML for initial content
  const initialContent = useMemo(() => {
    if (!content) return '';
    // If content looks like HTML, use as-is
    if (content.includes('<') && content.includes('>')) {
      return content;
    }
    // Convert markdown to HTML using marked
    try {
      return marked.parse(content, { async: false }) as string;
    } catch {
      return content;
    }
  }, [content]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'bg-slate-100 rounded-md p-4 font-mono text-sm',
          },
        },
        // Disable StarterKit's built-in link to use our custom Link config with styling
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:underline cursor-pointer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full rounded-lg',
        },
      }),
    ],
    content: initialContent,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class:
          'prose prose-slate max-w-none min-h-[300px] p-4 focus:outline-none',
        'aria-label': 'Article content editor',
      },
    },
    onUpdate: ({ editor: updatedEditor }) => {
      // Convert HTML to markdown on every update
      const html = updatedEditor.getHTML();
      const markdown = turndown.turndown(html);
      // Track what we're outputting so useEffect knows this came from user input
      lastOutputContentRef.current = markdown;
      onChange(markdown);
    },
  });

  // Handle keyboard shortcut for link (Ctrl+K)
  useEffect(() => {
    if (!editor) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        const url = window.prompt('Enter URL:');
        if (url) {
          editor.chain().focus().setLink({ href: url }).run();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editor]);

  // Update editor content when prop changes (for loading existing articles)
  // Only runs for truly external content changes, not user edits
  useEffect(() => {
    if (!editor || content === undefined) return;

    // Skip if this content came from user input (we just sent it via onChange)
    if (lastOutputContentRef.current === content) return;

    // Skip empty content after initialization (prevents clearing on user edits)
    if (contentInitializedRef.current && content === '') return;

    // Convert and set content
    let htmlContent: string;
    if (content.includes('<') && content.includes('>')) {
      htmlContent = content;
    } else if (content.trim()) {
      // Convert markdown to HTML using marked
      try {
        htmlContent = marked.parse(content, { async: false }) as string;
      } catch {
        htmlContent = content;
      }
    } else {
      htmlContent = '';
    }

    editor.commands.setContent(htmlContent);
    lastOutputContentRef.current = content;
    contentInitializedRef.current = true;
  }, [editor, content]);

  // Calculate character count
  const characterCount =
    editor?.storage.characterCount?.characters?.() ??
    editor?.getText()?.length ??
    0;

  if (!editor) {
    return (
      <div className={`border rounded-lg ${className}`}>
        <div className="h-10 bg-slate-50 border-b animate-pulse" />
        <div className="min-h-[300px] p-4 bg-white">
          <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg overflow-hidden bg-white ${className}`}>
      {!readOnly && <EditorToolbar editor={editor} />}

      <EditorContent
        editor={editor}
        className="[&_.ProseMirror]:min-h-[300px] [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-slate-400 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none"
      />

      {/* Footer with character count */}
      <div className="border-t bg-slate-50 px-4 py-2 text-xs text-slate-500 flex justify-between items-center">
        <div aria-live="polite" aria-atomic="true">
          {characterCount.toLocaleString()} characters
        </div>
        {!readOnly && (
          <div className="text-slate-400">
            Use Ctrl+B for bold, Ctrl+I for italic, Ctrl+K for link
          </div>
        )}
      </div>
    </div>
  );
}

export default KBEditor;
