import StarterKit from "@tiptap/starter-kit";
import type { Extensions } from "@tiptap/react";
import {
  allowedHeadingLevels,
  allowedMarks,
  allowedNodes,
} from "@salil-sandesh/editor-config";
import { MediaImage } from "./image-extension";

const nodeSet = new Set<string>(allowedNodes);
const markSet = new Set<string>(allowedMarks);

export function editorExtensions(): Extensions {
  const extensions: Extensions = [
    StarterKit.configure({
      heading: nodeSet.has("heading")
        ? { levels: [...allowedHeadingLevels] }
        : false,
      bulletList: nodeSet.has("bulletList") ? undefined : false,
      orderedList: nodeSet.has("orderedList") ? undefined : false,
      listItem: nodeSet.has("listItem") ? undefined : false,
      blockquote: nodeSet.has("blockquote") ? undefined : false,
      horizontalRule: nodeSet.has("horizontalRule") ? undefined : false,
      hardBreak: nodeSet.has("hardBreak") ? undefined : false,
      bold: markSet.has("bold") ? undefined : false,
      italic: markSet.has("italic") ? undefined : false,
      link: markSet.has("link")
        ? {
            openOnClick: false,
            autolink: false,
            defaultProtocol: "https",
            protocols: ["http", "https"],
          }
        : false,
      code: false,
      codeBlock: false,
      strike: false,
      underline: false,
    }),
  ];
  if (nodeSet.has("image")) {
    extensions.push(MediaImage);
  }
  return extensions;
}
