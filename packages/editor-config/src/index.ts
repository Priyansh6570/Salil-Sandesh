import type { TipTapMark, TipTapNode } from "@salil-sandesh/shared";

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
  "image",
] as const;

export const allowedMarks = ["bold", "italic", "link"] as const;

export const allowedHeadingLevels = [2, 3, 4] as const;

export const allowedLinkProtocols = ["http:", "https:"] as const;

export type AllowedNode = (typeof allowedNodes)[number];
export type AllowedMark = (typeof allowedMarks)[number];
export type AllowedHeadingLevel = (typeof allowedHeadingLevels)[number];

export const allowedNodeAttrs: Record<AllowedNode, readonly string[]> = {
  doc: [],
  paragraph: [],
  text: [],
  heading: ["level"],
  bulletList: [],
  orderedList: ["start", "type"],
  listItem: [],
  blockquote: [],
  horizontalRule: [],
  hardBreak: [],
  image: ["mediaId", "alt", "width", "height"],
};

export const allowedMarkAttrs: Record<AllowedMark, readonly string[]> = {
  bold: [],
  italic: [],
  link: ["href", "target", "rel", "class"],
};

const maxDepth = 20;
const maxNodes = 5000;
const maxAttrStringLength = 2000;

const nodeNames: readonly string[] = allowedNodes;
const markNames: readonly string[] = allowedMarks;
const headingLevels: readonly number[] = allowedHeadingLevels;
const linkProtocols: readonly string[] = allowedLinkProtocols;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validLinkHref(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  try {
    return linkProtocols.includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

function validateAttrs(
  attrs: unknown,
  allowedKeys: readonly string[],
  path: string,
  violations: string[]
): void {
  if (attrs === undefined) {
    return;
  }
  if (!isRecord(attrs)) {
    violations.push(`${path}: attrs must be an object`);
    return;
  }
  for (const [key, value] of Object.entries(attrs)) {
    if (!allowedKeys.includes(key)) {
      violations.push(`${path}: attr '${key}' is not allowed`);
      continue;
    }
    const type = typeof value;
    const primitive = value === null || type === "string" || type === "number" || type === "boolean";
    if (!primitive || (type === "string" && (value as string).length > maxAttrStringLength)) {
      violations.push(`${path}: attr '${key}' has an unsupported value`);
    }
  }
}

function validateMark(mark: unknown, path: string, violations: string[]): void {
  if (!isRecord(mark) || typeof mark.type !== "string") {
    violations.push(`${path}: mark must be an object with a type`);
    return;
  }
  if (!markNames.includes(mark.type)) {
    violations.push(`${path}: mark type '${mark.type}' is not allowed`);
    return;
  }
  validateAttrs(mark.attrs, allowedMarkAttrs[mark.type as AllowedMark], path, violations);
  if (mark.type === "link") {
    const attrs = isRecord(mark.attrs) ? mark.attrs : {};
    if (!validLinkHref(attrs.href)) {
      violations.push(`${path}: link href must be an absolute http or https url`);
    }
  }
}

interface ValidationState {
  violations: string[];
  nodeCount: number;
}

function validateNode(node: unknown, path: string, depth: number, state: ValidationState): void {
  if (state.violations.length >= 20) {
    return;
  }
  if (depth > maxDepth) {
    state.violations.push(`${path}: nesting exceeds maximum depth of ${maxDepth}`);
    return;
  }
  state.nodeCount += 1;
  if (state.nodeCount > maxNodes) {
    state.violations.push(`document exceeds maximum of ${maxNodes} nodes`);
    return;
  }
  if (!isRecord(node) || typeof node.type !== "string") {
    state.violations.push(`${path}: node must be an object with a type`);
    return;
  }
  if (!nodeNames.includes(node.type)) {
    state.violations.push(`${path}: node type '${node.type}' is not allowed`);
    return;
  }
  if (node.type === "doc" && depth > 0) {
    state.violations.push(`${path}: doc node is only allowed at the root`);
    return;
  }
  if (node.type === "text") {
    if (typeof node.text !== "string" || node.text.length === 0) {
      state.violations.push(`${path}: text node requires non-empty text`);
    }
    if (node.content !== undefined) {
      state.violations.push(`${path}: text node cannot have content`);
    }
  }
  validateAttrs(
    node.attrs,
    allowedNodeAttrs[node.type as AllowedNode],
    path,
    state.violations
  );
  if (node.type === "heading") {
    const attrs = isRecord(node.attrs) ? node.attrs : {};
    if (typeof attrs.level !== "number" || !headingLevels.includes(attrs.level)) {
      state.violations.push(
        `${path}: heading level must be one of ${headingLevels.join(", ")}`
      );
    }
  }
  if (node.type === "orderedList" && isRecord(node.attrs) && node.attrs.start !== undefined) {
    const start = node.attrs.start;
    if (typeof start !== "number" || !Number.isInteger(start) || start < 1 || start > 1000000) {
      state.violations.push(`${path}: orderedList start must be a positive integer`);
    }
  }
  if (node.type === "image") {
    const attrs = isRecord(node.attrs) ? node.attrs : {};
    if (typeof attrs.mediaId !== "string" || !/^[0-9a-f]{24}$/.test(attrs.mediaId)) {
      state.violations.push(`${path}: image requires a valid mediaId`);
    }
    if (node.content !== undefined) {
      state.violations.push(`${path}: image node cannot have content`);
    }
  }
  if (node.marks !== undefined) {
    if (!Array.isArray(node.marks)) {
      state.violations.push(`${path}: marks must be an array`);
    } else {
      node.marks.forEach((mark, index) => validateMark(mark, `${path}.marks[${index}]`, state.violations));
    }
  }
  if (node.content !== undefined) {
    if (!Array.isArray(node.content)) {
      state.violations.push(`${path}: content must be an array`);
    } else {
      node.content.forEach((child, index) =>
        validateNode(child, `${path}.content[${index}]`, depth + 1, state)
      );
    }
  }
}

export function validateArticleBody(body: unknown): string[] {
  const state: ValidationState = { violations: [], nodeCount: 0 };
  if (!isRecord(body) || body.type !== "doc") {
    return ["body must be a doc node"];
  }
  validateNode(body, "doc", 0, state);
  return state.violations;
}

export function isValidArticleBody(body: unknown): body is TipTapNode {
  return validateArticleBody(body).length === 0;
}

export function collectImageMediaIds(body: TipTapNode): string[] {
  const ids = new Set<string>();
  const walk = (node: TipTapNode): void => {
    if (node.type === "image") {
      const mediaId = node.attrs?.mediaId;
      if (typeof mediaId === "string") {
        ids.add(mediaId);
      }
    }
    node.content?.forEach(walk);
  };
  walk(body);
  return [...ids];
}

export type { TipTapMark, TipTapNode };
