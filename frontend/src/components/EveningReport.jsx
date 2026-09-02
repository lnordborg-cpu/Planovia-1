import React, { useMemo } from "react";
import { usePlanner } from "@/context/PlannerContext";
import { todayISO, weekdayIndex } from "@/lib/dateUtils";
import { Moon } from "lucide-react";

// Determines whether evening mode is *actively* on for the user right now
export const useIsEveningActive = () => {
  const planner = usePlanner();
  return React.useMemo(() => {
    if (planner.eveningMode === "on") return true;
    if (planner.eveningMode === "off") return false;
    const h = new Date().getHours();
    return h >= 20 || h < 5;
  }, [planner.eveningMode]);
};

export default function EveningReport() {
  const planner = usePlanner();
  const isEvening = useIsEveningActive();
  const today = todayISO();

  const { lessonsDone, tasksDone } = useMemo(() => {
    // Completed lessons today (manual + auto)
    const manualLessons = planner.events.filter(
      (e) => e.date === today && e.type === "lesson" && e.completed,
    ).length;
    const autoLessons = (planner.autoCompletedSlots || []).filter((a) => a.date === today).length;

    // Tasks completed today – prefer completedAt timestamp; fall back to deadline===today
    const tasksToday = planner.tasks.filter((t) => {
      if (!t.completed) return false;
      if (t.completedAt) return t.completedAt.slice(0, 10) === today;
      return t.deadline === today;
    }).length;

    return { lessonsDone: manualLessons + autoLessons, tasksDone: tasksToday };
  }, [planner.events, planner.autoCompletedSlots, planner.tasks, today]);

  if (!isEvening) return null;

  const nothingHappened = lessonsDone === 0 && tasksDone === 0;
  const wd = weekdayIndex(new Date());
  const isWeekend = wd > 4;

  // Small, personalised message
  const encouragement = (() => {
    if (nothingHappened) {
      return isWeekend
        ? "En stilla helgkväll. Vila upp dig till nästa vecka."
        : "En lugn kväll. Vila – imorgon är en ny dag.";
    }
    if (lessonsDone >= 4 || tasksDone >= 4) return "Vilken produktiv dag! Väl förtjänt vila nu.";
    if (lessonsDone > 0 && tasksDone > 0) return "Bra jobbat idag. Nu är det din tid.";
    if (lessonsDone > 0) return "Skönt att lektionerna är avklarade.";
    return "Fina steg framåt idag.";
  })();

  const parts = [];
  if (lessonsDone > 0) parts.push(`${lessonsDone} lektion${lessonsDone === 1 ? "" : "er"}`);
  if (tasksDone > 0) parts.push(`${tasksDone} uppgift${tasksDone === 1 ? "" : "er"}`);
  const summary = nothingHappened
    ? "Idag noterades inga avklarade lektioner eller uppgifter."
    : `Idag klarade du ${parts.join(" och ")}.`;

  return (
    <div
      className="rounded-2xl border border-[#3B4A5A] p-5 flex items-start gap-4 shadow-none"
      style={{
        background: "linear-gradient(135deg, #2A3441 0%, #3B4A5A 100%)",
        color: "#E8E5DE",
      }}
      data-testid="evening-report"
    >
      <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(232,229,222,0.12)" }}>
        <Moon className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <div className="flex-1">
        <div className="text-[11px] uppercase tracking-[0.2em] font-semibold" style={{ color: "#B8B0A3" }}>Nattlig rapport</div>
        <div className="font-serif-display text-2xl mt-1" style={{ color: "#F1EBDD" }}>{summary}</div>
        <div className="text-sm mt-2" style={{ color: "#B8B0A3" }}>{encouragement}</div>
      </div>
    </div>
  );
}
