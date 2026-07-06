import { Node } from "@tiptap/core";

export interface ImageAttributes {
  mediaId: string;
  alt: string;
  width: number;
  height: number;
  src: string;
}

export const MediaImage = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,
  addAttributes() {
    return {
      mediaId: { default: null },
      alt: { default: "" },
      width: { default: null },
      height: { default: null },
      src: { default: null, parseHTML: () => null },
    };
  },
  parseHTML() {
    return [{ tag: "img[data-media-id]" }];
  },
  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      "img",
      {
        "data-media-id": HTMLAttributes.mediaId,
        src: HTMLAttributes.src,
        alt: HTMLAttributes.alt,
        width: HTMLAttributes.width,
        height: HTMLAttributes.height,
      },
    ];
  },
});
