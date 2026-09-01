import React, { useMemo } from "react";
import { usePlanner } from "@/context/PlannerContext";
import { getSubjectColor } from "@/lib/constants";
import { unitProgress } from "@/lib/plannerHelpers";
import { getISOWeek } from "@/lib/dateUtils";

// Lay out units into non-overlapping rows (greedy)
const layoutLanes = (units) => {
  const sorted = [...units].sort((a, b) => (a.startWeek || 0) - (b.startWeek || 0));
  const lanes = []; // lanes[i] = last endWeek
  return sorted.map((u) => {
    const start = u.startWeek || 1;
    const end = u.endWeek || start;
    let lane = 0;
    while (lane < lanes.length && lanes[lane] >= start) lane += 1;
    lanes[lane] = end;
    return { ...u, _lane: lane };
  });
};

export default function TerminTimeline() {
  const planner = usePlanner();

  const usable = useMemo(
    () => planner.units.filter((u) => u.startWeek && u.endWeek),
    [planner.units],
  );

  const { minWeek, maxWeek, weeks, laid, currentWeek } = useMemo(() => {
    if (usable.length === 0) return { minWeek: 0, maxWeek: 0, weeks: [], laid: [], currentWeek: null };
    const min = Math.max(1, Math.min(...usable.map((u) => u.startWeek)) - 1);
    const max = Math.min(53, Math.max(...usable.map((u) => u.endWeek)) + 1);
    const weeksArr = [];
    for (let w = min; w <= max; w += 1) weeksArr.push(w);
    const laidUnits = layoutLanes(usable);
    const [, cw] = getISOWeek(new Date());
    return { minWeek: min, maxWeek: max, weeks: weeksArr, laid: laidUnits, currentWeek: cw };
  }, [usable]);

  if (usable.length === 0) return null;

  const laneCount = Math.max(1, ...laid.map((u) => u._lane + 1));
  const totalWeeks = weeks.length;
  const cellWidth = `minmax(28px, 1fr)`;

  return (
    <div className="rounded-2xl border border-[#E6E1DA] bg-white p-5" data-testid="term-timeline">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-serif-display text-2xl text-[#2D312E]">Tidslinje</h2>
          <p className="text-xs text-[#656E67] mt-0.5">Så här ligger dina arbetsområden mot varandra över terminen.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-full inline-block">
          {/* Week header */}
          <div
            className="grid gap-px bg-[#E6E1DA] rounded-md overflow-hidden"
            style={{ gridTemplateColumns: `140px repeat(${totalWeeks}, ${cellWidth})` }}
          >
            <div className="bg-[#FAF7F2] px-3 py-2 text-[10px] uppercase tracking-widest text-[#8A948C] font-semibold">Vecka</div>
            {weeks.map((w) => (
              <div
                key={w}
                className={`bg-[#FAF7F2] px-1 py-2 text-center text-[10px] tabular-nums font-semibold ${w === currentWeek ? "text-[#3D5A45]" : "text-[#656E67]"}`}
                data-testid={`timeline-week-${w}`}
              >
                {w}
              </div>
            ))}
          </div>

          {/* Rows: one lane per row */}
          <div
            className="relative grid gap-y-2 mt-2"
            style={{ gridTemplateColumns: `140px repeat(${totalWeeks}, ${cellWidth})`, gridTemplateRows: `repeat(${laneCount}, 44px)` }}
          >
            {/* Label column placeholders */}
            {Array.from({ length: laneCount }).map((_, i) => (
              <div
                key={`lbl-${i}`}
                className="text-[11px] uppercase tracking-widest text-[#8A948C] flex items-center px-3"
                style={{ gridColumn: 1, gridRow: i + 1 }}
              >
                Bana {i + 1}
              </div>
            ))}

            {/* Week grid lines */}
            {weeks.map((w, wIdx) => (
              <div
                key={`col-${w}`}
                className={`border-l ${w === currentWeek ? "border-[#3D5A45]" : "border-[#F3EFEA]"}`}
                style={{ gridColumn: wIdx + 2, gridRow: `1 / span ${laneCount}` }}
              />
            ))}

            {/* Unit bars */}
            {laid.map((u) => {
              const subj = planner.subjects.find((s) => s.id === u.subjectId);
              const klass = planner.classes.find((c) => c.id === u.classId);
              const color = subj ? getSubjectColor(subj.colorId) : { bg: "#EFF5F0", text: "#2D5A3A", border: "#D2E4D5" };
              const startIdx = Math.max(0, u.startWeek - minWeek);
              const endIdx = Math.min(totalWeeks - 1, u.endWeek - minWeek);
              const span = endIdx - startIdx + 1;
              const { done, total } = unitProgress(u, planner.events);
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div
                  key={u.id}
                  className="rounded-lg px-2 py-1 border shadow-sm overflow-hidden relative"
                  style={{
                    gridColumn: `${startIdx + 2} / span ${span}`,
                    gridRow: u._lane + 1,
                    backgroundColor: color.bg,
                    borderColor: color.border,
                    color: color.text,
                  }}
                  data-testid={`timeline-unit-${u.id}`}
                  title={`${u.title} · v${u.startWeek}–${u.endWeek}${klass ? " · " + klass.name : ""}`}
                >
                  <div className="text-xs font-semibold truncate">{u.title}</div>
                  <div className="text-[10px] opacity-80 truncate">
                    {klass?.name}{klass && subj ? " · " : ""}{subj?.name}
                  </div>
                  {total > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/40">
                      <div className="h-full" style={{ width: `${pct}%`, backgroundColor: color.text, opacity: 0.6 }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {currentWeek && currentWeek >= minWeek && currentWeek <= maxWeek && (
            <div className="mt-3 text-[11px] text-[#3D5A45] font-semibold flex items-center gap-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-[#3D5A45]" />
              Aktuell vecka: {currentWeek}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
