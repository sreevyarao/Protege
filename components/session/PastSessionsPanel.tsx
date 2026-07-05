"use client";
import { History, Sparkles } from "lucide-react";
import { PastSession } from "@/lib/types";
import SessionCard from "./SessionCard";

interface Props {
  sessions: PastSession[];
  selectedId: string;
  onSelect: (session: PastSession) => void;
  onDelete?: (id: string) => void;
}

export default function PastSessionsPanel({ sessions, selectedId, onSelect, onDelete }: Props) {
  return (
    <aside className="flex h-full flex-col rounded-2xl border border-base-600 bg-base-800/50 p-4 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
          <History size={16} className="text-accent-400" />
          Past Sessions
        </div>
        <div className="rounded-full border border-mint-400/20 bg-mint-400/10 p-1.5 text-mint-300">
          <Sparkles size={13} />
        </div>
      </div>

      <div className="space-y-2 overflow-y-auto pr-1">
        {sessions.map((session) => (
          <SessionCard
            key={session.id}
            session={session}
            selected={session.id === selectedId}
            onSelect={onSelect}
            onDelete={onDelete}
          />
        ))}
      </div>

      <div className="mt-4 rounded-2xl border border-accent-400/20 bg-gradient-to-br from-accent-500/10 to-mint-400/5 p-3">
        <p className="text-xs font-medium text-gray-300">Teaching streak</p>
        <p className="mt-1 text-2xl font-bold text-white">4 days</p>
        <p className="mt-1 text-xs text-gray-500">Your explanations are getting more structured.</p>
      </div>
    </aside>
  );
}
