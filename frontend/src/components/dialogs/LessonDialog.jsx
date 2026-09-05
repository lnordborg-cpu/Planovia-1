import React, { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { usePlanner } from "@/context/PlannerContext";
import { formatDateLong, fromISODate } from "@/lib/dateUtils";
import { addMinutes, validateTimePair, findOverlaps, formatTimeRange, DEFAULT_LESSON_MINUTES } from "@/lib/timeUtils";
import { Sparkles, X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import RecurrencePicker from "@/components/dialogs/RecurrencePicker";

const DEFAULT_SAMTAL_TEMPLATE = {
  name: "Utvecklingssamtal (standard)",
  meetingType: "Utvecklingssamtal",
  participants: "Elev, vårdnadshavare",
  notes: `1. Inledning – hur trivs eleven?\n2. Ämnesöverblick\n   • Styrkor\n   • Utvecklingsområden\n3. Mål till nästa samtal\n4. Anpassningar & stöd\n5. Övriga frågor\n6. Överenskommelser`,
};

const SamtalTemplateSuggestion = ({ planner, onApply }) => {
  const templates = planner.meetingTemplates || [];
  const hasSamtalTemplate = templates.some((t) => /utvecklingssamtal/i.test(t.name) || /utvecklingssamtal/i.test(t.meetingType || ""));
  const dismissed = planner.hasSeenSamtalSuggestion;
  if (hasSamtalTemplate || dismissed) return null;

  const install = () => {
    const created = planner.addMeetingTemplate(DEFAULT_SAMTAL_TEMPLATE);
    planner.dismissSamtalSuggestion();
    onApply(created);
    toast.success("Mall lagd till – och applicerad på detta samtal.");
  };
  const later = () => {
    planner.dismissSamtalSuggestion();
  };

  return (
    <div className="rounded-xl border border-[#F9E8C7] bg-[#FEF8EC] p-3 flex gap-3 items-start" data-testid="samtal-template-suggestion">
      <div className="h-8 w-8 rounded-lg bg-[#F5B301]/20 flex items-center justify-center text-[#8C5E14] flex-shrink-0">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <div className="text-sm font-semibold text-[#293330]">Använd en färdig samtalsmall?</div>
        <div className="text-xs text-[#78817D] mt-0.5">Vi kan lägga till en klassisk utvecklingssamtalstruktur med rubriker som du kan bygga vidare på.</div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={install}
            className="text-xs px-3 py-1.5 rounded-lg bg-[#718A7F] text-white hover:bg-[#5C7267]"
            data-testid="samtal-template-install"
          >Ja tack, använd mallen</button>
          <button
            onClick={later}
            className="text-xs px-3 py-1.5 rounded-lg text-[#78817D] hover:bg-white/60"
            data-testid="samtal-template-dismiss"
          >Nej tack</button>
        </div>
      </div>
      <button onClick={later} className="text-[#A3A69F] hover:text-[#293330]" aria-label="Stäng">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default function LessonDialog({ open, onOpenChange, date, prefill = {} }) {
  const planner = usePlanner();
  const [type, setType] = useState(prefill.type || "lesson");
  const [time, setTime] = useState(prefill.time || "08:20");
  const [endTime, setEndTime] = useState(prefill.endTime || addMinutes(prefill.time || "08:20", DEFAULT_LESSON_MINUTES));
  const [classId, setClassId] = useState(prefill.classId || "");
  const [subjectId, setSubjectId] = useState(prefill.subjectId || "");
  const [title, setTitle] = useState(prefill.title || "");
  const [notes, setNotes] = useState("");
  const [unitId, setUnitId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [participants, setParticipants] = useState("");
  const [meetingType, setMeetingType] = useState("");
  const [addPrepTask, setAddPrepTask] = useState(true);
  const [recurrence, setRecurrence] = useState(null);
  const [timeError, setTimeError] = useState("");

  useEffect(() => {
    if (open) {
      const initStart = prefill.time || "08:20";
      setType(prefill.type || "lesson");
      setTime(initStart);
      setEndTime(prefill.endTime || addMinutes(initStart, DEFAULT_LESSON_MINUTES));
      setClassId(prefill.classId || "");
      setSubjectId(prefill.subjectId || "");
      setTitle(prefill.title || "");
      setNotes("");
      setUnitId("");
      setStudentId("");
      setParticipants("");
      setMeetingType("");
      setAddPrepTask(true);
      setRecurrence(null);
      setTimeError("");
    }
  }, [open, prefill.type, prefill.time, prefill.endTime, prefill.classId, prefill.subjectId, prefill.title]);

  // If user changes start time, nudge end time along (keeping duration)
  const onStartChange = (v) => {
    const prev = { start: time, end: endTime };
    setTime(v);
    // Try to preserve the previous duration
    const [prevSH, prevSM] = prev.start.split(":").map(Number);
    const [prevEH, prevEM] = (prev.end || "").split(":").map(Number);
    if (!isNaN(prevSH) && !isNaN(prevEH)) {
      const dur = (prevEH * 60 + prevEM) - (prevSH * 60 + prevSM);
      if (dur > 0) setEndTime(addMinutes(v, dur));
    }
  };

  // Overlaps – build a list of items on the same date to compare
  const overlaps = useMemo(() => {
    if (!open) return [];
    const items = [
      ...planner.events.filter((e) => e.date === date).map((e) => ({
        id: e.id,
        title: e.title || (e.type === "meeting" ? "Möte" : e.type === "utvecklingssamtal" ? "Utvecklingssamtal" : "Lektion"),
        startTime: e.time,
        endTime: e.endTime,
      })),
      ...(planner.timetable || [])
        .filter((t) => {
          const wd = new Date(date + "T00:00:00").getDay();
          const iso = (wd + 6) % 7;
          return t.dayIndex === iso;
        })
        .map((t) => ({ id: `slot-${t.id}`, title: t.defaultTitle || "Schemapost", startTime: t.time, endTime: t.endTime })),
    ];
    return findOverlaps(items, time, endTime, prefill.id || null);
  }, [open, planner.events, planner.timetable, date, time, endTime, prefill.id]);

  const save = () => {
    if (!title.trim() && type === "lesson") return;
    const valid = validateTimePair(time, endTime);
    if (!valid.ok) { setTimeError(valid.message); return; }
    setTimeError("");
    const base = {
      type,
      date,
      time: valid.start,
      endTime: valid.end,
      title: title.trim() || (type === "meeting" ? "Möte" : type === "utvecklingssamtal" ? "Utvecklingssamtal" : ""),
      notes,
      completed: false,
      materials: [],
    };
    let event;
    if (type === "lesson") {
      event = planner.upsertEvent({
        ...base,
        classId: classId || null,
        subjectId: subjectId || null,
        unitId: unitId && unitId !== "none" ? unitId : null,
        timetableId: prefill.timetableId || null,
      });
    } else if (type === "meeting") {
      event = planner.upsertEvent({
        ...base,
        meetingType,
        participants,
        studentId: studentId || null,
        recurrence: recurrence || undefined,
        seriesId: recurrence ? (prefill.seriesId || `srs_${Date.now().toString(36)}`) : undefined,
      });
    } else {
      // utvecklingssamtal
      event = planner.upsertEvent({
        ...base,
        studentId: studentId || null,
        participants,
      });
      // Auto-create meeting note reference
      if (studentId) {
        planner.addMeetingNote({
          studentId,
          date,
          meetingType: "Utvecklingssamtal",
          participants,
          notes,
          eventId: event.id,
        });
      }
      if (addPrepTask) {
        const student = planner.students.find((s) => s.id === studentId);
        planner.addTask({
          title: `Förbered utvecklingssamtal – ${student?.name || ""}`.trim(),
          category: "Planering",
          deadline: date,
          priority: "Viktig",
          sourceType: "utvecklingssamtal_prep",
          sourceId: event.id,
        });
      }
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="lesson-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif-display text-2xl">Ny händelse · {formatDateLong(fromISODate(date))}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-xs uppercase tracking-widest text-[#78817D]">Typ</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger data-testid="event-type-select" className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lesson">Lektion</SelectItem>
                <SelectItem value="meeting">Möte</SelectItem>
                <SelectItem value="utvecklingssamtal">Utvecklingssamtal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#78817D]">Starttid</Label>
              <Input data-testid="event-time-input" type="time" value={time} onChange={(e) => onStartChange(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#78817D]">Sluttid</Label>
              <Input data-testid="event-end-time-input" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#78817D]">Rubrik</Label>
              <Input data-testid="event-title-input" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="T.ex. Bråk" />
            </div>
          </div>

          {timeError && (
            <div className="text-xs text-[#9E4A3B] bg-[#FDF2F0] border border-[#F5D5D0] rounded-lg px-3 py-2 flex items-center gap-2" data-testid="event-time-error">
              <AlertTriangle className="h-3.5 w-3.5" /> {timeError}
            </div>
          )}
          {overlaps.length > 0 && !timeError && (
            <div className="text-xs text-[#7B4B31] bg-[#FBF6F0] border border-[#EEDACB] rounded-lg px-3 py-2 flex items-start gap-2" data-testid="event-overlap-warning">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-[#293330]">Detta krockar med:</div>
                <ul className="mt-0.5 space-y-0.5">
                  {overlaps.map((o) => (
                    <li key={o.id}>· {o.title} {formatTimeRange(o.startTime, o.endTime)}</li>
                  ))}
                </ul>
                <div className="mt-1 text-[#A3A69F]">Du kan fortfarande spara om det är avsiktligt.</div>
              </div>
            </div>
          )}

          {type === "lesson" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs uppercase tracking-widest text-[#78817D]">Klass</Label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger data-testid="event-class-select" className="mt-1"><SelectValue placeholder="Välj klass" /></SelectTrigger>
                  <SelectContent>
                    {planner.classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest text-[#78817D]">Ämne</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger data-testid="event-subject-select" className="mt-1"><SelectValue placeholder="Välj ämne" /></SelectTrigger>
                  <SelectContent>
                    {planner.subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {planner.units.length > 0 && (
                <div className="col-span-2">
                  <Label className="text-xs uppercase tracking-widest text-[#78817D]">Arbetsområde (valfritt)</Label>
                  <Select value={unitId} onValueChange={setUnitId}>
                    <SelectTrigger data-testid="event-unit-select" className="mt-1"><SelectValue placeholder="Inget" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Inget</SelectItem>
                      {planner.units.map((u) => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {type === "meeting" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-widest text-[#78817D]">Möteskategori</Label>
                  <Input data-testid="meeting-type-input" value={meetingType} onChange={(e) => setMeetingType(e.target.value)} className="mt-1" placeholder="Arbetslag, etc." />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest text-[#78817D]">Deltagare</Label>
                  <Input data-testid="meeting-participants-input" value={participants} onChange={(e) => setParticipants(e.target.value)} className="mt-1" />
                </div>
              </div>
              <RecurrencePicker value={recurrence} onChange={setRecurrence} />
            </>
          )}

          {type === "utvecklingssamtal" && (
            <>
              <SamtalTemplateSuggestion planner={planner} onApply={(tpl) => {
                if (tpl.participants) setParticipants(tpl.participants);
                if (tpl.notes) setNotes(tpl.notes);
              }} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-widest text-[#78817D]">Elev</Label>
                  <Select value={studentId} onValueChange={setStudentId}>
                    <SelectTrigger data-testid="samtal-student-select" className="mt-1"><SelectValue placeholder="Välj elev" /></SelectTrigger>
                    <SelectContent>
                      {planner.students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest text-[#78817D]">Deltagare</Label>
                  <Input data-testid="samtal-participants-input" value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="Vårdnadshavare…" className="mt-1" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-[#78817D]">
                <Checkbox data-testid="samtal-prep-check" checked={addPrepTask} onCheckedChange={(v) => setAddPrepTask(!!v)} />
                Lägg till förberedelse i Att göra
              </label>
            </>
          )}

          <div>
            <Label className="text-xs uppercase tracking-widest text-[#78817D]">Anteckningar</Label>
            <Textarea data-testid="event-notes-input" value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="lesson-cancel-btn">Avbryt</Button>
          <Button onClick={save} data-testid="lesson-save-btn" className="bg-[#718A7F] hover:bg-[#5C7267]">Spara</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
