import React, { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usePlanner } from "@/context/PlannerContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Search, User, Check, Circle, FileDown } from "lucide-react";
import { formatDateLong, fromISODate, todayISO } from "@/lib/dateUtils";
import { ClassDot } from "@/components/ClassDot";
import { toast } from "sonner";

export default function Elevkort() {
  const { studentId: routeId } = useParams();
  const navigate = useNavigate();
  const planner = usePlanner();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return planner.students.filter((s) => !q || s.name.toLowerCase().includes(q));
  }, [planner.students, query]);

  const selected = planner.students.find((s) => s.id === routeId) || filtered[0] || null;

  useEffect(() => {
    if (!routeId && selected) navigate(`/elever/${selected.id}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId, selected?.id]);

  return (
    <div className="space-y-6" data-testid="page-elever">
      <header>
        <div className="text-[11px] tracking-[0.2em] uppercase text-[#8A948C] font-semibold">Elevkort</div>
        <h1 className="font-serif-display text-4xl mt-1 text-[#2D312E]">Elever</h1>
      </header>

      {planner.students.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E6E1DA] p-10 text-center text-sm text-[#8A948C]">
          Inga elever ännu. Lägg till elever i <a href="/installningar" className="underline">Inställningar</a>.
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-6">
          <aside className="col-span-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A948C]" />
              <Input data-testid="student-search-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sök elev" className="pl-9 bg-white border-[#E6E1DA]" />
            </div>
            <div className="space-y-1 max-h-[70vh] overflow-y-auto">
              {filtered.map((s) => {
                const klass = planner.classes.find((c) => c.id === s.classId);
                const isActive = selected?.id === s.id;
                return (
                  <button
                    key={s.id}
                    data-testid={`student-item-${s.id}`}
                    onClick={() => navigate(`/elever/${s.id}`)}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-xl border ${isActive ? "border-[#3D5A45] bg-white" : "border-[#E6E1DA] bg-white hover:bg-[#FAF7F2]"}`}
                  >
                    <div className="h-8 w-8 rounded-full bg-[#F3EFEA] flex items-center justify-center text-[#656E67] text-xs font-semibold">
                      {s.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#2D312E] truncate">{s.name}</div>
                      <div className="text-xs text-[#8A948C] flex items-center gap-1">
                        <ClassDot colorId={klass?.colorId} size={7} />
                        {klass?.name}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="col-span-8">
            {selected ? <StudentProfile student={selected} planner={planner} /> : (
              <div className="text-sm text-[#8A948C]">Välj en elev.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const StudentProfile = ({ student, planner }) => {
  const klass = planner.classes.find((c) => c.id === student.classId);
  const [tab, setTab] = useState("notiser");
  return (
    <Card className="border-[#E6E1DA] shadow-none bg-white" data-testid={`student-profile-${student.id}`}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-14 w-14 rounded-2xl bg-[#EAF0EC] flex items-center justify-center text-[#3D5A45] text-lg font-semibold">
            {student.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="font-serif-display text-3xl text-[#2D312E]">{student.name}</h2>
            <div className="text-sm text-[#656E67] flex items-center gap-1.5">
              <ClassDot colorId={klass?.colorId} size={8} />
              {klass?.name}
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-[#F3EFEA] rounded-xl">
            <TabsTrigger data-testid="tab-notiser" value="notiser">Dagliga notiser</TabsTrigger>
            <TabsTrigger data-testid="tab-moten" value="moten">Mötesanteckningar</TabsTrigger>
            <TabsTrigger data-testid="tab-anpassningar" value="anpassningar">Anpassningar</TabsTrigger>
            <TabsTrigger data-testid="tab-stod" value="stod">Behov & stöd</TabsTrigger>
            <TabsTrigger data-testid="tab-uppfoljning" value="uppfoljning">Uppföljning</TabsTrigger>
          </TabsList>

          <TabsContent value="notiser"><NotiserTab student={student} planner={planner} /></TabsContent>
          <TabsContent value="moten"><MotenTab student={student} planner={planner} /></TabsContent>
          <TabsContent value="anpassningar"><FreeTextTab studentId={student.id} value={planner.studentAdaptations[student.id] || ""} onSave={(v) => planner.setStudentAdaptation(student.id, v)} placeholder="Beskriv anpassningar…" testId="adaptations" /></TabsContent>
          <TabsContent value="stod"><FreeTextTab studentId={student.id} value={planner.studentSupport[student.id] || ""} onSave={(v) => planner.setStudentSupport(student.id, v)} placeholder="Beskriv behov och stöd…" testId="support" /></TabsContent>
          <TabsContent value="uppfoljning"><UppfoljningTab student={student} planner={planner} /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const NotiserTab = ({ student, planner }) => {
  const [date, setDate] = useState(todayISO());
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const notes = planner.studentNotes.filter((n) => n.studentId === student.id).sort((a, b) => b.date.localeCompare(a.date));

  const save = () => {
    if (!title.trim() && !note.trim()) return;
    planner.addStudentNote({ studentId: student.id, date, title: title.trim(), note: note.trim() });
    setTitle(""); setNote(""); toast.success("Anteckning tillagd");
  };

  return (
    <div className="pt-4 space-y-4">
      <div className="rounded-xl border border-[#E6E1DA] p-3 bg-[#FAF7F2] space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="note-date-input" />
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Rubrik" className="col-span-2" data-testid="note-title-input" />
        </div>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Notering" data-testid="note-body-input" />
        <div className="flex justify-end"><Button data-testid="note-add-btn" onClick={save} className="bg-[#3D5A45] hover:bg-[#2F4736]"><Plus className="h-4 w-4 mr-1" />Lägg till</Button></div>
      </div>
      {notes.length === 0 ? <div className="text-sm text-[#8A948C]">Inga notiser ännu.</div> :
        notes.map((n) => (
          <div key={n.id} className="rounded-xl border border-[#E6E1DA] p-3 bg-white" data-testid={`note-${n.id}`}>
            <div className="flex items-center justify-between">
              <div className="text-xs text-[#8A948C]">{formatDateLong(fromISODate(n.date))}</div>
              <button onClick={() => planner.deleteStudentNote(n.id)} className="text-[#8A948C] hover:text-[#9E4A3B]"><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
            {n.title && <div className="text-sm font-semibold mt-1">{n.title}</div>}
            {n.note && <div className="text-sm text-[#656E67] whitespace-pre-wrap">{n.note}</div>}
          </div>
        ))
      }
    </div>
  );
};

const MotenTab = ({ student, planner }) => {
  const [date, setDate] = useState(todayISO());
  const [meetingType, setMeetingType] = useState("");
  const [participants, setParticipants] = useState("");
  const [notes, setNotes] = useState("");
  const [selected, setSelected] = useState({});

  const templates = planner.meetingTemplates || [];
  const applyTemplate = (id) => {
    if (id === "none") return;
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    if (t.meetingType) setMeetingType(t.meetingType);
    if (t.participants) setParticipants(t.participants);
    if (t.notes) setNotes(t.notes);
    toast.success(`Mall "${t.name}" applicerad`);
  };

  // Include utvecklingssamtal events for this student
  const eventsAsMeetings = planner.events
    .filter((e) => e.type === "utvecklingssamtal" && e.studentId === student.id)
    .map((e) => ({ id: `ev-${e.id}`, eventId: e.id, date: e.date, meetingType: "Utvecklingssamtal", participants: e.participants, notes: e.notes, fromEvent: true }));
  const manualMeetings = planner.meetingNotes.filter((n) => n.studentId === student.id).map((n) => ({ ...n, fromEvent: false }));
  const combined = [...eventsAsMeetings, ...manualMeetings].sort((a, b) => b.date.localeCompare(a.date));

  const save = () => {
    if (!meetingType.trim() && !notes.trim()) return;
    planner.addMeetingNote({ studentId: student.id, date, meetingType: meetingType.trim(), participants: participants.trim(), notes: notes.trim() });
    setMeetingType(""); setParticipants(""); setNotes("");
    toast.success("Mötesanteckning tillagd");
  };

  const toggleSelected = (id) => setSelected((s) => ({ ...s, [id]: !s[id] }));
  const selectedItems = combined.filter((m) => selected[m.id]);

  const exportSelected = () => {
    if (selectedItems.length === 0) { toast.info("Välj minst en anteckning att exportera."); return; }
    const klass = planner.classes.find((c) => c.id === student.classId);
    const html = `<!doctype html>
<html lang="sv"><head><meta charset="utf-8"><title>Mötesanteckningar – ${student.name}</title>
<style>
  @page { size: A4; margin: 20mm; }
  body { font-family: 'Plus Jakarta Sans', -apple-system, sans-serif; color: #2D312E; line-height: 1.5; }
  h1 { font-family: 'Fraunces', Georgia, serif; font-size: 28px; margin: 0 0 4px; }
  .sub { color: #656E67; font-size: 13px; margin-bottom: 24px; }
  .meta { color: #8A948C; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 24px; }
  .note { border: 1px solid #E6E1DA; border-radius: 12px; padding: 16px 20px; margin-bottom: 12px; page-break-inside: avoid; }
  .note .head { font-size: 12px; color: #656E67; font-weight: 600; margin-bottom: 6px; }
  .note .type { display: inline-block; padding: 2px 8px; border-radius: 4px; background: #EFF5F0; color: #2D5A3A; font-size: 11px; font-weight: 600; margin-right: 8px; }
  .note .participants { font-size: 12px; color: #656E67; margin: 4px 0; }
  .note .body { font-size: 13px; white-space: pre-wrap; margin-top: 8px; }
  .footer { color: #8A948C; font-size: 11px; margin-top: 32px; border-top: 1px solid #E6E1DA; padding-top: 12px; }
</style></head><body>
  <div class="meta">Planova – Mötesanteckningar</div>
  <h1>${student.name}</h1>
  <div class="sub">${klass?.name || ""}${klass?.name ? " · " : ""}Utskrivet ${new Date().toLocaleDateString("sv-SE")}</div>
  ${selectedItems.map((m) => `
    <div class="note">
      <div class="head">
        <span class="type">${(m.meetingType || "Möte").replace(/</g, "&lt;")}</span>
        ${new Date(m.date + "T00:00:00").toLocaleDateString("sv-SE", { day: "numeric", month: "long", year: "numeric" })}
      </div>
      ${m.participants ? `<div class="participants"><strong>Deltagare:</strong> ${m.participants.replace(/</g, "&lt;")}</div>` : ""}
      ${m.notes ? `<div class="body">${m.notes.replace(/</g, "&lt;")}</div>` : ""}
    </div>
  `).join("")}
  <div class="footer">Sammanställt via Planova. Denna sammanställning kan sparas som PDF från utskriftsdialogen.</div>
</body></html>`;
    const win = window.open("", "_blank", "width=900,height=1100");
    if (!win) { toast.error("Popup blockerades av webbläsaren."); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 400);
  };

  return (
    <div className="pt-4 space-y-4">
      <div className="rounded-xl border border-[#E6E1DA] p-3 bg-[#FAF7F2] space-y-2">
        {templates.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-[#8A948C] font-semibold">Mall</span>
            <Select value="none" onValueChange={applyTemplate}>
              <SelectTrigger data-testid="mtg-template-select" className="h-8 bg-white text-xs w-56">
                <SelectValue placeholder="Välj mall att fylla i…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— välj —</SelectItem>
                {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <a href="/installningar" className="text-[11px] text-[#3D5A45] hover:underline ml-auto">Hantera mallar</a>
          </div>
        )}
        <div className="grid grid-cols-3 gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} data-testid="mtg-date-input" />
          <Input value={meetingType} onChange={(e) => setMeetingType(e.target.value)} placeholder="Typ av möte" data-testid="mtg-type-input" />
          <Input value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="Deltagare" data-testid="mtg-part-input" />
        </div>
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anteckningar" data-testid="mtg-notes-input" />
        <div className="flex justify-end"><Button data-testid="mtg-add-btn" onClick={save} className="bg-[#3D5A45] hover:bg-[#2F4736]"><Plus className="h-4 w-4 mr-1" />Lägg till</Button></div>
      </div>

      {combined.length > 0 && (
        <div className="flex items-center justify-between text-xs text-[#656E67]" data-testid="mtg-export-bar">
          <span>{selectedItems.length > 0 ? `${selectedItems.length} anteckning${selectedItems.length > 1 ? "ar" : ""} valda` : "Kryssa i för att exportera som PDF till vårdnadshavare"}</span>
          <Button data-testid="mtg-export-btn" size="sm" variant="outline" className="border-[#E6E1DA]" disabled={selectedItems.length === 0} onClick={exportSelected}>
            <FileDown className="h-3.5 w-3.5 mr-1" /> Exportera som PDF
          </Button>
        </div>
      )}

      {combined.length === 0 ? <div className="text-sm text-[#8A948C]">Inga möten ännu.</div> :
        combined.map((m) => (
          <div key={m.id} className="rounded-xl border border-[#E6E1DA] p-3 bg-white flex gap-3" data-testid={`mtg-${m.id}`}>
            <input
              type="checkbox"
              checked={!!selected[m.id]}
              onChange={() => toggleSelected(m.id)}
              className="mt-1 h-4 w-4 accent-[#3D5A45]"
              data-testid={`mtg-select-${m.id}`}
              aria-label="Välj för export"
            />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div className="text-xs text-[#8A948C]">{formatDateLong(fromISODate(m.date))} · {m.meetingType || "Möte"}</div>
                {!m.fromEvent && (
                  <button onClick={() => planner.deleteMeetingNote(m.id)} className="text-[#8A948C] hover:text-[#9E4A3B]"><Trash2 className="h-3.5 w-3.5" /></button>
                )}
              </div>
              {m.participants && <div className="text-xs text-[#656E67] mt-1">Deltagare: {m.participants}</div>}
              {m.notes && <div className="text-sm text-[#656E67] whitespace-pre-wrap mt-1">{m.notes}</div>}
              {m.fromEvent && <div className="text-[10px] text-[#8A948C] mt-2">Från utvecklingssamtal i veckoplaneringen</div>}
            </div>
          </div>
        ))
      }
    </div>
  );
};

const FreeTextTab = ({ studentId, value, onSave, placeholder, testId }) => {
  const [text, setText] = useState(value);
  useEffect(() => { setText(value); }, [studentId, value]);
  return (
    <div className="pt-4 space-y-3">
      <Textarea rows={8} value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} onBlur={() => onSave(text)} data-testid={`${testId}-textarea`} className="bg-white" />
      <div className="text-xs text-[#8A948C]">Sparas automatiskt när du klickar utanför fältet.</div>
    </div>
  );
};

const UppfoljningTab = ({ student, planner }) => {
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(todayISO());
  const followups = planner.followups.filter((f) => f.studentId === student.id).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const save = () => {
    if (!description.trim() || !dueDate) return;
    planner.addFollowup({ studentId: student.id, description: description.trim(), dueDate });
    setDescription("");
    toast.success("Uppföljning skapad – syns även i Att göra & Veckoplanering");
  };

  return (
    <div className="pt-4 space-y-4">
      <div className="rounded-xl border border-[#E6E1DA] p-3 bg-[#FAF7F2] space-y-2">
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Beskriv uppföljningen…" data-testid="followup-desc-input" />
        <div className="grid grid-cols-3 gap-2">
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} data-testid="followup-due-input" />
          <div />
          <Button data-testid="followup-add-btn" onClick={save} className="bg-[#3D5A45] hover:bg-[#2F4736]"><Plus className="h-4 w-4 mr-1" />Lägg till</Button>
        </div>
      </div>
      {followups.length === 0 ? <div className="text-sm text-[#8A948C]">Inga uppföljningar ännu.</div> :
        followups.map((f) => (
          <div key={f.id} className="rounded-xl border border-[#E6E1DA] p-3 bg-white flex items-start gap-3" data-testid={`followup-row-${f.id}`}>
            <button onClick={() => planner.toggleFollowupCompleted(f.id)} className="mt-0.5" data-testid={`followup-toggle-${f.id}`}>
              {f.completed ? <Check className="h-4 w-4 text-[#3D5A45]" /> : <Circle className="h-4 w-4 text-[#8A948C]" />}
            </button>
            <div className="flex-1">
              <div className={`text-sm ${f.completed ? "line-through text-[#8A948C]" : ""}`}>{f.description}</div>
              <div className="text-xs text-[#8A948C] mt-1">Deadline: {formatDateLong(fromISODate(f.dueDate))}</div>
            </div>
            <button onClick={() => planner.deleteFollowup(f.id)} className="text-[#8A948C] hover:text-[#9E4A3B]" data-testid={`followup-delete-${f.id}`}>
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))
      }
    </div>
  );
};
