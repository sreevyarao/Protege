"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FlagTriangleRight } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import ChatWindow from "@/components/session/ChatWindow";
import DirectiveLog from "@/components/session/DirectiveLog";
import PastSessionsPanel from "@/components/session/PastSessionsPanel";
import ProgressPanel from "@/components/session/ProgressPanel";
// removed mock data imports
import { Directive, Message, PastSession } from "@/lib/types";

export default function SessionPage() {
  const router = useRouter();
  const [topic, setTopic] = useState("New Session");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [pastSessionsList, setPastSessionsList] = useState<PastSession[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [directives, setDirectives] = useState<Directive[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [coverage, setCoverage] = useState(0);
  const [clarity, setClarity] = useState(0);
  const [confidence, setConfidence] = useState(0);
  const [concepts, setConcepts] = useState(2);
  const [seconds, setSeconds] = useState(0);

  const [sessionId, setSessionId] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("protege_topic");
    const savedId = localStorage.getItem("protege_session_id");
    if (saved) setTopic(saved);
    if (savedId) setSelectedSessionId(savedId);

    // Fetch past sessions
    fetch("http://127.0.0.1:8000/api/sessions")
      .then((res) => res.json())
      .then((data) => {
        setPastSessionsList(data);
        if (savedId && data.some((s: PastSession) => s.id === savedId)) {
          setSelectedSessionId(savedId);
        } else {
          setTopic("New Session");
          setSelectedSessionId("");
        }
      })
      .catch((err) => console.error(err));

    const timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch individual session details when selected
  useEffect(() => {
    if (!selectedSessionId) return;
    fetch(`http://127.0.0.1:8000/api/sessions/${selectedSessionId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.session) {
          setTopic(data.session.topic);
          setCoverage(data.session.coverage || 0);
          setClarity(data.session.clarity || 0);
          setConfidence(data.session.confidence || 0);
        }
        if (data.messages) {
          const formatted = data.messages.map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            timestamp: new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          }));
          setMessages((prev) => {
            // Prevent wiping optimistic user message if we just created a session
            if (prev.length > formatted.length && prev[prev.length - 1].role === "user") {
              return prev;
            }
            return formatted;
          });
        } else {
          setMessages((prev) => (prev.length > 0 ? prev : []));
        }
        if (data.knowledge_graph?.nodes) {
          setConcepts(data.knowledge_graph.nodes.length);
        }
      })
      .catch((err) => console.error(err));
  }, [selectedSessionId]);

  const elapsed = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(
    seconds % 60
  ).padStart(2, "0")}`;

  const pushDirectiveMaybe = useCallback(() => {
    // We can remove mock directives or fetch real ones from backend if supported.
  }, []);

  const handlePastSessionSelect = (session: PastSession) => {
    setSelectedSessionId(session.id);
    localStorage.setItem("protege_session_id", session.id);
  };

  const handleNewSession = () => {
    setSelectedSessionId("");
    setTopic("New Session");
    setMessages([]);
    setCoverage(0);
    setClarity(0);
    setConfidence(0);
    setConcepts(0);
    localStorage.removeItem("protege_session_id");
  };

  const handleDeleteSession = async (id: string) => {
    try {
      await fetch(`http://127.0.0.1:8000/api/sessions/${id}`, { method: "DELETE" });
      setPastSessionsList((prev) => prev.filter((s) => s.id !== id));
      if (selectedSessionId === id) {
        handleNewSession();
      }
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  const handleSend = async (text: string, imageFile?: File, audioBlob?: Blob) => {
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);
    setConcepts((c) => c + 1);

    // Convert files to base64
    const fileToBase64 = (blob: Blob): Promise<string> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const resultString = reader.result as string;
          const base64data = resultString ? resultString.split(",")[1] : "";
          resolve(base64data);
        };
        reader.readAsDataURL(blob);
      });
    };

    let imageBase64: string | undefined;
    let imageMime: string | undefined;
    if (imageFile) {
      imageBase64 = await fileToBase64(imageFile);
      imageMime = imageFile.type;
    }

    let audioBase64: string | undefined;
    let audioMime: string | undefined;
    if (audioBlob) {
      audioBase64 = await fileToBase64(audioBlob);
      audioMime = audioBlob.type;
    }

    try {
      let activeSessionId = selectedSessionId;
      if (!activeSessionId) {
        // Create a new session dynamically
        const createRes = await fetch("http://127.0.0.1:8000/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: "New Session" })
        });
        const createData = await createRes.json();
        activeSessionId = createData.id;
        setSelectedSessionId(activeSessionId);
        localStorage.setItem("protege_session_id", activeSessionId);
        
        // Optimistically update the list so the new session appears
        setPastSessionsList(prev => [{
            id: activeSessionId,
            topic: "New Session",
            date: new Date().toLocaleDateString(),
            score: 0
        }, ...prev]);
      }

      const res = await fetch("http://127.0.0.1:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: activeSessionId,
          message: text,
          image_b64: imageBase64,
          image_mime: imageMime,
          audio_b64: audioBase64,
          audio_mime: audioMime,
        })
      });
      const data = await res.json();
      
      const aiMsg: Message = {
        id: crypto.randomUUID(),
        role: "ai",
        content: data.reply || "I am currently disconnected from my brain.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
      pushDirectiveMaybe();
    } catch (err) {
      console.error(err);
      setIsTyping(false);
    }
  };

  const handleEndSession = async () => {
    try {
      await fetch(`http://127.0.0.1:8000/api/evaluate/${selectedSessionId}`, { method: "POST" });
    } catch (err) {
      console.error(err);
    }
    router.push(`/report?id=${selectedSessionId}`);
  };

  return (
    <main className="min-h-screen bg-base-900">
      <Navbar />
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-accent-400">Teaching Session</p>
            <h1 className="text-2xl font-bold text-white">{topic}</h1>
            <p className="mt-1 text-sm text-gray-500">Explain, upload diagrams, or teach by voice.</p>
          </div>
          <button
            onClick={handleEndSession}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 px-4 py-2.5 text-sm font-medium text-white shadow-glow transition-transform hover:scale-[1.02] active:scale-95"
          >
            End Session <FlagTriangleRight size={16} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
          <div className="h-auto xl:h-[72vh] flex flex-col gap-3">
            <button
                onClick={handleNewSession}
                className="flex items-center justify-center gap-2 rounded-xl bg-base-800 border border-base-600 px-4 py-3 text-sm font-medium text-gray-200 transition-colors hover:border-accent-500 hover:text-white"
              >
                + New Session
            </button>
            <PastSessionsPanel
              sessions={pastSessionsList}
              selectedId={selectedSessionId}
              onSelect={handlePastSessionSelect}
              onDelete={handleDeleteSession}
            />
          </div>
          <div className="h-[72vh]">
            <ChatWindow messages={messages} isTyping={isTyping} onSend={handleSend} />
          </div>
          <div className="flex h-auto flex-col gap-5 xl:h-[72vh]">
            <ProgressPanel
              coverage={coverage}
              clarity={clarity}
              confidence={confidence}
              concepts={concepts}
              messagesCount={messages.length}
              elapsed={elapsed}
            />
            <div className="min-h-[220px] max-h-[260px] overflow-hidden">
              <DirectiveLog directives={directives} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
