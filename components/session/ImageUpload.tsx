"use client";
import { ChangeEvent, useRef } from "react";
import { Paperclip } from "lucide-react";

export interface UploadedImagePreview {
  name: string;
  url: string;
  file: File;
}

interface Props {
  onChange: (image: UploadedImagePreview) => void;
}

export default function ImageUpload({ onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !["image/png", "image/jpeg"].includes(file.type)) return;

    onChange({ name: file.name, url: URL.createObjectURL(file), file });
    event.target.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        onChange={handleUpload}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title="Upload diagram or notes"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-base-500 bg-base-900 text-gray-300 transition-colors hover:border-accent-400 hover:text-white active:scale-95"
      >
        <Paperclip size={16} />
      </button>
    </>
  );
}
