"use client";
import { useRouter } from "next/navigation";
import { BarChart3, Clock, Home, MessageSquare, RotateCcw, ShieldCheck, Sparkles, Target } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import MetricsRadarChart from "@/components/report/MetricsRadarChart";
import ReportCard from "@/components/report/ReportCard";
import StatsCard from "@/components/report/StatsCard";
import UnderstandingSummary from "@/components/report/UnderstandingSummary";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function ReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("id");
  const [stats, setStats] = useState({
    topic: "Loading...",
    duration: "--",
    messagesExchanged: 0,
    conceptsCovered: 0,
    coverageScore: 0,
    clarityScore: 0,
    confidenceScore: 0,
  });
  
  const [metrics, setMetrics] = useState([
    { label: "Coverage", score: 0 },
    { label: "Clarity", score: 0 },
    { label: "Confidence", score: 0 }
  ]);

  const [nodes, setNodes] = useState<{ concept_name: string, summary: string }[]>([]);

  useEffect(() => {
    if (sessionId) {
      fetch(`http://127.0.0.1:8000/api/sessions/${sessionId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.session) {
            setStats((prev) => ({
              ...prev,
              topic: data.session.topic || "Unknown Topic",
              coverageScore: data.session.coverage || 0,
              clarityScore: data.session.clarity || 0,
              confidenceScore: data.session.confidence || 0,
              messagesExchanged: data.messages?.length || 0,
              conceptsCovered: data.knowledge_graph?.nodes?.length || 0,
            }));
            
            if (data.knowledge_graph?.nodes) {
                setNodes(data.knowledge_graph.nodes);
            }
            
            setMetrics([
              { label: "Coverage", score: data.session.coverage || 0 },
              { label: "Clarity", score: data.session.clarity || 0 },
              { label: "Confidence", score: data.session.confidence || 0 }
            ]);
          }
        })
        .catch((err) => console.error(err));
    }
  }, [sessionId]);

  return (
    <main className="min-h-screen bg-base-900">
      <Navbar />
      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        <ReportCard stats={stats} />

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          <StatsCard icon={Clock} label="Duration" value={stats.duration} />
          <StatsCard icon={MessageSquare} label="Exchanges" value={stats.messagesExchanged} />
          <StatsCard icon={BarChart3} label="Concepts Covered" value={stats.conceptsCovered} />
          <StatsCard icon={Target} label="Coverage" value={`${stats.coverageScore}%`} accent="text-cyan-300" />
          <StatsCard icon={Sparkles} label="Clarity" value={`${stats.clarityScore}%`} accent="text-mint-300" />
          <StatsCard
            icon={ShieldCheck}
            label="Confidence"
            value={`${stats.confidenceScore}%`}
            accent="text-amber-300"
          />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_0.95fr]">
          <UnderstandingSummary nodes={nodes} />
          <MetricsRadarChart data={metrics} />
        </div>

        <div className="rounded-2xl border border-base-600 bg-base-800/50 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <h3 className="mb-4 text-sm font-medium text-gray-300">Metric Breakdown</h3>
          <div className="grid gap-4 md:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-2xl border border-base-600 bg-base-900/50 p-4">
                <div className="mb-2 flex justify-between text-xs text-gray-400">
                  <span>{metric.label}</span>
                  <span>{metric.score}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-base-600">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-500 to-mint-400"
                    style={{ width: `${metric.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <button
            onClick={() => router.push("/session")}
            className="flex items-center gap-2 rounded-xl border border-base-500 px-5 py-2.5 text-sm text-gray-300 transition-colors hover:border-accent-500 hover:text-white"
          >
            <RotateCcw size={16} /> New Session
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 px-5 py-2.5 text-sm font-medium text-white shadow-glow transition-transform hover:scale-[1.02] active:scale-95"
          >
            <Home size={16} /> Home
          </button>
        </div>
      </div>
    </main>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-base-900 flex items-center justify-center text-gray-400">Loading Report...</div>}>
      <ReportContent />
    </Suspense>
  );
}
