import React, { useMemo, useRef, useState } from "react";
import { usePlanner } from "@/context/PlannerContext";
import { getSubjectColor } from "@/lib/constants";
import { unitProgress } from "@/lib/plannerHelpers";
import { getISOWeek } from "@/lib/dateUtils";
import { Button } from "@/components/ui/button";

const layoutLanes = (units) => {
  const sorted = [...units].sort((a, b) => (a.startWeek || 0) - (b.startWeek || 0));
  const lanes = [];
  return sorted.map((u) => {
    const start = u.startWeek || 1;
    const end = u.endWeek || start;
    let lane = 0;
    while (lane < lanes.length && lanes[lane] >= start) lane += 1;
    lanes[lane] = end;
    return { ...u, _lane: lane };
  });
};

const VIEWS = {
  auto: { label: "Använd data", getRange: (units) => {
    if (units.length === 0) return [1, 52];
    return [Math.max(1, Math.min(...units.map((u) => u.startWeek)) - 1),
            Math.min(53, Math.max(...units.map((u) => u.endWeek)) + 1)];
  } },
  ht: { label: "Hösttermin", getRange: () => [33, 52] },
  vt: { label: "Vårtermin", getRange: () => [1, 25] },
  year: { label: "Hela läsåret", getRange: () => [33, 77] }, // spans across year boundary
};

export default function TerminTimeline() {
  const planner = usePlanner();
  const [view, setView] = useState("auto");
  const [drag, setDrag] = useState(null);
  const gridRef = useRef(null);

  const usable = useMemo(
    () => planner.units.filter((u) => u.startWeek && u.endWeek),
    [planner.units],
  );

  const rangeData = useMemo(() => {
    const [rawMin, rawMax] = VIEWS[view].getRange(usable);
    // Handle 'year' spanning through week 53->1: normalise to a continuous scale where weeks >52 wrap.
    // For simplicity we cap at 53 and start over. Use offset weeks: if max<=52 keep as-is; if year mode, use weeks 33..52, 1..25 sequence.
    let weeks;
    if (view === "year") {
      weeks = [];
      for (let w = 33; w <= 52; w += 1) weeks.push({ label: w, key: `a${w}` });
      for (let w = 1; w <= 25; w += 1) weeks.push({ label: w, key: `b${w}` });
    } else {
      weeks = [];
      for (let w = rawMin; w <= rawMax; w += 1) weeks.push({ label: w, key: `w${w}` });
    }
    return { weeks, minWeek: rawMin, maxWeek: rawMax };
  }, [view, usable]);

  const laid = useMemo(() => layoutLanes(usable), [usable]);
  const [, currentWeek] = getISOWeek(new Date());

  const laneCount = Math.max(1, ...laid.map((u) => u._lane + 1));
  const totalWeeks = rangeData.weeks.length;

  // Map a "actual week number" to a column index (1-based within the visible weeks)
  const weekToCol = (weekNum) => {
    if (view === "year") {
      if (weekNum >= 33) return weekNum - 33 + 1;
      return 20 + weekNum;
    }
    return weekNum - rangeData.minWeek + 1;
  };

  const onMouseDown = (u, mode) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    const grid = gridRef.current;
    if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const labelWidth = 140;
    const colAreaWidth = rect.width - labelWidth;
    const colWidth = colAreaWidth / totalWeeks;
    setDrag({ id: u.id, mode, startX: e.clientX, origStart: u.startWeek, origEnd: u.endWeek, colWidth });
  };

  React.useEffect(() => {
    if (!drag) return;
    const onMove = (e) => {
      const dx = e.clientX - drag.startX;
      const deltaCols = Math.round(dx / drag.colWidth);
      if (deltaCols === 0) return;
      const u = planner.units.find((x) => x.id === drag.id);
      if (!u) return;
      let ns = drag.origStart, ne = drag.origEnd;
      if (drag.mode === "move") { ns = drag.origStart + deltaCols; ne = drag.origEnd + deltaCols; }
      else if (drag.mode === "left") { ns = Math.min(drag.origEnd, drag.origStart + deltaCols); }
      else if (drag.mode === "right") { ne = Math.max(drag.origStart, drag.origEnd + deltaCols); }
      ns = Math.max(1, Math.min(53, ns));
      ne = Math.max(1, Math.min(53, ne));
      if (ns !== u.startWeek || ne !== u.endWeek) {
        planner.updateUnit(u.id, { startWeek: ns, endWeek: ne });
      }
    };
    const onUp = () => setDrag(null);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [drag, planner]);

  if (usable.length === 0) return null;

  const isWeekVisible = (weekNum) => {
    if (view === "year") return true;
    return weekNum >= rangeData.minWeek && weekNum <= rangeData.maxWeek;
  };

  return (
    <div className="rounded-2xl border border-[#E6E1DA] bg-white p-5" data-testid="term-timeline">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="font-serif-display text-2xl text-[#2D312E]">Tidslinje</h2>
          <p className="text-xs text-[#656E67] mt-0.5">Dra ett block för att flytta det, eller kanterna för att ändra veckor.</p>
        </div>
        <div className="inline-flex rounded-lg border border-[#E6E1DA] bg-[#FAF7F2] p-0.5" data-testid="timeline-zoom">
          {Object.entries(VIEWS).map(([k, v]) => (
            <button
              key={k}
              data-testid={`zoom-${k}`}
              onClick={() => setView(k)}
              className={`px-3 py-1.5 rounded-md text-xs transition ${view === k ? "bg-white text-[#2D312E] shadow-sm border border-[#E6E1DA]" : "text-[#656E67] hover:text-[#2D312E]"}`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-full inline-block" ref={gridRef}>
          <div
            className="grid gap-px bg-[#E6E1DA] rounded-md overflow-hidden"
            style={{ gridTemplateColumns: `140px repeat(${totalWeeks}, minmax(28px, 1fr))` }}
          >
            <div className="bg-[#FAF7F2] px-3 py-2 text-[10px] uppercase tracking-widest text-[#8A948C] font-semibold">Vecka</div>
            {rangeData.weeks.map((w) => (
              <div
                key={w.key}
                className={`bg-[#FAF7F2] px-1 py-2 text-center text-[10px] tabular-nums font-semibold ${w.label === currentWeek ? "text-[#3D5A45]" : "text-[#656E67]"}`}
                data-testid={`timeline-week-${w.label}`}
              >
                {w.label}
              </div>
            ))}
          </div>

          <div
            className="relative grid gap-y-2 mt-2"
            style={{
              gridTemplateColumns: `140px repeat(${totalWeeks}, minmax(28px, 1fr))`,
              gridTemplateRows: `repeat(${laneCount}, 44px)`,
            }}
          >
            {Array.from({ length: laneCount }).map((_, i) => (
              <div
                key={`lbl-${i}`}
                className="text-[11px] uppercase tracking-widest text-[#8A948C] flex items-center px-3"
                style={{ gridColumn: 1, gridRow: i + 1 }}
              >
                Bana {i + 1}
              </div>
            ))}

            {rangeData.weeks.map((w, wIdx) => (
              <div
                key={`col-${w.key}`}
                className={`border-l ${w.label === currentWeek ? "border-[#3D5A45]" : "border-[#F3EFEA]"}`}
                style={{ gridColumn: wIdx + 2, gridRow: `1 / span ${laneCount}` }}
              />
            ))}

            {laid.map((u) => {
              const subj = planner.subjects.find((s) => s.id === u.subjectId);
              const klass = planner.classes.find((c) => c.id === u.classId);
              const color = subj ? getSubjectColor(subj.colorId) : { bg: "#EFF5F0", text: "#2D5A3A", border: "#D2E4D5" };
              if (!isWeekVisible(u.startWeek) && !isWeekVisible(u.endWeek)) return null;
              const startCol = Math.max(1, weekToCol(u.startWeek));
              const endCol = Math.min(totalWeeks, weekToCol(u.endWeek));
              const span = Math.max(1, endCol - startCol + 1);
              const { done, total } = unitProgress(u, planner.events);
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              const isDark = color.text === "#FFFFFF";
              return (
                <div
                  key={u.id}
                  className={`group rounded-lg pl-3 pr-3 py-1 border shadow-sm overflow-hidden relative select-none cursor-grab active:cursor-grabbing ${drag?.id === u.id ? "ring-2 ring-[#3D5A45]" : ""}`}
                  style={{
                    gridColumn: `${startCol + 1} / span ${span}`,
                    gridRow: u._lane + 1,
                    backgroundColor: color.bg,
                    borderColor: color.border,
                    color: color.text,
                  }}
                  data-testid={`timeline-unit-${u.id}`}
                  title={`${u.title} · v${u.startWeek}–${u.endWeek}${klass ? " · " + klass.name : ""}`}
                  onMouseDown={onMouseDown(u, "move")}
                >
                  {/* Resize handle: left */}
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 ${isDark ? "bg-white/30" : "bg-black/10"}`}
                    onMouseDown={onMouseDown(u, "left")}
                    data-testid={`timeline-resize-left-${u.id}`}
                  />
                  {/* Resize handle: right */}
                  <div
                    className={`absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 ${isDark ? "bg-white/30" : "bg-black/10"}`}
                    onMouseDown={onMouseDown(u, "right")}
                    data-testid={`timeline-resize-right-${u.id}`}
                  />
                  <div className="text-xs font-semibold truncate pointer-events-none">{u.title}</div>
                  <div className="text-[10px] opacity-80 truncate pointer-events-none">
                    {klass?.name}{klass && subj ? " · " : ""}{subj?.name} · v{u.startWeek}–{u.endWeek}
                  </div>
                  {total > 0 && (
                    <div className={`absolute bottom-0 left-0 right-0 h-1 ${isDark ? "bg-white/30" : "bg-black/10"}`}>
                      <div className="h-full" style={{ width: `${pct}%`, backgroundColor: isDark ? "#FFFFFF" : color.text, opacity: isDark ? 0.9 : 0.6 }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {currentWeek && (
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
