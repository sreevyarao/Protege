"use client";
import { useEffect, useRef, useState } from "react";
import { ImageIcon, Loader2, Send, X } from "lucide-react";
import MessageBubble from "./MessageBubble";
import AudioInput from "./AudioInput";
import ImageUpload, { UploadedImagePreview } from "./ImageUpload";
import { Message } from "@/lib/types";

interface Props {
  messages: Message[];
  isTyping: boolean;
  onSend: (text: string, imageFile?: File, audioBlob?: Blob) => void;
}

export default function ChatWindow({ messages, isTyping, onSend }: Props) {
  const [input, setInput] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<UploadedImagePreview | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "auto", block: "nearest" });
  }, [messages, isTyping]);

  useEffect(() => {
    return () => {
      if (uploadedImage) URL.revokeObjectURL(uploadedImage.url);
    };
  }, [uploadedImage]);

  const handleImageChange = (image: UploadedImagePreview | null) => {
    setUploadedImage((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return image;
    });
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          setAudioBlob(blob);
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
        setAudioBlob(null);
      } catch (err) {
        console.error("Failed to start recording:", err);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !uploadedImage && !audioBlob && !isRecording) return;
    
    if (isRecording) {
        // Stop recording first before sending, or just wait. For now, stop it.
        toggleRecording();
        return; // wait for onstop to fire, user can send again.
    }

    const imageNote = uploadedImage ? `\n\n[Attached diagram: ${uploadedImage.name}]` : "";
    const audioNote = audioBlob ? `\n\n[Attached voice explanation]` : "";
    
    // We pass the actual files to onSend
    onSend(`${input.trim()}${imageNote}${audioNote}`, uploadedImage?.file, audioBlob || undefined);
    
    setInput("");
    setAudioBlob(null);
    handleImageChange(null);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-base-600 bg-base-800/50 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 size={14} className="animate-spin" /> Protege is thinking...
          </div>
        )}
        <div ref={endRef} />
      </div>

      {isRecording && (
        <div className="mx-3 mb-3 flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200">
          <span className="h-2 w-2 rounded-full bg-red-400 shadow-[0_0_14px_rgba(248,113,113,0.85)]" />
          Recording... (Click Mic to Stop)
        </div>
      )}

      {!isRecording && audioBlob && (
        <div className="mx-3 mb-3 flex items-center gap-2 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-200">
          Voice explanation attached!
          <button type="button" onClick={() => setAudioBlob(null)} className="ml-auto text-blue-300 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {uploadedImage && (
        <div className="mx-3 mb-3 flex items-center gap-3 rounded-2xl border border-base-600 bg-base-900/80 p-2.5">
          <div className="h-14 w-16 overflow-hidden rounded-xl border border-base-600 bg-base-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={uploadedImage.url} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{uploadedImage.name}</p>
            <p className="flex items-center gap-1 text-xs text-gray-500">
              <ImageIcon size={12} /> Ready to reference in your explanation
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleImageChange(null)}
            title="Remove image"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-base-700 hover:text-white"
          >
            <X size={15} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-base-600 p-3">
        <ImageUpload onChange={handleImageChange} />
        <AudioInput isRecording={isRecording} onToggle={toggleRecording} />
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={isRecording ? "Recording voice explanation..." : audioBlob ? "Add optional text..." : "Explain your concept..."}
          className="min-w-0 flex-1 rounded-xl border border-base-500 bg-base-900 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none transition-all focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
        />
        <button
          type="submit"
          title="Send explanation"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-600 text-white shadow-glow transition-transform hover:scale-105 active:scale-95"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
