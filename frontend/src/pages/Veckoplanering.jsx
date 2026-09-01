import React, { useMemo, useState } from "react";
import { usePlanner } from "@/context/PlannerContext";
import { buildWeekData } from "@/lib/plannerHelpers";
import { getISOWeek, getMondayOfISOWeek, getWeekdays, toISODate, formatDateShort, todayISO, fromISODate } from "@/lib/dateUtils";
import { WEEKDAYS, getSubjectColor, getExceptionType } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Clock, Trash2, Check, Circle } from "lucide-react";
import LessonDialog from "@/components/dialogs/LessonDialog";
import LessonExpandedDialog from "@/components/dialogs/LessonExpandedDialog";

// derive year/week from today
const initialYW = () => getISOWeek(new Date());

export default function Veckoplanering() {
  const planner = usePlanner();
  const [{ year, week }, setYW] = useState(() => {
    const [y, w] = initialYW();
    return { year: y, week: w };
  });
  const [dialogState, setDialogState] = useState(null); // { date, prefill }
  const [expandedEventId, setExpandedEventId] = useState(null);

  const weekData = useMemo(
    () => buildWeekData({
      year, week,
      timetable: planner.timetable,
      events: planner.events,
      calendarExceptions: planner.calendarExceptions,
      followups: planner.followups,
    }),
    [year, week, planner.timetable, planner.events, planner.calendarExceptions, planner.followups],
  );

  const monday = getMondayOfISOWeek(year, week);
  const friday = getWeekdays(monday)[4];

  const gotoWeek = (delta) => {
    const monday = getMondayOfISOWeek(year, week);
    monday.setDate(monday.getDate() + delta * 7);
    const [y, w] = getISOWeek(monday);
    setYW({ year: y, week: w });
  };

  const gotoThisWeek = () => {
    const [y, w] = initialYW();
    setYW({ year: y, week: w });
  };

  return (
    <div className="space-y-6" data-testid="page-veckoplanering">
      <header className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#8A948C] font-semibold">Veckoplanering</div>
          <h1 className="font-serif-display text-4xl mt-1 text-[#2D312E]">Vecka {week}</h1>
          <div className="text-sm text-[#656E67] mt-1">{formatDateShort(monday)} – {formatDateShort(friday)} · {year}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button data-testid="prev-week-btn" variant="outline" size="sm" onClick={() => gotoWeek(-1)} className="border-[#E6E1DA] bg-white">
            <ChevronLeft className="h-4 w-4 mr-1" /> Föregående
          </Button>
          <Button data-testid="this-week-btn" variant="outline" size="sm" onClick={gotoThisWeek} className="border-[#E6E1DA] bg-white">
            Denna vecka
          </Button>
          <Button data-testid="next-week-btn" variant="outline" size="sm" onClick={() => gotoWeek(1)} className="border-[#E6E1DA] bg-white">
            Nästa <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-5 gap-3">
        {weekData.map((day, i) => (
          <DayColumn
            key={day.iso}
            label={WEEKDAYS[i]}
            day={day}
            planner={planner}
            onAdd={(prefill) => setDialogState({ date: day.iso, prefill })}
            onExpand={(id) => setExpandedEventId(id)}
          />
        ))}
      </div>

      {dialogState && (
        <LessonDialog
          open={!!dialogState}
          onOpenChange={(v) => !v && setDialogState(null)}
          date={dialogState.date}
          prefill={dialogState.prefill}
        />
      )}
      {expandedEventId && (
        <LessonExpandedDialog
          open={!!expandedEventId}
          onOpenChange={(v) => !v && setExpandedEventId(null)}
          eventId={expandedEventId}
        />
      )}
    </div>
  );
}

const DayColumn = ({ label, day, planner, onAdd, onExpand }) => {
  const today = todayISO();
  const isToday = day.iso === today;
  // Merge slots + events sorted by time; followups appear on top
  const rows = useMemo(() => {
    const slotRows = day.slots.map((s) => ({ kind: "slot", time: s.time, data: s, id: `slot-${s.id}` }));
    const eventRows = day.events.map((e) => ({ kind: "event", time: e.time, data: e, id: e.id }));
    return [...slotRows, ...eventRows].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  }, [day.slots, day.events]);

  return (
    <div className={`rounded-2xl border ${isToday ? "border-[#3D5A45]" : "border-[#E6E1DA]"} bg-[#FAF7F2]/40 flex flex-col min-h-[500px]`} data-testid={`day-column-${label.toLowerCase()}`}>
      <div className="p-3 border-b border-[#E6E1DA] flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-[#8A948C] font-semibold">{label}</div>
          <div className={`text-sm font-serif-display ${isToday ? "text-[#3D5A45]" : "text-[#2D312E]"}`}>{formatDateShort(day.date)}</div>
        </div>
        <button
          data-testid={`add-day-${label.toLowerCase()}`}
          onClick={() => onAdd({})}
          className="p-1.5 rounded-lg hover:bg-white text-[#656E67]"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="p-2 flex-1 space-y-2 overflow-y-auto">
        {day.exceptions.map((ex) => {
          const t = getExceptionType(ex.type);
          return (
            <div key={ex.id} className={`text-[11px] px-2 py-1.5 rounded-lg border ${t.badge}`} data-testid={`exception-${ex.id}`}>
              <span className="font-semibold">{t.label}:</span> {ex.title}
            </div>
          );
        })}
        {day.followups.map((f) => (
          <FollowupRow key={f.id} f={f} onToggle={() => planner.toggleFollowupCompleted(f.id)} students={planner.students} />
        ))}
        {rows.length === 0 && day.followups.length === 0 && !day.hideRegular && (
          <div className="text-xs text-[#8A948C] px-2 py-6 text-center">Inga lektioner</div>
        )}
        {rows.map((r) => (
          <LessonCard
            key={r.id}
            row={r}
            planner={planner}
            onExpand={() => r.kind === "event" && onExpand(r.data.id)}
            onMaterialise={(prefill) => onAdd(prefill)}
          />
        ))}
      </div>
    </div>
  );
};

const FollowupRow = ({ f, onToggle, students }) => {
  const s = students.find((x) => x.id === f.studentId);
  return (
    <button
      data-testid={`followup-${f.id}`}
      onClick={onToggle}
      className={`w-full text-left rounded-lg border border-[#E2D5F3] bg-[#F6F2FB] px-2 py-1.5 text-xs flex gap-2 items-start hover:bg-[#EFE7F8] ${f.completed ? "opacity-60" : ""}`}
    >
      {f.completed ? <Check className="h-3.5 w-3.5 text-[#5A3B8B] mt-0.5" /> : <Circle className="h-3.5 w-3.5 text-[#5A3B8B] mt-0.5" />}
      <span className="flex-1">
        <div className={`text-[#5A3B8B] font-semibold text-[10px] uppercase tracking-widest`}>Uppföljning</div>
        <div className={`${f.completed ? "line-through" : ""} text-[#2D312E]`}>{f.description}</div>
        {s && <div className="text-[#8A948C]">{s.name}</div>}
      </span>
    </button>
  );
};

const LessonCard = ({ row, planner, onExpand, onMaterialise }) => {
  const { classes, subjects } = planner;
  const data = row.data;
  const isEvent = row.kind === "event";
  const subject = subjects.find((s) => s.id === data.subjectId);
  const klass = classes.find((c) => c.id === data.classId);
  const color = subject ? getSubjectColor(subject.colorId) : null;

  const isMeeting = isEvent && data.type === "meeting";
  const isSamtal = isEvent && data.type === "utvecklingssamtal";

  const handleClick = () => {
    if (isEvent) onExpand();
    else {
      // materialise: prefill from slot
      onMaterialise({
        time: data.time,
        classId: data.classId,
        subjectId: data.subjectId,
        title: data.defaultTitle || "",
        type: "lesson",
        timetableId: data.id,
      });
    }
  };

  return (
    <button
      onClick={handleClick}
      data-testid={isEvent ? `event-card-${data.id}` : `slot-card-${data.id}`}
      className={`w-full text-left rounded-xl border p-2.5 bg-white hover:shadow-sm transition ${isEvent && data.completed ? "opacity-60" : ""} ${!isEvent ? "border-dashed" : ""}`}
      style={{ borderColor: "#E6E1DA" }}
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold tabular-nums text-[#656E67]">
        <Clock className="h-3 w-3" /> {row.time || "—"}
        {!isEvent && <span className="ml-auto text-[10px] uppercase tracking-wider text-[#8A948C]">Schema</span>}
        {isMeeting && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-[#F0F5FA] text-[#2C5282]">Möte</span>}
        {isSamtal && <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-[#F6F2FB] text-[#5A3B8B]">Samtal</span>}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
        {subject && (
          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md border font-semibold"
            style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}>
            {subject.name}
          </span>
        )}
        {klass && <span className="text-[10px] text-[#656E67]">{klass.name}</span>}
      </div>
      <div className="mt-1 text-sm text-[#2D312E] line-clamp-2">
        {isEvent ? data.title : (data.defaultTitle || <span className="text-[#8A948C] italic">Klicka för att planera</span>)}
      </div>
      {isEvent && (
        <div className="text-[10px] text-[#3D5A45] mt-1 font-semibold uppercase tracking-wider">Mer →</div>
      )}
    </button>
  );
};
