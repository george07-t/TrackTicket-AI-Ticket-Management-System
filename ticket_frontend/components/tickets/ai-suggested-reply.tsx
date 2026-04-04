"use client";

import { useState } from "react";
import { toast } from "react-toastify";

import { Button } from "@/components/ui/button";

export function AiSuggestedReply({
  suggestion,
  onUse,
  onGenerate,
  onRegenerate,
  isGenerating = false,
}: {
  suggestion: string | null;
  onUse: (text: string) => void;
  onGenerate?: () => Promise<void>;
  onRegenerate?: () => Promise<void>;
  isGenerating?: boolean;
}) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);

  async function copySuggestion() {
    if (!suggestion) return;
    await navigator.clipboard.writeText(suggestion);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <section className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-indigo-900">AI Suggested Reply</h3>
        <Button variant="secondary" className="cursor-pointer" onClick={() => setOpen((prev) => !prev)}>
          {open ? "Hide" : "Show"}
        </Button>
      </div>
      {open ? (
        <div className="mt-3 space-y-3">
          {suggestion ? (
            <p className="whitespace-pre-wrap text-sm text-indigo-900">{suggestion}</p>
          ) : (
            <p className="text-sm text-indigo-900">No AI reply generated yet.</p>
          )}
          <div className="flex gap-2">
            {suggestion ? (
              <Button variant="secondary" className="cursor-pointer" onClick={copySuggestion}>
                {copied ? "Copied!" : "Copy to Clipboard"}
              </Button>
            ) : null}
            {suggestion ? <Button className="cursor-pointer" onClick={() => onUse(suggestion)}>Use This Reply</Button> : null}
            {!suggestion && onGenerate ? (
              <Button className="cursor-pointer" onClick={() => void onGenerate()} disabled={isGenerating}>
                {isGenerating ? "Generating..." : "Generate Reply"}
              </Button>
            ) : null}
            {suggestion && onRegenerate ? (
              <Button variant="secondary" className="cursor-pointer" onClick={() => void onRegenerate()} disabled={isGenerating}>
                {isGenerating ? "Generating..." : "Regenerate"}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
