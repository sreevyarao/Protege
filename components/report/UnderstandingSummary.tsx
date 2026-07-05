import { Lightbulb, Sparkles, TrendingUp } from "lucide-react";

export default function UnderstandingSummary({ nodes }: { nodes?: { concept_name: string, summary: string }[] }) {
  const highlights = nodes && nodes.length > 0 
    ? nodes.map(n => n.concept_name).slice(0, 3) 
    : ["Strong conceptual intuition", "Clear theoretical framing", "Needs more edge-case reasoning"];

  const summaryText = nodes && nodes.length > 0
    ? `You successfully covered ${nodes.length} core concepts including ${nodes.slice(0, 2).map(n => n.concept_name).join(' and ')}. The Protege has extracted key insights from your explanations.`
    : `You demonstrate strong conceptual understanding and explain ideas clearly. Your strongest areas are intuition and theoretical concepts. Improvement is needed in practical examples and edge-case reasoning.`;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-accent-500/20 bg-gradient-to-br from-base-800/90 via-base-800/70 to-accent-950/20 p-6 shadow-2xl shadow-black/20">
      <div className="pointer-events-none absolute right-0 top-0 h-28 w-28 bg-accent-500/10 blur-3xl" />
      <div className="relative">
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-200">
          <Sparkles size={16} className="text-accent-300" />
          Understanding Summary
        </div>
        <p className="text-sm leading-6 text-gray-300">
          {summaryText}
        </p>
        <div className="mt-5 grid gap-2">
          {highlights.map((highlight, index) => (
            <div key={highlight} className="flex items-center gap-2 rounded-xl border border-base-600 bg-base-900/50 px-3 py-2">
              {index === highlights.length - 1 ? (
                <TrendingUp size={14} className="text-amber-300" />
              ) : (
                <Lightbulb size={14} className="text-mint-300" />
              )}
              <span className="text-xs font-medium text-gray-300">{highlight}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
