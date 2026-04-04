"use client";

import { useMemo } from "react";
import DOMPurify from "dompurify";

import { getMediaUrl } from "@/lib/api";

const IMG_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;
const HTML_TAG_RE = /<\/?[a-z][\s\S]*>/i;

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function legacyToHtml(text: string): string {
  const images: string[] = [];
  const prose = text
    .replace(IMG_RE, (_, _alt, url: string) => {
      images.push(url.trim());
      return "";
    })
    .trim();

  const proseHtml = prose
    ? `<p>${escapeHtml(prose).replace(/\n/g, "<br/>")}</p>`
    : "";
  const imagesHtml = images
    .map((url) => `<img src="${escapeHtml(getMediaUrl(url))}" alt="attachment" />`)
    .join("");

  return `${proseHtml}${imagesHtml}` || "<p></p>";
}

function sanitizeRichHtml(input: string): string {
  const source = HTML_TAG_RE.test(input) ? input : legacyToHtml(input);
  return DOMPurify.sanitize(source, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s", "blockquote", "code", "pre",
      "ul", "ol", "li", "h2", "h3", "a", "img", "span",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "class"],
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|\/)/i,
  });
}

export function RichBody({ text, className = "" }: { text: string; className?: string }) {
  const html = useMemo(() => sanitizeRichHtml(text), [text]);

  return (
    <div
      className={`rich-body ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
