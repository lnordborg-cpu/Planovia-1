import React, { useMemo, useState } from "react";
import { usePlanner } from "@/context/PlannerContext";
import { buildWeekData } from "@/lib/plannerHelpers";
import { getISOWeek, getMondayOfISOWeek, getWeekdays, toISODate, formatDateShort, todayISO, fromISODate } from "@/lib/dateUtils";
import { WEEKDAYS, getSubjectColor, getExceptionType, TERMS, inferCurrentTerm } from "@/lib/constants";
import { ClassDot } from "@/components/ClassDot";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus, Clock, Trash2, Check, Circle, CopyPlus, Printer, Filter, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import LessonDialog from "@/components/dialogs/LessonDialog";
import LessonExpandedDialog from "@/components/dialogs/LessonExpandedDialog";

// derive year/week from today
const initialYW = () => getISOWeek(new Date());

const ALL = "__all__";
const FILTER_KEY = "lararplanerare_v1_filter";

const loadFilter = () => {
  try {
    const raw = localStorage.getItem(FILTER_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return { classId: ALL, subjectId: ALL };
};

export default function Veckoplanering() {
  const planner = usePlanner();
  const [{ year, week }, setYW] = useState(() => {
    const [y, w] = initialYW();
    return { year: y, week: w };
  });
  const [dialogState, setDialogState] = useState(null); // { date, prefill }
  const [expandedEventId, setExpandedEventId] = useState(null);
  const initialFilter = loadFilter();
  const [filterClassId, setFilterClassId] = useState(initialFilter.classId);
  const [filterSubjectId, setFilterSubjectId] = useState(initialFilter.subjectId);

  React.useEffect(() => {
    try { localStorage.setItem(FILTER_KEY, JSON.stringify({ classId: filterClassId, subjectId: filterSubjectId })); }
    catch (e) { /* ignore */ }
  }, [filterClassId, filterSubjectId]);

  // Sync to active term: when term changes, jump to first week of that term
  const activeTermId = planner.activeTerm === "auto" ? inferCurrentTerm() : planner.activeTerm;
  const prevTermRef = React.useRef(activeTermId);
  React.useEffect(() => {
    if (prevTermRef.current !== activeTermId) {
      const [start] = TERMS[activeTermId].weeks;
      const [, curW] = getISOWeek(new Date());
      const targetYear = activeTermId === "vt" && curW >= 26 ? new Date().getFullYear() + 1 : new Date().getFullYear();
      setYW({ year: targetYear, week: start });
      prevTermRef.current = activeTermId;
    }
  }, [activeTermId]);

  const rawWeekData = useMemo(
    () => buildWeekData({
      year, week,
      timetable: planner.timetable,
      events: planner.events,
      calendarExceptions: planner.calendarExceptions,
      followups: planner.followups,
      autoCompletedSlots: planner.autoCompletedSlots,
    }),
    [year, week, planner.timetable, planner.events, planner.calendarExceptions, planner.followups, planner.autoCompletedSlots],
  );

  const filterActive = filterClassId !== ALL || filterSubjectId !== ALL;
  const matches = (obj) => {
    if (filterClassId !== ALL && obj.classId !== filterClassId) return false;
    if (filterSubjectId !== ALL && obj.subjectId !== filterSubjectId) return false;
    return true;
  };

  const weekData = useMemo(() => {
    if (!filterActive) return rawWeekData;
    return rawWeekData.map((d) => ({
      ...d,
      slots: d.slots.filter(matches),
      events: d.events.filter((e) => e.type === "lesson" ? matches(e) : filterClassId === ALL && filterSubjectId === ALL),
      followups: d.followups, // always keep – tied to students, not to class/subject filters
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawWeekData, filterActive, filterClassId, filterSubjectId]);

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

  const copyFromPrevWeek = () => {
    const currMon = getMondayOfISOWeek(year, week);
    const prevMon = new Date(currMon);
    prevMon.setDate(prevMon.getDate() - 7);
    const fromDates = getWeekdays(prevMon).map(toISODate);
    const toDates = getWeekdays(currMon).map(toISODate);
    const prevCount = planner.events.filter((e) => fromDates.includes(e.date)).length;
    if (prevCount === 0) {
      toast.info("Föregående vecka är tom – inget att kopiera.");
      return;
    }
    planner.copyEventsBetweenDates(fromDates, toDates);
    toast.success(`Kopierade ${prevCount} händelser från föregående vecka.`);
  };

  const printWeek = () => {
    document.body.classList.add("print-week");
    setTimeout(() => {
      window.print();
      document.body.classList.remove("print-week");
    }, 100);
  };

  return (
    <div className="space-y-6" data-testid="page-veckoplanering">
      <header className="flex items-end justify-between flex-wrap gap-4 no-print">
        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#A3A69F] font-semibold">Veckoplanering</div>
          <h1 className="font-serif-display text-4xl mt-1 text-[#293330]">Vecka {week}</h1>
          <div className="text-sm text-[#78817D] mt-1">{formatDateShort(monday)} – {formatDateShort(friday)} · {year}</div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button data-testid="copy-week-btn" variant="outline" size="sm" onClick={copyFromPrevWeek} className="border-[#DEDAD2] bg-white">
            <CopyPlus className="h-4 w-4 mr-1" /> Kopiera föregående
          </Button>
          <Button data-testid="print-week-btn" variant="outline" size="sm" onClick={printWeek} className="border-[#DEDAD2] bg-white">
            <Printer className="h-4 w-4 mr-1" /> Skriv ut
          </Button>
          <div className="w-px h-6 bg-[#DEDAD2] mx-1" />
          <Button data-testid="prev-week-btn" variant="outline" size="sm" onClick={() => gotoWeek(-1)} className="border-[#DEDAD2] bg-white">
            <ChevronLeft className="h-4 w-4 mr-1" /> Föregående
          </Button>
          <Button data-testid="this-week-btn" variant="outline" size="sm" onClick={gotoThisWeek} className="border-[#DEDAD2] bg-white">
            Denna vecka
          </Button>
          <Button data-testid="next-week-btn" variant="outline" size="sm" onClick={() => gotoWeek(1)} className="border-[#DEDAD2] bg-white">
            Nästa <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </header>

      <div className="hidden print:block mb-4">
        <div className="text-xs uppercase tracking-widest">Veckoplanering</div>
        <h1 className="font-serif-display text-3xl">Vecka {week} · {formatDateShort(monday)} – {formatDateShort(friday)} · {year}</h1>
      </div>

      <div className="flex items-center gap-2 flex-wrap no-print" data-testid="week-filter-bar">
        <div className="flex items-center gap-1.5 text-xs text-[#78817D]">
          <Filter className="h-3.5 w-3.5" /> Filtrera
        </div>
        <Select value={filterClassId} onValueChange={setFilterClassId}>
          <SelectTrigger data-testid="filter-class-select" className="h-8 w-40 bg-white border-[#DEDAD2] text-xs">
            <SelectValue placeholder="Alla klasser" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Alla klasser</SelectItem>
            {planner.classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterSubjectId} onValueChange={setFilterSubjectId}>
          <SelectTrigger data-testid="filter-subject-select" className="h-8 w-40 bg-white border-[#DEDAD2] text-xs">
            <SelectValue placeholder="Alla ämnen" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Alla ämnen</SelectItem>
            {planner.subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        {filterActive && (
          <button
            data-testid="filter-clear-btn"
            onClick={() => { setFilterClassId(ALL); setFilterSubjectId(ALL); }}
            className="h-8 px-2 rounded-lg border border-[#DEDAD2] bg-white text-xs text-[#78817D] hover:text-[#293330] flex items-center gap-1"
          >
            <X className="h-3 w-3" /> Rensa filter
          </button>
        )}
      </div>

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
  const [dragOver, setDragOver] = React.useState(false);
  // Merge slots + events sorted by time; followups appear on top
  const rows = useMemo(() => {
    const slotRows = day.slots.map((s) => ({ kind: "slot", time: s.time, endTime: s.endTime, data: s, id: `slot-${s.id}` }));
    const eventRows = day.events.map((e) => ({ kind: "event", time: e.time, endTime: e.endTime, data: e, id: e.id }));
    return [...slotRows, ...eventRows].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  }, [day.slots, day.events]);

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
    planner.moveEventToDate(id, day.iso);
  };

  return (
    <div
      className={`rounded-2xl border ${dragOver ? "border-[#718A7F] bg-[#DFE9E2]/60" : isToday ? "border-[#718A7F]" : "border-[#DEDAD2]"} bg-[#FFFEFB]/40 flex flex-col min-h-[500px] transition-colors`}
      data-testid={`day-column-${label.toLowerCase()}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="p-3 border-b border-[#DEDAD2] flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-widest text-[#A3A69F] font-semibold">{label}</div>
          <div className={`text-sm font-serif-display ${isToday ? "text-[#718A7F]" : "text-[#293330]"}`}>{formatDateShort(day.date)}</div>
        </div>
        <button
          data-testid={`add-day-${label.toLowerCase()}`}
          onClick={() => onAdd({})}
          className="p-1.5 rounded-lg hover:bg-white text-[#78817D]"
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
          <div className="text-xs text-[#A3A69F] px-2 py-6 text-center">Inga lektioner</div>
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
        <div className={`${f.completed ? "line-through" : ""} text-[#293330]`}>{f.description}</div>
        {s && <div className="text-[#A3A69F]">{s.name}</div>}
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
  const isAutoDone = !isEvent && data.autoCompleted;

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
      draggable={isEvent}
      onDragStart={(e) => {
        if (!isEvent) return;
        e.dataTransfer.setData("text/x-event-id", data.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      data-testid={isEvent ? `event-card-${data.id}` : `slot-card-${data.id}`}
      className={`w-full text-left rounded-xl border p-2.5 bg-white hover:shadow-sm transition ${isEvent && data.completed ? "opacity-60" : ""} ${isAutoDone ? "opacity-60" : ""} ${!isEvent ? "border-dashed" : "cursor-grab active:cursor-grabbing"}`}
      style={{ borderColor: "#DEDAD2" }}
    >
      <div className="flex items-center gap-2 text-[11px] font-semibold tabular-nums text-[#78817D]">
        <Clock className="h-3 w-3" /> {row.time ? (row.endTime ? `${row.time}–${row.endTime}` : row.time) : "—"}
        {!isEvent && !isAutoDone && <span className="ml-auto text-[10px] uppercase tracking-wider text-[#A3A69F]">Schema</span>}
        {isAutoDone && (
          <span className="ml-auto text-[10px] uppercase tracking-wider text-[#718A7F] flex items-center gap-1" data-testid={`slot-autodone-${data.id}`}>
            <Check className="h-3 w-3" /> Genomförd
          </span>
        )}
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
        {klass && (
          <span className="text-[10px] text-[#78817D] flex items-center gap-1">
            <ClassDot colorId={klass.colorId} size={8} />
            {klass.name}
          </span>
        )}
      </div>
      <div className="mt-1 text-sm text-[#293330] line-clamp-2">
        {isEvent ? data.title : (data.defaultTitle || <span className="text-[#A3A69F] italic">Klicka för att planera</span>)}
      </div>
      {isEvent && (
        <div className="text-[10px] text-[#718A7F] mt-1 font-semibold uppercase tracking-wider">Mer →</div>
      )}
    </button>
  );
};
