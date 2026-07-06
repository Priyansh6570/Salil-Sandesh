export const allowedNodes = [
  "doc",
  "paragraph",
  "text",
  "heading",
  "bulletList",
  "orderedList",
  "listItem",
  "blockquote",
  "horizontalRule",
  "hardBreak",
] as const;

export const allowedMarks = ["bold", "italic", "link"] as const;

export type AllowedNode = (typeof allowedNodes)[number];
export type AllowedMark = (typeof allowedMarks)[number];
