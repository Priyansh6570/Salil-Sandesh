import type { TipTapNode } from "@salil-sandesh/shared";

export function stripInlineImageSrc(node: TipTapNode): TipTapNode {
  if (node.type === "image") {
    const attrs = node.attrs ?? {};
    return {
      type: "image",
      attrs: {
        mediaId: attrs.mediaId,
        alt: attrs.alt ?? "",
        width: attrs.width,
        height: attrs.height,
      },
    };
  }
  if (!node.content) {
    return node;
  }
  return { ...node, content: node.content.map(stripInlineImageSrc) };
}
