import Image from "next/image";
import { createElement, Fragment, type ReactNode } from "react";
import type { TipTapMark, TipTapNode } from "@salil-sandesh/shared";
import {
  allowedMarks,
  allowedNodes,
  type AllowedMark,
  type AllowedNode,
} from "@salil-sandesh/editor-config";

const allowedNodeNames: readonly string[] = allowedNodes;
const allowedMarkNames: readonly string[] = allowedMarks;

function safeHref(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function UnsupportedContent({ label, type }: { label: string; type: string }) {
  return (
    <span className="inline-block rounded border border-dashed border-destructive/60 bg-destructive/5 px-2 py-0.5 text-xs text-destructive">
      {label}: {type}
    </span>
  );
}

const markRenderers: Record<
  AllowedMark,
  (children: ReactNode, key: string, attrs?: Record<string, unknown>) => ReactNode
> = {
  bold: (children, key) => <strong key={key}>{children}</strong>,
  italic: (children, key) => <em key={key}>{children}</em>,
  link: (children, key, attrs) => {
    const href = safeHref(attrs?.href);
    if (!href) {
      return <Fragment key={key}>{children}</Fragment>;
    }
    return (
      <a
        key={key}
        href={href}
        rel="noopener noreferrer"
        className="font-medium underline underline-offset-4"
      >
        {children}
      </a>
    );
  },
};

function applyMarks(
  text: ReactNode,
  marks: TipTapMark[] | undefined,
  key: string,
  unsupportedLabel: string
): ReactNode {
  if (!marks || marks.length === 0) {
    return text;
  }
  return marks.reduce((wrapped, mark, index) => {
    if (!allowedMarkNames.includes(mark.type)) {
      return (
        <Fragment key={`${key}-m${index}`}>
          {wrapped}
          <UnsupportedContent label={unsupportedLabel} type={mark.type} />
        </Fragment>
      );
    }
    return markRenderers[mark.type as AllowedMark](wrapped, `${key}-m${index}`, mark.attrs);
  }, text);
}

function headingLevel(attrs?: Record<string, unknown>): number {
  const level = typeof attrs?.level === "number" ? attrs.level : 2;
  return Math.min(Math.max(Math.trunc(level), 1), 6);
}

const nodeRenderers: Record<
  AllowedNode,
  (node: TipTapNode, key: string, children: ReactNode, unsupportedLabel: string) => ReactNode
> = {
  doc: (_node, key, children) => <div key={key}>{children}</div>,
  paragraph: (_node, key, children) => (
    <p key={key} className="leading-7 [&:not(:first-child)]:mt-4">
      {children}
    </p>
  ),
  text: (node, key, _children, unsupportedLabel) =>
    applyMarks(node.text ?? "", node.marks, key, unsupportedLabel),
  heading: (node, key, children) =>
    createElement(
      `h${headingLevel(node.attrs)}`,
      { key, className: "mt-8 scroll-m-20 text-2xl font-semibold tracking-tight" },
      children
    ),
  bulletList: (_node, key, children) => (
    <ul key={key} className="my-4 ml-6 list-disc [&>li]:mt-2">
      {children}
    </ul>
  ),
  orderedList: (_node, key, children) => (
    <ol key={key} className="my-4 ml-6 list-decimal [&>li]:mt-2">
      {children}
    </ol>
  ),
  listItem: (_node, key, children) => <li key={key}>{children}</li>,
  blockquote: (_node, key, children) => (
    <blockquote key={key} className="mt-4 border-l-2 pl-4 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  horizontalRule: (_node, key) => <hr key={key} className="my-6 border-border" />,
  hardBreak: (_node, key) => <br key={key} />,
  image: (node, key) => {
    const attrs = node.attrs ?? {};
    const src = typeof attrs.src === "string" ? attrs.src : null;
    const width = typeof attrs.width === "number" ? attrs.width : 0;
    const height = typeof attrs.height === "number" ? attrs.height : 0;
    if (!src || width <= 0 || height <= 0) {
      return null;
    }
    const alt = typeof attrs.alt === "string" ? attrs.alt : "";
    return (
      <span key={key} className="my-4 block">
        <Image
          src={src}
          alt={alt}
          width={width}
          height={height}
          sizes="(max-width: 768px) 100vw, 768px"
          className="h-auto w-full rounded-lg"
        />
      </span>
    );
  },
};

function renderNode(node: TipTapNode, key: string, unsupportedLabel: string): ReactNode {
  if (!allowedNodeNames.includes(node.type)) {
    return <UnsupportedContent key={key} label={unsupportedLabel} type={node.type} />;
  }
  const children = node.content?.map((child, index) =>
    renderNode(child, `${key}-${index}`, unsupportedLabel)
  );
  return nodeRenderers[node.type as AllowedNode](node, key, children, unsupportedLabel);
}

export function ArticleBody({
  body,
  unsupportedLabel,
}: {
  body: TipTapNode;
  unsupportedLabel: string;
}) {
  return <div className="text-base">{renderNode(body, "n", unsupportedLabel)}</div>;
}
