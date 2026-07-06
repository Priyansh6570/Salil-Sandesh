"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import {
  Bold,
  Heading2,
  Heading3,
  Heading4,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import type { MediaSummary, TipTapNode } from "@salil-sandesh/shared";
import { allowedHeadingLevels, allowedNodes, type AllowedHeadingLevel } from "@salil-sandesh/editor-config";
import { Button } from "@/components/ui/button";
import { MediaPicker } from "@/components/media-picker";
import { editorExtensions } from "@/lib/editor-extensions";
import { stripInlineImageSrc } from "@/lib/strip-image-src";
import { cn } from "@/lib/utils";

const imageAllowed = (allowedNodes as readonly string[]).includes("image");

const headingIcons: Record<AllowedHeadingLevel, LucideIcon> = {
  2: Heading2,
  3: Heading3,
  4: Heading4,
};

function promptForLink(editor: Editor): void {
  const current = (editor.getAttributes("link").href as string | undefined) ?? "";
  const input = window.prompt("लिंक URL (http/https):", current);
  if (input === null) {
    return;
  }
  if (input === "") {
    editor.chain().focus().unsetLink().run();
    return;
  }
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return;
    }
    editor.chain().focus().setLink({ href: url.toString() }).run();
  } catch {
    return;
  }
}

function ToolbarButton({
  active,
  onClick,
  children,
  label,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="icon"
      aria-label={label}
      onMouseDown={(event) => {
        event.preventDefault();
        onClick();
      }}
    >
      {children}
    </Button>
  );
}

export function RichTextEditor({
  value,
  onChange,
}: {
  value: TipTapNode;
  onChange: (body: TipTapNode) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const editor = useEditor({
    extensions: editorExtensions(),
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor: instance }) => {
      onChange(stripInlineImageSrc(instance.getJSON() as TipTapNode));
    },
    editorProps: {
      attributes: {
        class: "tiptap-editor",
      },
    },
  });
  if (!editor) {
    return <div className="min-h-48 rounded-md border" />;
  }
  const insertImage = (media: MediaSummary): void => {
    editor
      .chain()
      .focus()
      .insertContent({
        type: "image",
        attrs: {
          mediaId: media.id,
          src: media.url,
          alt: media.alt,
          width: media.width,
          height: media.height,
        },
      })
      .run();
    setPickerOpen(false);
  };
  return (
    <div className="rounded-md border">
      <div className="flex flex-wrap items-center gap-1 border-b p-1">
        <ToolbarButton
          label="बोल्ड"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="इटैलिक"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="लिंक" active={editor.isActive("link")} onClick={() => promptForLink(editor)}>
          <LinkIcon className="h-4 w-4" />
        </ToolbarButton>
        {allowedHeadingLevels.map((level) => {
          const Icon = headingIcons[level];
          return (
            <ToolbarButton
              key={level}
              label={`शीर्षक ${level}`}
              active={editor.isActive("heading", { level })}
              onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
            >
              <Icon className="h-4 w-4" />
            </ToolbarButton>
          );
        })}
        <ToolbarButton
          label="सूची"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="क्रमांकित सूची"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="उद्धरण"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="विभाजक"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
        >
          <Minus className="h-4 w-4" />
        </ToolbarButton>
        {imageAllowed ? (
          <ToolbarButton label="छवि जोड़ें" onClick={() => setPickerOpen(true)}>
            <ImageIcon className="h-4 w-4" />
          </ToolbarButton>
        ) : null}
      </div>
      <EditorContent editor={editor} className={cn("px-3 py-2")} />
      {pickerOpen ? (
        <MediaPicker onSelect={insertImage} onClose={() => setPickerOpen(false)} />
      ) : null}
    </div>
  );
}
