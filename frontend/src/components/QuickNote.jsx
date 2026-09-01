import React, { useEffect, useState } from "react";
import { usePlanner } from "@/context/PlannerContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil } from "lucide-react";
import { todayISO } from "@/lib/dateUtils";
import { toast } from "sonner";

export default function QuickNote({ initialStudentId = "", offsetRight = "21rem" }) {
  const planner = usePlanner();
  const [open, setOpen] = useState(false);
  const [studentId, setStudentId] = useState(initialStudentId);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(todayISO());
  const [linkedEventId, setLinkedEventId] = useState("");

  useEffect(() => {
    if (!open) return;
    setStudentId(initialStudentId || (planner.students[0]?.id ?? ""));
    setTitle(""); setNote(""); setDate(todayISO()); setLinkedEventId("");
  }, [open, initialStudentId, planner.students]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const save = () => {
    if (!studentId || (!title.trim() && !note.trim())) return;
    planner.addStudentNote({
      studentId,
      date,
      title: title.trim(),
      note: note.trim(),
      linkedEventId: linkedEventId && linkedEventId !== "none" ? linkedEventId : null,
    });
    const student = planner.students.find((s) => s.id === studentId);
    toast.success(`Notering sparad för ${student?.name || "eleven"}`);
    setOpen(false);
  };

  // Nearby lessons (±3 days) matching selected student's class
  const student = planner.students.find((s) => s.id === studentId);
  const nearbyLessons = React.useMemo(() => {
    if (!student) return [];
    const anchor = new Date(date + "T00:00:00");
    const inRange = (iso) => {
      const d = new Date(iso + "T00:00:00");
      const diff = Math.abs((d - anchor) / (1000 * 60 * 60 * 24));
      return diff <= 3;
    };
    return planner.events
      .filter((e) => e.type === "lesson" && e.classId === student.classId && inRange(e.date))
      .sort((a, b) => (a.date + (a.time || "")).localeCompare(b.date + (b.time || "")));
  }, [planner.events, student, date]);

  return (
    <>
      <button
        data-testid="quick-note-fab"
        onClick={() => setOpen(true)}
        style={{ right: offsetRight }}
        className="no-print fixed bottom-6 z-40 h-12 w-12 rounded-full bg-[#3D5A45] text-white shadow-lg hover:bg-[#2F4736] hover:scale-105 transition flex items-center justify-center"
        title="Snabbanteckning (Ctrl+Shift+N)"
        aria-label="Snabbanteckning"
      >
        <Pencil className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" data-testid="quick-note-dialog">
          <DialogHeader>
            <DialogTitle className="font-serif-display text-2xl">Snabbanteckning</DialogTitle>
          </DialogHeader>
          {planner.students.length === 0 ? (
            <div className="text-sm text-[#656E67] py-4">
              Lägg till minst en elev i <a href="/installningar" className="underline text-[#3D5A45]">Inställningar</a> för att kunna skapa anteckningar.
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label className="text-xs uppercase tracking-widest text-[#656E67]">Elev</Label>
                <Select value={studentId} onValueChange={setStudentId}>
                  <SelectTrigger data-testid="quick-note-student-select" className="mt-1"><SelectValue placeholder="Välj elev" /></SelectTrigger>
                  <SelectContent>
                    {planner.students.map((s) => {
                      const klass = planner.classes.find((c) => c.id === s.classId);
                      return <SelectItem key={s.id} value={s.id}>{s.name}{klass ? ` · ${klass.name}` : ""}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-widest text-[#656E67]">Datum</Label>
                  <Input data-testid="quick-note-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
                </div>
                <div className="col-span-2">
                  <Label className="text-xs uppercase tracking-widest text-[#656E67]">Rubrik</Label>
                  <Input data-testid="quick-note-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Valfritt" className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest text-[#656E67]">Notering</Label>
                <Textarea data-testid="quick-note-body" rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="mt-1" placeholder="Skriv en snabb notering…" autoFocus />
              </div>
              {nearbyLessons.length > 0 && (
                <div>
                  <Label className="text-xs uppercase tracking-widest text-[#656E67]">Koppla till lektion (valfritt)</Label>
                  <Select value={linkedEventId || "none"} onValueChange={setLinkedEventId}>
                    <SelectTrigger data-testid="quick-note-lesson-select" className="mt-1"><SelectValue placeholder="Ingen" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Ingen koppling</SelectItem>
                      {nearbyLessons.map((e) => {
                        const subj = planner.subjects.find((s) => s.id === e.subjectId);
                        return (
                          <SelectItem key={e.id} value={e.id}>
                            {e.date} · {e.time} · {subj?.name || "Lektion"} – {e.title || "utan rubrik"}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="text-[11px] text-[#8A948C]">Tips: öppna med Ctrl+Shift+N från vilken sida som helst.</div>
            </div>
          )}
          {planner.students.length > 0 && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
              <Button data-testid="quick-note-save" onClick={save} className="bg-[#3D5A45] hover:bg-[#2F4736]">Spara</Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
