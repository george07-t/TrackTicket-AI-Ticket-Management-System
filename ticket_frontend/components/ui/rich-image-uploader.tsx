"use client";

import { useRef, useState } from "react";
import { toast } from "react-toastify";

import { api, getApiErrorMessage, getMediaUrl } from "@/lib/api";
import { attachmentName } from "@/lib/slug";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function UploadIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M12 16V4m0 0l-4 4m4-4l4 4" />
      <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

export function RichImageUploader({
  images,
  onChange,
  disabled = false,
  maxImages = 5,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  disabled?: boolean;
  maxImages?: number;
}) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadFile(file: File) {
    if (!ALLOWED_TYPES.has(file.type)) {
      toast.error("Only image files are allowed (jpeg, png, gif, webp).");
      return;
    }
    if (images.length >= maxImages) {
      toast.error(`You can attach up to ${maxImages} images.`);
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post<{ url: string }>("/attachments/upload", form);
      onChange([...images, data.url]);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to upload image."));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between rounded-lg border border-dashed border-[var(--line)] bg-slate-50 px-3 py-2">
        <p className="text-xs text-[var(--muted)]">
          Attach images below (shown in the same style in ticket view)
        </p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading || images.length >= maxImages}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-white px-2.5 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--paper)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? <Spinner /> : <UploadIcon />}
          Upload
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadFile(file);
          event.target.value = "";
        }}
      />

      {images.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {images.map((url, index) => (
            <div key={`${url}-${index}`} className="group relative">
              <img
                src={getMediaUrl(url)}
                alt={attachmentName(url)}
                className="h-16 w-16 rounded-lg border border-[var(--line)] object-cover"
              />
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(images.filter((_, i) => i !== index))}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white opacity-0 shadow transition-opacity group-hover:opacity-100"
                  title="Remove image"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
