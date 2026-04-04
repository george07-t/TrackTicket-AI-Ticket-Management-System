"use client";

import { useMemo } from "react";
import { getMediaUrl } from "@/lib/api";

// Matches markdown image syntax:  ![alt text](url)
const IMG_RE = /!\[([^\]]*)\]\(([^)]+)\)/g;

function parseBody(text: string): { prose: string; images: string[] } {
  const images: string[] = [];
  const prose = text
    .replace(IMG_RE, (_, _alt, url: string) => {
      images.push(url.trim());
      return "";
    })
    .trim();
  return { prose, images };
}

/**
 * Renders a ticket description or comment body.
 * Plain text is shown as-is; any embedded `![image](url)` markdown refs
 * are extracted and displayed as clickable image thumbnails below the text.
 */
export function RichBody({ text, className = "" }: { text: string; className?: string }) {
  const { prose, images } = useMemo(() => parseBody(text), [text]);

  return (
    <div className={className}>
      {prose && <p className="whitespace-pre-wrap text-sm leading-relaxed">{prose}</p>}
      {images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((url, i) => (
            <a
              key={i}
              href={getMediaUrl(url)}
              target="_blank"
              rel="noopener noreferrer"
              className="block overflow-hidden rounded-lg border border-[var(--line)] transition hover:opacity-90"
            >
              <img
                src={getMediaUrl(url)}
                alt={`Attachment ${i + 1}`}
                className="max-h-52 max-w-xs object-contain"
              />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
