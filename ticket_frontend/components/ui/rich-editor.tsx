"use client";

import { forwardRef, useImperativeHandle, useRef, useState } from "react";
import type { ClipboardEvent, ReactNode } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import { toast } from "react-toastify";

import { api, getApiErrorMessage, getMediaUrl } from "@/lib/api";

export type RichEditorHandle = {
  insertContent: (html: string) => void;
  clear: () => void;
  getHTML: () => string;
  isEmpty: () => boolean;
};

type Props = {
  content?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minHeight?: string;
};

function BoldIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 4h8a4 4 0 0 1 0 8H6V4zm0 8h9a4 4 0 0 1 0 8H6v-8z" />
    </svg>
  );
}

function ItalicIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <line x1="19" y1="4" x2="10" y2="4" /><line x1="14" y1="20" x2="5" y2="20" /><line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  );
}

function UnderlineIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M6 3v7a6 6 0 0 0 12 0V3" /><line x1="4" y1="21" x2="20" y2="21" />
    </svg>
  );
}

function H2Icon() {
  return <span className="text-[11px] font-bold leading-none">H2</span>;
}

function H3Icon() {
  return <span className="text-[11px] font-bold leading-none">H3</span>;
}

function BulletIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function OrderedIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <line x1="10" y1="6" x2="21" y2="6" /><line x1="10" y1="12" x2="21" y2="12" /><line x1="10" y1="18" x2="21" y2="18" />
      <text x="2" y="8" fontSize="7" fontWeight="bold" fill="currentColor" stroke="none">1</text>
      <text x="2" y="14" fontSize="7" fontWeight="bold" fill="currentColor" stroke="none">2</text>
      <text x="2" y="20" fontSize="7" fontWeight="bold" fill="currentColor" stroke="none">3</text>
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
    </svg>
  );
}

function CodeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

function ToolbarBtn({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-slate-200 ${
        active ? "bg-[var(--brand-soft)] text-[var(--brand)]" : "text-[var(--muted)]"
      }`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="mx-0.5 h-4 w-px bg-[var(--line)]" />;
}

export const RichEditor = forwardRef<RichEditorHandle, Props>(function RichEditor(
  { content = "", onChange, placeholder = "Write something…", disabled = false, minHeight = "8rem" },
  ref
) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Placeholder.configure({ placeholder }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content,
    editable: !disabled,
    onUpdate({ editor }) {
      onChange?.(editor.getHTML());
    },
    immediatelyRender: false,
  });

  useImperativeHandle(ref, () => ({
    insertContent: (html: string) => {
      editor?.chain().focus().setContent(html).run();
    },
    clear: () => {
      editor?.chain().focus().setContent("").run();
    },
    getHTML: () => editor?.getHTML() ?? "",
    isEmpty: () => editor?.isEmpty ?? true,
  }));

  async function uploadAndInsert(file: File) {
    const ALLOWED = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
    if (!ALLOWED.has(file.type)) {
      toast.error("Only image files are allowed (jpeg, png, gif, webp).");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post<{ url: string }>("/attachments/upload", form);
      editor?.chain().focus().setImage({ src: getMediaUrl(data.url) }).run();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to upload image."));
    } finally {
      setUploading(false);
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLDivElement>) {
    const imageItem = Array.from(e.clipboardData.items).find((item) =>
      item.type.startsWith("image/")
    );
    if (!imageItem) return;
    e.preventDefault();
    const file = imageItem.getAsFile();
    if (file) void uploadAndInsert(file);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--line)] bg-white transition-colors focus-within:border-[var(--brand)] focus-within:ring-2 focus-within:ring-[var(--brand-soft)]">
      {!disabled && editor && (
        <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--line)] bg-slate-50 px-2 py-1.5">
          <ToolbarBtn active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
            <H2Icon />
          </ToolbarBtn>
          <ToolbarBtn active={editor.isActive("heading", { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
            <H3Icon />
          </ToolbarBtn>
          <Divider />
          <ToolbarBtn active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
            <BoldIcon />
          </ToolbarBtn>
          <ToolbarBtn active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
            <ItalicIcon />
          </ToolbarBtn>
          <ToolbarBtn active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} title="Underline">
            <UnderlineIcon />
          </ToolbarBtn>
          <Divider />
          <ToolbarBtn active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet list">
            <BulletIcon />
          </ToolbarBtn>
          <ToolbarBtn active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered list">
            <OrderedIcon />
          </ToolbarBtn>
          <ToolbarBtn active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Blockquote">
            <QuoteIcon />
          </ToolbarBtn>
          <ToolbarBtn active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} title="Inline code">
            <CodeIcon />
          </ToolbarBtn>
          <Divider />
          <ToolbarBtn
            onClick={() => fileRef.current?.click()}
            title={uploading ? "Uploading…" : "Insert image"}
          >
            {uploading ? <Spinner /> : <ImageIcon />}
          </ToolbarBtn>
        </div>
      )}
      <div onPaste={handlePaste} style={{ minHeight }}>
        <EditorContent editor={editor} className="rich-editor-content" />
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadAndInsert(file);
          e.target.value = "";
        }}
      />
    </div>
  );
});
