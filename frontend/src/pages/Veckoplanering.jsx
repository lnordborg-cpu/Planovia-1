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
import WeekTimetable from "@/components/WeekTimetable";

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

      <WeekTimetable
        weekData={weekData}
        planner={planner}
        onAdd={(date, prefill) => setDialogState({ date, prefill })}
        onExpandEvent={(id) => setExpandedEventId(id)}
        onMaterialiseSlot={(prefill) => {
          // Same behaviour as clicking a slot: open LessonDialog on the slot's date
          // The slot's date is embedded in the day it comes from; we open it via the
          // day the slot belongs to (which is already the currently rendered day).
          // Find the date from the timetable slot in weekData.
          const day = weekData.find((d) => d.slots.some((s) => s.id === prefill.timetableId));
          if (day) setDialogState({ date: day.iso, prefill });
        }}
        onMoveEvent={(id, iso) => planner.moveEventToDate(id, iso)}
      />

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
