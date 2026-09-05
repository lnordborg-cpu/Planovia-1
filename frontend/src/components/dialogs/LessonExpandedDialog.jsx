import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { usePlanner } from "@/context/PlannerContext";
import { getSubjectColor, autoClassifyMaterial, WEEKDAYS } from "@/lib/constants";
import { formatDateLong, fromISODate } from "@/lib/dateUtils";
import { uploadFile, deleteFile } from "@/lib/api";
import { addMinutes, validateTimePair, formatTimeRange, DEFAULT_LESSON_MINUTES } from "@/lib/timeUtils";
import {
  Trash2, Link as LinkIcon, X, Paperclip, FileText, StickyNote, Eye, Loader2, Clock,
  Check, Pencil, Target, BookOpen, ListChecks, ClipboardList, GraduationCap, Award,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import MaterialPreview, { canPreview } from "@/components/dialogs/MaterialPreview";
import SeriesActionDialog from "@/components/dialogs/SeriesActionDialog";
import { describeRecurrence } from "@/lib/recurrence";

const PRINTABLE_RE = /\.(pdf|docx?|odt|pptx?|xlsx?|rtf|txt|png|jpe?g)(\?|#|$)/i;

// Inline auto-save text-area used in most sections. Saves the entire event on blur.
const AutoTextarea = ({ value, onChange, onBlur, placeholder, rows = 3, testId }) => (
  <Textarea
    data-testid={testId}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onBlur={onBlur}
    placeholder={placeholder}
    rows={rows}
    className="mt-1 bg-white/70 border-[#DEDAD2] resize-y focus-visible:ring-[#DFE9E2]"
  />
);

const Section = ({ icon: Icon, label, hint, children, testId }) => (
  <section className="pb-6 border-b border-[#EFEAE1] last:border-b-0" data-testid={testId}>
    <div className="flex items-center gap-2 mb-2">
      <div className="h-6 w-6 rounded-lg bg-[#F6F3EE] text-[#78817D] flex items-center justify-center">
        <Icon className="h-3.5 w-3.5" strokeWidth={1.75} />
      </div>
      <Label className="text-[11px] uppercase tracking-widest text-[#78817D] font-semibold">
        {label}
      </Label>
      {hint && <span className="text-[10px] text-[#A3A69F] ml-1">{hint}</span>}
    </div>
    {children}
  </section>
);

export default function LessonExpandedDialog({ open, onOpenChange, event }) {
  const planner = usePlanner();
  const isSeries = !!(event?.recurrence || event?._isSeriesOccurrence);
  const templateId = event?._seriesTemplateId || event?.id;
  const [seriesAction, setSeriesAction] = useState(null); // { mode: 'edit'|'delete', pending?: {...} }

  // Meta editing (title, date, class, subject, unit)
  const [metaEdit, setMetaEdit] = useState(false);
  const [meta, setMeta] = useState({});
  const [editingTime, setEditingTime] = useState(false);
  const [start, setStart] = useState("08:20");
  const [end, setEnd] = useState("09:20");
  const [timeError, setTimeError] = useState("");

  // Free-text section values (inline auto-saved on blur)
  const [goals, setGoals] = useState("");
  const [plan, setPlan] = useState("");
  const [notes, setNotes] = useState("");
  const [preparation, setPreparation] = useState("");
  const [homework, setHomework] = useState("");
  const [assessment, setAssessment] = useState("");
  // Meeting-only
  const [location, setLocation] = useState("");
  const [participants, setParticipants] = useState("");
  const [agenda, setAgenda] = useState("");
  const [decisions, setDecisions] = useState("");
  const [followupInput, setFollowupInput] = useState("");
  // Templates
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  // Material states
  const [matName, setMatName] = useState("");
  const [matUrl, setMatUrl] = useState("");
  const [confirmPrint, setConfirmPrint] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState(null);
  const fileInputRef = useRef(null);

  // Reset all local state when the event changes / dialog re-opens
  useEffect(() => {
    if (!event) return;
    setMeta({
      title: event.title || "",
      date: event.date || "",
      classId: event.classId || "",
      subjectId: event.subjectId || "",
      unitId: event.unitId || "",
    });
    setStart(event.time || "08:20");
    setEnd(event.endTime || addMinutes(event.time || "08:20", DEFAULT_LESSON_MINUTES));
    setGoals(event.goals || "");
    setPlan(event.plan || "");
    setNotes(event.notes || "");
    setPreparation(event.preparation || "");
    setHomework(event.homework || "");
    setAssessment(event.assessment || "");
    setLocation(event.location || "");
    setParticipants(event.participants || "");
    setAgenda(event.agenda || "");
    setDecisions(event.decisions || "");
    setFollowupInput("");
    setSavingTemplate(false);
    setTemplateName(event.title || "");
    setTimeError("");
    setMetaEdit(false);
    setEditingTime(false);
  }, [event?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard: Esc closes the panel
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === "Escape") onOpenChange(false); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onOpenChange]);

  if (!event || !open) return null;

  const subject = planner.subjects.find((s) => s.id === (metaEdit ? meta.subjectId : event.subjectId));
  const klass = planner.classes.find((c) => c.id === (metaEdit ? meta.classId : event.classId));
  const unit = planner.units.find((u) => u.id === event.unitId);
  const color = subject ? getSubjectColor(subject.colorId) : null;
  const linkedNotes = planner.studentNotes.filter((n) => n.linkedEventId === templateId);

  // ---- helpers ------------------------------------------------------------
  // For non-series events: patch directly. For series occurrences: prompt scope.
  const persist = (patch) => {
    if (isSeries) {
      // Free-text section auto-saves apply to the WHOLE series (they're shared metadata)
      const shareable = ["goals", "plan", "notes", "preparation", "homework", "assessment", "location", "participants", "agenda", "decisions"];
      const isShareable = Object.keys(patch).every((k) => shareable.includes(k));
      if (isShareable) {
        planner.updateEventInSeries(event, patch, "all");
        return;
      }
      // Otherwise open scope dialog with the pending patch
      setSeriesAction({ mode: "edit", patch });
      return;
    }
    planner.upsertEvent({ ...event, ...patch });
  };

  const persistDirect = (patch) => {
    // Used inside SeriesActionDialog handler where the scope is already decided.
    if (!isSeries) { planner.upsertEvent({ ...event, ...patch }); return; }
  };

  const saveTime = () => {
    const v = validateTimePair(start, end);
    if (!v.ok) { setTimeError(v.message); return; }
    setTimeError("");
    if (isSeries) {
      setSeriesAction({ mode: "edit", patch: { time: v.start, endTime: v.end } });
      return;
    }
    planner.upsertEvent({ ...event, time: v.start, endTime: v.end });
    setEditingTime(false);
    toast.success("Tid uppdaterad");
  };

  const saveMeta = () => {
    const patch = {
      title: meta.title.trim() || event.title,
      date: meta.date || event.date,
      classId: meta.classId || null,
      subjectId: meta.subjectId || null,
      unitId: meta.unitId || null,
    };
    if (isSeries) { setSeriesAction({ mode: "edit", patch }); return; }
    planner.upsertEvent({ ...event, ...patch });
    setMetaEdit(false);
    toast.success("Lektionen uppdaterad");
  };

  const remove = () => {
    if (isSeries) { setSeriesAction({ mode: "delete" }); return; }
    planner.deleteEvent(event.id);
    onOpenChange(false);
  };

  const applySeriesChoice = (scope) => {
    if (!seriesAction) return;
    if (seriesAction.mode === "delete") {
      planner.deleteEventInSeries(event, scope);
      toast.success("Mötesserien uppdaterad");
      setSeriesAction(null);
      onOpenChange(false);
      return;
    }
    // edit
    planner.updateEventInSeries(event, seriesAction.patch, scope);
    setEditingTime(false);
    setMetaEdit(false);
    setSeriesAction(null);
    toast.success(scope === "all" ? "Hela serien uppdaterad" : scope === "future" ? "Detta och framtida uppdaterade" : "Endast detta tillfälle uppdaterat");
    // Close panel because a virtual occurrence's ID has changed
    onOpenChange(false);
  };

  const addMaterial = () => {
    if (!matName.trim()) return;
    planner.addMaterialToEvent(templateId, { name: matName.trim(), url: matUrl.trim() });
    const isPdf = /\.pdf(\?|#|$)/i.test(matName.trim()) || /\.pdf(\?|#|$)/i.test(matUrl.trim());
    if (isPdf) setConfirmPrint({ name: matName.trim() });
    setMatName(""); setMatUrl("");
  };

  const handleFilesSelected = async (files) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const addedNames = [];
    for (const file of Array.from(files)) {
      try {
        if (file.size > 20 * 1024 * 1024) { toast.error(`${file.name} är för stor (max 20MB).`); continue; }
        const uploaded = await uploadFile(file);
        const subcategory = autoClassifyMaterial(file.name);
        planner.addMaterialToEvent(templateId, { ...uploaded, subjectId: event.subjectId || null, subcategory });
        addedNames.push(file.name);
      } catch (err) {
        toast.error(`Kunde inte ladda upp ${file.name}: ${err.message || ""}`);
      }
    }
    setUploading(false);
    addedNames.forEach((name) => {
      if (PRINTABLE_RE.test(name)) planner.addPrintTaskForMaterial(templateId, name, event.date);
    });
    if (addedNames.length > 0) {
      const printable = addedNames.filter((n) => PRINTABLE_RE.test(n)).length;
      toast.success(
        `${addedNames.length} fil${addedNames.length > 1 ? "er" : ""} bifogad${addedNames.length > 1 ? "e" : ""}${printable ? ` · ${printable} utskriftsuppgift${printable > 1 ? "er" : ""}` : ""}`,
      );
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMaterial = (id) => {
    const m = (event.materials || []).find((x) => x.id === id);
    if (m && m.fileId) deleteFile(m.fileId);
    planner.removeMaterialFromEvent(templateId, id);
  };

  const isMeeting = event?.type === "meeting";
  const isSamtal = event?.type === "utvecklingssamtal";
  const eventFollowups = planner.followups.filter((f) => f.linkedEventId === templateId);
  const templatesForSubject = (planner.lessonTemplates || []).filter(
    (t) => !t.subjectId || t.subjectId === event?.subjectId,
  );

  const saveAsTemplate = () => {
    if (!templateName.trim()) return;
    planner.addLessonTemplate({
      name: templateName.trim(),
      subjectId: event.subjectId || null,
      goals, plan, preparation, homework, assessment,
    });
    setSavingTemplate(false);
    toast.success("Sparat som mall");
  };

  const applyTemplate = (tplId) => {
    planner.applyLessonTemplate(templateId, tplId);
    const tpl = (planner.lessonTemplates || []).find((t) => t.id === tplId);
    if (tpl) {
      setGoals(tpl.goals || "");
      setPlan(tpl.plan || "");
      setPreparation(tpl.preparation || "");
      setHomework(tpl.homework || "");
      setAssessment(tpl.assessment || "");
    }
    toast.success("Mall tillämpad");
  };

  const addFollowup = () => {
    if (!followupInput.trim()) return;
    planner.addFollowup({
      description: followupInput.trim(),
      linkedEventId: templateId,
      linkedEventTitle: event.title,
      studentId: null,
      completed: false,
      priority: "normal",
    });
    setFollowupInput("");
    toast.success("Uppföljning tillagd");
  };

  // ---- render -------------------------------------------------------------
  return (
    <>
      {/* Backdrop – lets user close by clicking outside on desktop */}
      <div
        className="fixed inset-0 z-40 bg-[#293330]/25 backdrop-blur-[2px]"
        onClick={() => onOpenChange(false)}
        data-testid="lesson-expanded-backdrop"
      />

      <aside
        className="fixed top-0 right-0 z-50 h-full w-full md:w-[70vw] lg:w-[62vw] xl:w-[52vw] bg-[#FFFEFB] border-l border-[#DEDAD2] shadow-2xl overflow-y-auto"
        data-testid="lesson-expanded-dialog"
        role="dialog"
        aria-modal="true"
      >
        {/* Sticky header */}
        <header className="sticky top-0 z-10 bg-[#FFFEFB]/95 backdrop-blur border-b border-[#DEDAD2] px-6 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                {subject && (
                  <span className="text-[10px] uppercase tracking-widest px-2 py-1 rounded-md border font-semibold"
                    style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}>
                    {subject.name}
                  </span>
                )}
                {klass && <span className="text-xs text-[#78817D] font-medium">· {klass.name}</span>}
              </div>
              {!metaEdit ? (
                <h1 className="font-serif-display text-3xl mt-2 text-[#293330] leading-tight" data-testid="expanded-title">
                  {event.title || "Utan rubrik"}
                </h1>
              ) : (
                <Input
                  data-testid="expanded-title-input"
                  value={meta.title}
                  onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
                  className="mt-2 text-2xl font-serif-display border-[#DEDAD2] h-auto py-1.5"
                  placeholder="Rubrik"
                />
              )}
              <div className="mt-1 flex items-center gap-2 text-sm text-[#78817D] flex-wrap">
                <span>{formatDateLong(fromISODate(event.date))}</span>
                <span className="text-[#DEDAD2]">·</span>
                <span className="font-medium text-[#293330] tabular-nums">
                  {formatTimeRange(event.time, event.endTime)}
                </span>
                {event.recurrence && (
                  <span className="text-[10px] uppercase tracking-widest bg-[#F0F5FA] text-[#2C5282] border border-[#D6E4F0] px-2 py-0.5 rounded" data-testid="recurrence-badge">
                    ↻ {describeRecurrence(event.recurrence)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 rounded-lg text-[#78817D] hover:text-[#293330] hover:bg-[#F6F3EE]"
                data-testid="expanded-close-btn"
                aria-label="Stäng"
              ><X className="h-4 w-4" /></button>
              {!metaEdit ? (
                <div className="flex flex-col items-end gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMetaEdit(true)}
                    className="border-[#DEDAD2] text-[#293330]"
                    data-testid="expanded-edit-lesson-btn"
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1.5" /> {isMeeting ? "Redigera möte" : "Redigera lektion"}
                  </Button>
                  {!isMeeting && !isSamtal && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {templatesForSubject.length > 0 && (
                        <Select value="" onValueChange={applyTemplate}>
                          <SelectTrigger data-testid="template-picker" className="h-8 text-xs w-40 border-[#DEDAD2] bg-white">
                            <SelectValue placeholder="Använd mall…" />
                          </SelectTrigger>
                          <SelectContent>
                            {templatesForSubject.map((t) => (
                              <SelectItem key={t.id} value={t.id} data-testid={`template-item-${t.id}`}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSavingTemplate(true)}
                        className="border-[#DEDAD2] text-[#78817D] h-8 text-xs"
                        data-testid="template-save-btn"
                      >
                        <Sparkles className="h-3 w-3 mr-1" /> Spara som mall
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <Button size="sm" variant="ghost" onClick={() => setMetaEdit(false)} className="text-[#78817D]">Avbryt</Button>
                  <Button size="sm" onClick={saveMeta} className="bg-[#718A7F] hover:bg-[#5C7267]" data-testid="expanded-meta-save">
                    <Check className="h-3.5 w-3.5 mr-1" /> Spara
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Quick time control */}
          <div className="mt-4 rounded-xl border border-[#DEDAD2] bg-[#F6F3EE]/60 p-3">
            {!editingTime ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-[#293330]">
                  <Clock className="h-4 w-4 text-[#718A7F]" />
                  <span className="font-medium tabular-nums">{formatTimeRange(event.time, event.endTime)}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setEditingTime(true)} className="text-[#78817D] hover:text-[#293330]" data-testid="expanded-edit-time-btn">
                  Ändra tid
                </Button>
              </div>
            ) : (
              <div className="space-y-2" data-testid="expanded-time-editor">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] uppercase tracking-widest text-[#78817D]">Starttid</Label>
                    <Input data-testid="expanded-start-input" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1" />
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-widest text-[#78817D]">Sluttid</Label>
                    <Input data-testid="expanded-end-input" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1" />
                  </div>
                </div>
                {timeError && <div className="text-xs text-[#9E4A3B]" data-testid="expanded-time-error">{timeError}</div>}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setEditingTime(false); setTimeError(""); }} className="border-[#DEDAD2]">Avbryt</Button>
                  <Button size="sm" onClick={saveTime} className="bg-[#718A7F] hover:bg-[#5C7267]" data-testid="expanded-time-save">
                    <Check className="h-3.5 w-3.5 mr-1" /> Spara tid
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Meta editor: date · class · subject · unit */}
          {metaEdit && (
            <div className="mt-3 grid grid-cols-2 gap-3" data-testid="expanded-meta-editor">
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-[#78817D]">Datum</Label>
                <Input
                  data-testid="expanded-date-input"
                  type="date"
                  value={meta.date}
                  onChange={(e) => setMeta((m) => ({ ...m, date: e.target.value }))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-[#78817D]">Klass</Label>
                <Select value={meta.classId} onValueChange={(v) => setMeta((m) => ({ ...m, classId: v }))}>
                  <SelectTrigger data-testid="expanded-class-select" className="mt-1"><SelectValue placeholder="Välj klass" /></SelectTrigger>
                  <SelectContent>
                    {planner.classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-[#78817D]">Ämne</Label>
                <Select value={meta.subjectId} onValueChange={(v) => setMeta((m) => ({ ...m, subjectId: v }))}>
                  <SelectTrigger data-testid="expanded-subject-select" className="mt-1"><SelectValue placeholder="Välj ämne" /></SelectTrigger>
                  <SelectContent>
                    {planner.subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-[#78817D]">Arbetsområde</Label>
                <Select value={meta.unitId || "none"} onValueChange={(v) => setMeta((m) => ({ ...m, unitId: v === "none" ? "" : v }))}>
                  <SelectTrigger data-testid="expanded-unit-select" className="mt-1"><SelectValue placeholder="Inget" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Inget</SelectItem>
                    {planner.units.map((u) => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </header>

        {/* Sections */}
        <div className="px-6 py-6 space-y-6">
          {!isMeeting && (
            <>
              <Section icon={BookOpen} label="Arbetsområde" testId="section-unit">
                {unit ? (
                  <div className="text-sm bg-[#F6F2FB] border border-[#E2D5F3] rounded-lg px-3 py-2 text-[#293330]">
                    <div className="font-semibold">{unit.title}</div>
                    {unit.description && <div className="text-[#78817D] text-xs mt-0.5">{unit.description}</div>}
                  </div>
                ) : (
                  <div className="text-xs text-[#A3A69F]">Inget arbetsområde kopplat. Klicka "Redigera lektion" för att koppla ett.</div>
                )}
              </Section>

              <Section icon={Target} label="Mål" hint="Vad ska eleverna lära sig?" testId="section-goals">
                <AutoTextarea
                  testId="expanded-goals"
                  value={goals}
                  onChange={setGoals}
                  onBlur={() => persist({ goals })}
                  placeholder="T.ex. Kunna beräkna procent av ett tal…"
                  rows={2}
                />
              </Section>

              <Section icon={ListChecks} label="Lektionsplan" hint="Start · genomgång · aktivitet · exit ticket" testId="section-plan">
                <AutoTextarea
                  testId="expanded-plan"
                  value={plan}
                  onChange={setPlan}
                  onBlur={() => persist({ plan })}
                  placeholder={`1. Repetition från förra lektionen\n2. Genomgång – bråkform till decimalform\n3. Elevaktivitet – arbeta i par\n4. Exit ticket`}
                  rows={5}
                />
              </Section>
            </>
          )}

          {isMeeting && (
            <>
              <Section icon={Target} label="Möteskategori & plats" testId="section-meeting-meta">
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    data-testid="meeting-meta-type"
                    value={event.meetingType || ""}
                    onChange={(e) => planner.upsertEvent({ ...event, meetingType: e.target.value })}
                    placeholder="T.ex. Arbetslagsmöte"
                    className="bg-white/70"
                  />
                  <Input
                    data-testid="meeting-meta-location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    onBlur={() => persist({ location })}
                    placeholder="Plats (t.ex. Personalrum)"
                    className="bg-white/70"
                  />
                </div>
              </Section>

              <Section icon={ListChecks} label="Deltagare" testId="section-participants">
                <AutoTextarea
                  testId="expanded-participants"
                  value={participants}
                  onChange={setParticipants}
                  onBlur={() => persist({ participants })}
                  placeholder="Namn, roller eller lag"
                  rows={2}
                />
              </Section>

              <Section icon={BookOpen} label="Agenda" testId="section-agenda">
                <AutoTextarea
                  testId="expanded-agenda"
                  value={agenda}
                  onChange={setAgenda}
                  onBlur={() => persist({ agenda })}
                  placeholder={`1. Uppföljning från förra mötet\n2. Punkt X\n3. Övrigt`}
                  rows={4}
                />
              </Section>
            </>
          )}

          <Section icon={Pencil} label="Anteckningar" testId="section-notes">
            <AutoTextarea
              testId="expanded-notes"
              value={notes}
              onChange={setNotes}
              onBlur={() => persist({ notes })}
              placeholder="Privata anteckningar om lektionen…"
              rows={3}
            />
          </Section>

          <Section icon={FileText} label="Material" testId="section-materials">
            <div className="space-y-2">
              {(event.materials || []).length === 0 && (
                <div className="text-xs text-[#A3A69F]">Inga material tillagda.</div>
              )}
              {(event.materials || []).map((m) => {
                const previewable = canPreview(m);
                return (
                  <div key={m.id} className="flex items-center gap-2 text-sm bg-white border border-[#DEDAD2] rounded-lg px-3 py-1.5" data-testid={`material-${m.id}`}>
                    {m.isFile ? <FileText className="h-3.5 w-3.5 text-[#718A7F]" /> : <LinkIcon className="h-3.5 w-3.5 text-[#78817D]" />}
                    {previewable && m.url ? (
                      <button
                        onClick={() => setPreviewMaterial(m)}
                        className="text-[#718A7F] underline underline-offset-2 flex-1 truncate text-left hover:text-[#5C7267]"
                        data-testid={`material-preview-${m.id}`}
                      >{m.name}</button>
                    ) : m.url ? (
                      <a href={m.url} download={m.isFile ? m.name : undefined} target="_blank" rel="noreferrer" className="text-[#718A7F] underline underline-offset-2 flex-1 truncate">{m.name}</a>
                    ) : (
                      <span className="flex-1 truncate">{m.name}</span>
                    )}
                    {previewable && m.url && (
                      <button
                        onClick={() => setPreviewMaterial(m)}
                        className="text-[#78817D] hover:text-[#718A7F] p-1 rounded hover:bg-[#F6F3EE]"
                        title="Förhandsgranska"
                        data-testid={`material-preview-btn-${m.id}`}
                      ><Eye className="h-3.5 w-3.5" /></button>
                    )}
                    {m.isFile && m.size && (
                      <span className="text-[10px] text-[#A3A69F] tabular-nums">{Math.round(m.size / 1024)} kB</span>
                    )}
                    <button onClick={() => removeMaterial(m.id)} className="text-[#A3A69F] hover:text-[#9E4A3B]" data-testid={`material-remove-${m.id}`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
              <div className="grid grid-cols-5 gap-2 pt-1">
                <Input data-testid="material-name-input" value={matName} onChange={(e) => setMatName(e.target.value)} placeholder="Namn på material" className="col-span-2" />
                <Input data-testid="material-url-input" value={matUrl} onChange={(e) => setMatUrl(e.target.value)} placeholder="Länk (valfri)" className="col-span-2" />
                <Button data-testid="material-add-btn" onClick={addMaterial} className="bg-[#718A7F] hover:bg-[#5C7267]">Lägg till</Button>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  data-testid="material-file-input"
                  onChange={(e) => handleFilesSelected(e.target.files)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="border-[#DEDAD2] text-[#718A7F] hover:bg-[#DFE9E2]"
                  data-testid="material-file-btn"
                >
                  {uploading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Laddar upp…</>
                  ) : (
                    <><Paperclip className="h-4 w-4 mr-2" /> Bifoga fil…</>
                  )}
                </Button>
                <span className="text-[11px] text-[#A3A69F]">Skapar automatiskt "Skriv ut"-uppgift för utskriftsbara filer.</span>
              </div>
            </div>
          </Section>

          <Section icon={ClipboardList} label="Förberedelser" hint="Vad behöver du fixa innan?" testId="section-preparation">
            <AutoTextarea
              testId="expanded-preparation"
              value={preparation}
              onChange={setPreparation}
              onBlur={() => persist({ preparation })}
              placeholder="T.ex. Skriv ut arbetsblad, förbered laborationsmaterial…"
              rows={2}
            />
          </Section>

          {!isMeeting && (
            <>
              <Section icon={GraduationCap} label="Läxa" testId="section-homework">
                <AutoTextarea
                  testId="expanded-homework"
                  value={homework}
                  onChange={setHomework}
                  onBlur={() => persist({ homework })}
                  placeholder="T.ex. Uppgift 12–17 till nästa gång"
                  rows={2}
                />
              </Section>

              <Section icon={Award} label="Bedömning" testId="section-assessment">
                <AutoTextarea
                  testId="expanded-assessment"
                  value={assessment}
                  onChange={setAssessment}
                  onBlur={() => persist({ assessment })}
                  placeholder="T.ex. Formativ – exit ticket. Betygsstöd Ma7.C.1"
                  rows={2}
                />
              </Section>
            </>
          )}

          {isMeeting && (
            <>
              <Section icon={Award} label="Beslut" hint="Vad landade mötet i?" testId="section-decisions">
                <AutoTextarea
                  testId="expanded-decisions"
                  value={decisions}
                  onChange={setDecisions}
                  onBlur={() => persist({ decisions })}
                  placeholder="Punkter som beslutades under mötet."
                  rows={3}
                />
              </Section>

              <Section icon={GraduationCap} label="Uppföljningar" testId="section-followups">
                <div className="space-y-2">
                  {eventFollowups.length === 0 && (
                    <div className="text-xs text-[#A3A69F]">Inga uppföljningar kopplade.</div>
                  )}
                  {eventFollowups.map((f) => (
                    <div key={f.id} className={`flex items-start gap-2 rounded-lg border border-[#DEDAD2] bg-white px-3 py-1.5 ${f.completed ? "opacity-60" : ""}`} data-testid={`meeting-followup-${f.id}`}>
                      <Checkbox checked={!!f.completed} onCheckedChange={() => planner.toggleFollowupCompleted(f.id)} />
                      <span className="text-sm flex-1 text-[#293330]">{f.description}</span>
                      <button onClick={() => planner.deleteFollowup(f.id)} className="text-[#A3A69F] hover:text-[#9E4A3B]">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      data-testid="followup-input"
                      value={followupInput}
                      onChange={(e) => setFollowupInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addFollowup()}
                      placeholder="Ny uppföljning…"
                      className="flex-1"
                    />
                    <Button onClick={addFollowup} className="bg-[#718A7F] hover:bg-[#5C7267]" data-testid="followup-add-btn">Lägg till</Button>
                  </div>
                </div>
              </Section>
            </>
          )}

          {linkedNotes.length > 0 && (
            <Section icon={StickyNote} label="Elevnoteringar från denna lektion" testId="linked-notes-section">
              <div className="space-y-1.5">
                {linkedNotes.map((n) => {
                  const s = planner.students.find((x) => x.id === n.studentId);
                  return (
                    <div key={n.id} className="text-sm bg-[#FEF8EC] border border-[#F9E8C7] rounded-lg px-3 py-2" data-testid={`linked-note-${n.id}`}>
                      <div className="text-xs text-[#8C5E14] font-semibold">{s?.name || "Elev"} · {formatDateLong(fromISODate(n.date))}</div>
                      {n.title && <div className="text-sm font-semibold text-[#293330]">{n.title}</div>}
                      {n.note && <div className="text-sm text-[#78817D] whitespace-pre-wrap">{n.note}</div>}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          <Section icon={Sparkles} label="Status" testId="section-status">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-[#293330]">
                <Checkbox
                  data-testid="expanded-completed"
                  checked={!!event.completed}
                  onCheckedChange={() => planner.toggleEventCompleted(templateId)}
                />
                Genomförd
              </label>
              <Button
                variant="ghost"
                onClick={remove}
                className="text-[#9E4A3B] hover:text-[#7A3627] hover:bg-[#FDF2F0]"
                data-testid="expanded-delete"
              ><Trash2 className="h-4 w-4 mr-1" /> Ta bort</Button>
            </div>
          </Section>
        </div>
      </aside>

      <MaterialPreview material={previewMaterial} onOpenChange={(v) => !v && setPreviewMaterial(null)} />

      <SeriesActionDialog
        open={!!seriesAction}
        onOpenChange={(v) => !v && setSeriesAction(null)}
        mode={seriesAction?.mode}
        onChoose={applySeriesChoice}
      />

      <AlertDialog open={savingTemplate} onOpenChange={(v) => !v && setSavingTemplate(false)}>
        <AlertDialogContent data-testid="template-save-dialog" className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif-display">Spara som lektionsmall</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[#78817D]">
              Sparar mål, plan, förberedelser, läxa och bedömning som en mall du kan återanvända i {planner.subjects.find((s) => s.id === event?.subjectId)?.name || "detta ämne"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="mt-2">
            <Label className="text-[10px] uppercase tracking-widest text-[#78817D]">Namn på mall</Label>
            <Input
              data-testid="template-name-input"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="mt-1"
              placeholder="T.ex. Grundlektion Matematik"
              autoFocus
            />
          </div>
          <AlertDialogFooter className="mt-3">
            <AlertDialogCancel data-testid="template-cancel">Avbryt</AlertDialogCancel>
            <AlertDialogAction
              data-testid="template-confirm"
              onClick={saveAsTemplate}
              className="bg-[#718A7F] hover:bg-[#5C7267]"
              disabled={!templateName.trim()}
            >Spara mall</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmPrint} onOpenChange={(v) => !v && setConfirmPrint(null)}>
        <AlertDialogContent data-testid="print-confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Behöver detta skrivas ut?</AlertDialogTitle>
            <AlertDialogDescription>
              Vi kan lägga till en uppgift "Skriv ut {confirmPrint?.name}" i Att göra med lektionens datum som deadline.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="print-cancel">Nej tack</AlertDialogCancel>
            <AlertDialogAction
              data-testid="print-confirm"
              onClick={() => {
                planner.addPrintTaskForMaterial(templateId, confirmPrint.name, event.date);
                setConfirmPrint(null);
              }}
              className="bg-[#718A7F] hover:bg-[#5C7267]"
            >Ja, lägg till</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
