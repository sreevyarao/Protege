"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";
import { suggestedTopics } from "@/lib/mockData";

export default function TopicForm() {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Intermediate");
  const router = useRouter();

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      localStorage.removeItem("protege_session_id");
      router.push("/session");
      return;
    }
    
    try {
      const res = await fetch("http://127.0.0.1:8000/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic })
      });
      const data = await res.json();
      
      if (typeof window !== "undefined") {
        localStorage.setItem("protege_topic", topic);
        localStorage.setItem("protege_difficulty", difficulty);
        localStorage.setItem("protege_session_id", data.id);
      }
      router.push(`/session?id=${data.id}`);
    } catch (err) {
      console.error(err);
      // Fallback
      router.push("/session");
    }
  };

  return (
    <motion.form
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15 }}
      onSubmit={handleStart}
      className="relative z-10 mx-auto -mt-4 max-w-4xl rounded-2xl border border-base-600 bg-base-800/70 p-10 shadow-xl backdrop-blur"
    >
      <label className="mb-2 flex items-center gap-2 text-xl font-semibold text-gray-300">
        <BookOpen size={16} className="text-accent-400" /> What do you want to teach?
      </label>
      <input
        value={topic}
        onChange={(e) => setTopic(e.target.value)}
        placeholder="e.g. Neural Networks, Photosynthesis, Game Theory..."
        className="w-full rounded-xl border border-base-500 bg-base-900 px-6 py-3 text-lg text-white placeholder-gray-500 outline-none focus:border-accent-500 focus:ring-1 focus:ring-accent-500"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        {suggestedTopics.map((t) => (
          <button
            type="button"
            key={t}
            onClick={() => setTopic(t)}
            className="rounded-full border border-base-500 px-6 py-3 text-base text-gray-400 transition-colors hover:border-accent-500 hover:text-accent-400"
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3">
        {["Difficulty","Beginner", "Intermediate", "Advanced"].map((d) => (
          <button
            type="button"
            key={d}
            onClick={() => setDifficulty(d)}
            className={`rounded-lg px-3 py-1 text-xs transition-colors ${
              difficulty === d
                ? "bg-accent-600 text-white"
                : "bg-base-700 text-gray-400 hover:text-white"
            }`}
          >
            {d}
          </button>
        ))}
      </div>

      <button
        type="submit"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 py-3 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.01] active:scale-[0.99]"
      >
        Start Teaching Session <ArrowRight size={16} />
      </button>
    </motion.form>
  );
}