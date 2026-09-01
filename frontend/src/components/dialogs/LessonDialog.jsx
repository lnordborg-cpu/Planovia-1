import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { usePlanner } from "@/context/PlannerContext";
import { formatDateLong, fromISODate } from "@/lib/dateUtils";
import { Sparkles, X } from "lucide-react";
import { toast } from "sonner";

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
  const [classId, setClassId] = useState(prefill.classId || "");
  const [subjectId, setSubjectId] = useState(prefill.subjectId || "");
  const [title, setTitle] = useState(prefill.title || "");
  const [notes, setNotes] = useState("");
  const [unitId, setUnitId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [participants, setParticipants] = useState("");
  const [meetingType, setMeetingType] = useState("");
  const [addPrepTask, setAddPrepTask] = useState(true);

  useEffect(() => {
    if (open) {
      setType(prefill.type || "lesson");
      setTime(prefill.time || "08:20");
      setClassId(prefill.classId || "");
      setSubjectId(prefill.subjectId || "");
      setTitle(prefill.title || "");
      setNotes("");
      setUnitId("");
      setStudentId("");
      setParticipants("");
      setMeetingType("");
      setAddPrepTask(true);
    }
  }, [open, prefill.type, prefill.time, prefill.classId, prefill.subjectId, prefill.title]);

  const save = () => {
    if (!title.trim() && type === "lesson") return;
    const base = {
      type,
      date,
      time,
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#78817D]">Tid</Label>
              <Input data-testid="event-time-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#78817D]">Rubrik</Label>
              <Input data-testid="event-title-input" value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1" placeholder="T.ex. Bråk" />
            </div>
          </div>

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
