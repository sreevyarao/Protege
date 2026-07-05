"use client";
import { motion } from "framer-motion";
import { CheckCircle2, Trash2 } from "lucide-react";
import { PastSession } from "@/lib/types";

interface Props {
  session: PastSession;
  selected: boolean;
  onSelect: (session: PastSession) => void;
  onDelete?: (id: string) => void;
}

export default function SessionCard({ session, selected, onSelect, onDelete }: Props) {
  return (
    <motion.div
      onClick={() => onSelect(session)}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`group w-full rounded-2xl border p-3 text-left transition-all ${
        selected
          ? "border-accent-400/60 bg-accent-500/10 shadow-glow"
          : "border-base-600 bg-base-800/50 hover:border-base-500 hover:bg-base-700/50"
      }`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(session);
        }
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${session.accent} text-sm font-bold text-white shadow-lg shadow-black/20`}
        >
          {session.avatar}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-semibold text-white">{session.topic}</h3>
            <div className="flex items-center gap-2">
              {selected && <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-mint-400" />}
              {onDelete && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(session.id);
                  }}
                  className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          </div>
          <p className="mt-1 text-xs font-medium text-accent-300">{session.score}% Coverage</p>
          <p className="mt-0.5 text-xs text-gray-500">{session.date}</p>
        </div>
      </div>
    </motion.div>
  );
}
