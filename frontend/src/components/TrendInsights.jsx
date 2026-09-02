import React, { useMemo } from "react";
import { usePlanner } from "@/context/PlannerContext";
import { computeTrendInsights } from "@/lib/insights";
import { Sparkles, TrendingUp, TrendingDown, Heart } from "lucide-react";

const ICON_BY_TONE = {
  good: TrendingUp,
  watch: TrendingDown,
  neutral: Heart,
};

const STYLE_BY_TONE = {
  good: {
    icon: "bg-[#DFE9E2] text-[#47594E]",
    border: "border-[#C7D6CB]",
    tint: "bg-[#F3F7F4]",
  },
  watch: {
    icon: "bg-[#EEDACB] text-[#7B4B31]",
    border: "border-[#DFC3AC]",
    tint: "bg-[#FBF6F0]",
  },
  neutral: {
    icon: "bg-[#EFEAE1] text-[#78817D]",
    border: "border-[#DEDAD2]",
    tint: "bg-[#FFFEFB]",
  },
};

export default function TrendInsights({ compact = false, max = null, className = "" }) {
  const planner = usePlanner();
  const insights = useMemo(
    () => computeTrendInsights(planner.daySummaries || [], planner.dayTrends || []),
    [planner.daySummaries, planner.dayTrends],
  );

  const summariesCount = (planner.daySummaries || []).length;
  const shown = max != null ? insights.slice(0, max) : insights;

  // Empty state: not enough data yet – show helper card so users know insights are coming
  if (insights.length === 0) {
    const needed = Math.max(0, 5 - summariesCount);
    if (needed === 0) return null; // enough data, no insights currently
    if (compact) return null; // don't clutter Översikt with a "come back later" card
    return (
      <div className="rounded-2xl border border-dashed border-[#DEDAD2] bg-[#FFFEFB] p-6" data-testid="trend-insights-empty">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#F6F2FB] text-[#5A3B8B] flex items-center justify-center">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#293330]">Planovia märker snart mönster</div>
            <div className="text-xs text-[#78817D] mt-0.5">Fyll i ”Sammanfatta dagen” {needed} gång{needed > 1 ? "er" : ""} till så börjar dina insikter dyka upp här.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`} data-testid="trend-insights">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-[#F6F2FB] text-[#5A3B8B] flex items-center justify-center">
          <Sparkles className="h-3.5 w-3.5" />
        </div>
        <div className="text-[11px] uppercase tracking-widest text-[#A3A69F] font-semibold">Planovia märker</div>
      </div>
      <div className={compact ? "grid gap-2" : "grid md:grid-cols-2 gap-3"}>
        {shown.map((ins) => {
          const Icon = ICON_BY_TONE[ins.tone] || Heart;
          const style = STYLE_BY_TONE[ins.tone] || STYLE_BY_TONE.neutral;
          return (
            <div
              key={ins.id}
              className={`rounded-xl border ${style.border} ${style.tint} p-4 flex items-start gap-3`}
              data-testid={`trend-insight-${ins.id}`}
            >
              <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${style.icon}`}>
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[#293330]">{ins.title}</div>
                <div className="text-sm text-[#78817D] mt-1 leading-relaxed">{ins.body}</div>
              </div>
            </div>
          );
        })}
      </div>
      {max != null && insights.length > shown.length && (
        <div className="text-[11px] text-[#A3A69F]">+ {insights.length - shown.length} till på Statistik</div>
      )}
    </div>
  );
}
