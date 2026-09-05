import React, { useEffect, useMemo, useState } from "react";
import { getSubjectColor, getExceptionType, WEEKDAYS } from "@/lib/constants";
import { ClassDot } from "@/components/ClassDot";
import { todayISO, formatDateShort } from "@/lib/dateUtils";
import { layoutTimetable } from "@/lib/timetableLayout";
import { toMinutes } from "@/lib/timeUtils";
import CardActionsMenu from "@/components/CardActionsMenu";
import { Plus, Check, Circle } from "lucide-react";

const START_HOUR = 8;
const END_HOUR = 17;
const DEFAULT_PX_PER_HOUR = 80;
const TOTAL_MIN = (END_HOUR - START_HOUR) * 60;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const hours = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

// Format "HH:00" -> "08:00" (24h swedish style)
const fmtHour = (h) => `${String(h).padStart(2, "0")}:00`;

export default function WeekTimetable({
  weekData,
  planner,
  onExpandEvent,
  onMaterialiseSlot,
  onAdd,
  onMoveEvent,
  pxPerHour = DEFAULT_PX_PER_HOUR,
}) {
  const pxPerMin = pxPerHour / 60;
  const totalHeight = TOTAL_MIN * pxPerMin;
  return (
    <div
      className="grid rounded-2xl overflow-hidden border border-[#DEDAD2] bg-[#FFFEFB]"
      style={{ gridTemplateColumns: "56px repeat(5, minmax(0, 1fr))" }}
      data-testid="week-timetable"
    >
      {/* Header row */}
      <div className="border-b border-[#DEDAD2] bg-[#F6F3EE]" />
      {weekData.map((day, i) => (
        <DayHeader key={day.iso} label={WEEKDAYS[i]} day={day} onAdd={() => onAdd(day.iso, {})} />
      ))}

      {/* Content row */}
      <TimeAxis pxPerHour={pxPerHour} totalHeight={totalHeight} />
      {weekData.map((day) => (
        <DayColumn
          key={day.iso}
          day={day}
          planner={planner}
          onExpandEvent={onExpandEvent}
          onMaterialiseSlot={onMaterialiseSlot}
          onAdd={onAdd}
          onMoveEvent={onMoveEvent}
          pxPerHour={pxPerHour}
          pxPerMin={pxPerMin}
          totalHeight={totalHeight}
        />
      ))}
    </div>
  );
}

const DayHeader = ({ label, day, onAdd }) => {
  const isToday = day.iso === todayISO();
  return (
    <div
      className={`border-b border-l border-[#DEDAD2] px-3 py-2 flex items-center justify-between ${
        isToday ? "bg-[#DFE9E2]/50" : "bg-[#F6F3EE]"
      }`}
      data-testid={`day-header-${label.toLowerCase()}`}
    >
      <div>
        <div className="text-[10px] uppercase tracking-widest text-[#A3A69F] font-semibold">{label}</div>
        <div className={`text-sm font-serif-display ${isToday ? "text-[#718A7F]" : "text-[#293330]"}`}>
          {formatDateShort(day.date)}
        </div>
      </div>
      <button
        data-testid={`add-day-${label.toLowerCase()}`}
        onClick={onAdd}
        className="p-1.5 rounded-lg text-[#78817D] hover:bg-white hover:text-[#293330]"
        title="Lägg till händelse"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

const TimeAxis = ({ pxPerHour, totalHeight }) => (
  <div className="relative border-r border-[#DEDAD2] bg-[#F6F3EE]/40" style={{ height: totalHeight }}>
    {hours.map((h, i) => (
      <div
        key={h}
        className="absolute right-1.5 text-[10px] tabular-nums text-[#A3A69F] font-semibold"
        style={{ top: i * pxPerHour - 6 }}
      >
        {fmtHour(h)}
      </div>
    ))}
  </div>
);

const DayColumn = ({ day, planner, onExpandEvent, onMaterialiseSlot, onAdd, onMoveEvent, pxPerHour, pxPerMin, totalHeight }) => {
  const isToday = day.iso === todayISO();
  const [dragOver, setDragOver] = useState(false);
  const [nowMin, setNowMin] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes() - START_HOUR * 60;
  });

  useEffect(() => {
    if (!isToday) return;
    const tick = () => {
      const d = new Date();
      setNowMin(d.getHours() * 60 + d.getMinutes() - START_HOUR * 60);
    };
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [isToday]);

  // Combine slots + events + auto-completed slot flag propagation
  const items = useMemo(() => {
    const rows = [];
    day.slots.forEach((s) => {
      rows.push({
        id: `slot-${s.id}`,
        kind: "slot",
        data: s,
        startTime: s.time,
        endTime: s.endTime,
      });
    });
    day.events.forEach((e) => {
      rows.push({
        id: e.id,
        kind: "event",
        data: e,
        startTime: e.time,
        endTime: e.endTime,
      });
    });
    return layoutTimetable(rows);
  }, [day.slots, day.events]);

  // Followups without a time are pinned to top of column
  const untimedFollowups = day.followups || [];

  const showNowLine = isToday && nowMin >= 0 && nowMin <= TOTAL_MIN;

  const onDragOver = (e) => {
    if (e.dataTransfer.types.includes("text/x-event-id")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      if (!dragOver) setDragOver(true);
    }
  };
  const onDragLeave = () => setDragOver(false);
  const onDrop = (e) => {
    const id = e.dataTransfer.getData("text/x-event-id");
    setDragOver(false);
    if (!id) return;
    const ev = planner.events.find((x) => x.id === id);
    if (!ev || ev.date === day.iso) return;
    onMoveEvent(id, day.iso);
  };

  return (
    <div
      className={`relative border-l ${dragOver ? "bg-[#DFE9E2]/50" : isToday ? "bg-white" : "bg-[#FFFEFB]"} border-[#DEDAD2]`}
      style={{ height: totalHeight }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDoubleClick={(e) => {
        // Double-click on empty area creates event with prefilled time based on Y
        if (e.target !== e.currentTarget) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const min = Math.floor(y / pxPerMin / 5) * 5; // snap to 5-min
        const startMin = START_HOUR * 60 + min;
        const hh = String(Math.floor(startMin / 60)).padStart(2, "0");
        const mm = String(startMin % 60).padStart(2, "0");
        onAdd(day.iso, { time: `${hh}:${mm}` });
      }}
      data-testid={`day-column-${day.iso}`}
    >
      {/* Hour grid lines */}
      {hours.map((h, i) => (
        <div
          key={h}
          className={`absolute left-0 right-0 ${i === 0 ? "" : "border-t"} border-[#EFEAE1]`}
          style={{ top: i * pxPerHour }}
        />
      ))}
      {/* Half-hour ticks (lighter) */}
      {hours.slice(0, -1).map((h, i) => (
        <div
          key={`half-${h}`}
          className="absolute left-0 right-0 border-t border-dashed border-[#F0EBE2]"
          style={{ top: i * pxPerHour + pxPerHour / 2 }}
        />
      ))}

      {/* Exceptions – small strip at top of column */}
      {day.exceptions.length > 0 && (
        <div className="absolute left-1.5 right-1.5 top-1 space-y-1 z-20">
          {day.exceptions.map((ex) => {
            const t = getExceptionType(ex.type);
            return (
              <div key={ex.id} className={`text-[10px] px-2 py-0.5 rounded border ${t.badge}`} data-testid={`exception-${ex.id}`}>
                <span className="font-semibold">{t.label}:</span> {ex.title}
              </div>
            );
          })}
        </div>
      )}

      {/* Untimed followups pinned to bottom edge */}
      {untimedFollowups.length > 0 && (
        <div className="absolute left-1.5 right-1.5 bottom-1 space-y-1 z-20">
          {untimedFollowups.slice(0, 3).map((f) => (
            <button
              key={f.id}
              onClick={() => planner.toggleFollowupCompleted(f.id)}
              className={`w-full text-left rounded border border-[#E2D5F3] bg-[#F6F2FB]/95 px-2 py-1 text-[10px] flex items-start gap-1 ${f.completed ? "opacity-60" : ""}`}
              data-testid={`followup-${f.id}`}
              title={f.description}
            >
              {f.completed ? <Check className="h-3 w-3 text-[#5A3B8B] mt-0.5" /> : <Circle className="h-3 w-3 text-[#5A3B8B] mt-0.5" />}
              <span className="truncate flex-1 text-[#293330]">{f.description}</span>
            </button>
          ))}
        </div>
      )}

      {/* Now-line for today */}
      {showNowLine && (
        <div
          className="absolute left-0 right-0 flex items-center gap-1 pointer-events-none z-30"
          style={{ top: nowMin * pxPerMin }}
          data-testid="now-line"
        >
          <span className="h-2 w-2 rounded-full bg-[#B98B8B] ml-0.5" />
          <span className="h-px flex-1 bg-[#B98B8B]/80" />
          <span className="text-[10px] tabular-nums text-[#B98B8B] pr-1 font-semibold">
            {String(Math.floor((nowMin + START_HOUR * 60) / 60)).padStart(2, "0")}
            :
            {String((nowMin + START_HOUR * 60) % 60).padStart(2, "0")}
          </span>
        </div>
      )}

      {/* Timed cards */}
      {items.map((it) => (
        <TimetableCard
          key={it.id}
          item={it}
          planner={planner}
          onExpandEvent={onExpandEvent}
          onMaterialiseSlot={onMaterialiseSlot}
          pxPerMin={pxPerMin}
        />
      ))}
    </div>
  );
};

const TimetableCard = ({ item, planner, onExpandEvent, onMaterialiseSlot, pxPerMin }) => {
  const { classes, subjects } = planner;
  const data = item.data;
  const isEvent = item.kind === "event";
  const subject = subjects.find((s) => s.id === data.subjectId);
  const klass = classes.find((c) => c.id === data.classId);
  const color = subject ? getSubjectColor(subject.colorId) : null;

  const isMeeting = isEvent && data.type === "meeting";
  const isSamtal = isEvent && data.type === "utvecklingssamtal";
  const isAutoDone = !isEvent && data.autoCompleted;
  const isRecurring = isEvent && (data.recurrence || data._isSeriesOccurrence);

  // Position
  const startMin = clamp(item.startMin - START_HOUR * 60, 0, TOTAL_MIN);
  const endMin = clamp(item.endMin - START_HOUR * 60, 0, TOTAL_MIN);
  const top = startMin * pxPerMin;
  const height = Math.max(20, (endMin - startMin) * pxPerMin - 2);

  // Lane width
  const laneWidthPct = 100 / (item.laneCount || 1);
  const leftPct = (item.laneIndex || 0) * laneWidthPct;

  const handleClick = () => {
    if (isEvent) onExpandEvent(data);
    else onMaterialiseSlot({
      time: data.time,
      endTime: data.endTime,
      classId: data.classId,
      subjectId: data.subjectId,
      title: data.defaultTitle || "",
      type: "lesson",
      timetableId: data.id,
    });
  };

  const durationMin = endMin - startMin;
  const compact = durationMin < 45;

  return (
    <div
      className="absolute group"
      style={{
        top,
        height,
        left: `calc(${leftPct}% + 3px)`,
        width: `calc(${laneWidthPct}% - 6px)`,
        zIndex: 10,
      }}
    >
      <button
        onClick={handleClick}
        draggable={isEvent && !data._isSeriesOccurrence}
        onDragStart={(e) => {
          if (!isEvent || data._isSeriesOccurrence) return;
          e.dataTransfer.setData("text/x-event-id", data.id);
          e.dataTransfer.effectAllowed = "move";
        }}
        data-testid={isEvent ? `event-card-${data.id}` : `slot-card-${data.id}`}
        className={`w-full h-full rounded-lg border shadow-sm text-left overflow-hidden transition-shadow hover:shadow ${
          isEvent && data.completed ? "opacity-60" : ""
        } ${isAutoDone ? "opacity-60" : ""} ${!isEvent ? "border-dashed" : "cursor-grab active:cursor-grabbing"}`}
        style={{
          borderColor: color?.border || "#DEDAD2",
          backgroundColor: color?.bg || "#FFFEFB",
          color: color?.text || "#293330",
          padding: compact ? "3px 6px" : "5px 8px",
        }}
      >
        <div className="flex items-center justify-between text-[10px] tabular-nums font-semibold pr-4" style={{ color: color?.text || "#78817D" }}>
          <span>
            {data.time || item.startTime}
            {(item.endTime || data.endTime) ? `–${item.endTime || data.endTime}` : ""}
          </span>
          {isMeeting && <span className="text-[9px] px-1 rounded bg-white/70 uppercase tracking-wider">Möte</span>}
          {isSamtal && <span className="text-[9px] px-1 rounded bg-white/70 uppercase tracking-wider">Samtal</span>}
          {isRecurring && <span className="text-[9px] px-1 rounded bg-white/70" title="Återkommande" data-testid={`recurring-badge-${data.id}`}>↻</span>}
          {isAutoDone && <span className="text-[9px] flex items-center gap-0.5"><Check className="h-2.5 w-2.5" /></span>}
        </div>
        {!compact && (
          <div className="mt-0.5 flex items-center gap-1.5 text-[9.5px] uppercase tracking-wider font-semibold" style={{ color: color?.text || "#78817D" }}>
            {subject && <span>{subject.name}</span>}
            {klass && (
              <span className="flex items-center gap-1 opacity-80">
                <ClassDot colorId={klass.colorId} size={6} />
                {klass.name}
              </span>
            )}
          </div>
        )}
        <div className={`text-[12px] font-semibold ${compact ? "line-clamp-1 mt-0" : "line-clamp-2 mt-0.5"}`} style={{ color: "#293330" }}>
          {isEvent ? data.title : (data.defaultTitle || "Klicka för att planera")}
        </div>
      </button>
      {isEvent && (
        <CardActionsMenu event={data} onOpen={() => onExpandEvent(data)} />
      )}
    </div>
  );
};
