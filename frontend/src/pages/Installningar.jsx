import React, { useState } from "react";
import { usePlanner } from "@/context/PlannerContext";
import { SUBJECT_COLORS, CLASS_COLORS, WEEKDAYS, getSubjectColor, getClassColor } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, Plus, Download, Upload, RotateCcw } from "lucide-react";
import { toast } from "sonner";

const Section = ({ title, description, children, testId }) => (
  <Card className="border-[#DEDAD2] shadow-none bg-white" data-testid={testId}>
    <CardContent className="p-6">
      <div className="mb-4">
        <h2 className="font-serif-display text-xl text-[#293330]">{title}</h2>
        {description && <p className="text-sm text-[#78817D] mt-1">{description}</p>}
      </div>
      {children}
    </CardContent>
  </Card>
);

export default function Installningar() {
  const planner = usePlanner();

  return (
    <div className="space-y-6" data-testid="page-installningar">
      <header>
        <div className="text-[11px] tracking-[0.2em] uppercase text-[#A3A69F] font-semibold">Inställningar</div>
        <h1 className="font-serif-display text-4xl mt-1 text-[#293330]">Hantera din planerare</h1>
      </header>

      <ProfileSection planner={planner} />
      <ClassesSection planner={planner} />
      <SubjectsSection planner={planner} />
      <StudentsSection planner={planner} />
      <TimetableSection planner={planner} />
      <MeetingTemplatesSection planner={planner} />
      <BackupSection planner={planner} />
    </div>
  );
}

const ProfileSection = ({ planner }) => {
  const [name, setName] = useState(planner.userName || "");
  React.useEffect(() => { setName(planner.userName || ""); }, [planner.userName]);
  const save = () => {
    planner.setUserName(name);
    toast.success(name.trim() ? `Trevligt att se dig, ${name.trim()}` : "Namn borttaget");
  };
  return (
    <Section title="Din profil" description="Ditt namn används för hälsningen på Översikt." testId="section-profile">
      <div className="flex flex-wrap gap-2 items-center">
        <Input
          data-testid="profile-name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="T.ex. Louise"
          className="max-w-xs"
          onKeyDown={(e) => e.key === "Enter" && save()}
        />
        <Button data-testid="profile-name-save" onClick={save} className="bg-[#718A7F] hover:bg-[#5C7267]">Spara</Button>
      </div>
    </Section>
  );
};

const ClassesSection = ({ planner }) => {
  const [name, setName] = useState("");
  const [colorId, setColorId] = useState(CLASS_COLORS[0].id);
  return (
    <Section title="Klasser" description="Skapa de klasser du undervisar och ge dem gärna en egen accentfärg." testId="section-classes">
      <div className="flex gap-2 mb-4 flex-wrap">
        <Input data-testid="class-name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="T.ex. 6A" className="flex-1 min-w-[200px]" />
        <Select value={colorId} onValueChange={setColorId}>
          <SelectTrigger data-testid="class-color-select" className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CLASS_COLORS.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }} />
                  {c.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          data-testid="class-add-btn"
          onClick={() => { if (name.trim()) { planner.addClass(name, colorId); setName(""); toast.success("Klass tillagd"); } }}
          className="bg-[#718A7F] hover:bg-[#5C7267]"
        ><Plus className="h-4 w-4 mr-1" /> Lägg till</Button>
      </div>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
        {planner.classes.length === 0 && <div className="text-sm text-[#A3A69F]">Inga klasser tillagda ännu.</div>}
        {planner.classes.map((c) => {
          const col = getClassColor(c.colorId);
          return (
            <div key={c.id} className="flex items-center justify-between rounded-lg border border-[#DEDAD2] px-3 py-2 bg-[#FFFEFB]" data-testid={`class-row-${c.id}`}>
              <div className="flex items-center gap-2">
                {col && <span className="h-3 w-3 rounded-full" style={{ backgroundColor: col.bg, border: `1.5px solid ${col.text}` }} />}
                <span className="text-sm">{c.name}</span>
                <Select value={c.colorId || ""} onValueChange={(v) => planner.updateClass(c.id, { colorId: v })}>
                  <SelectTrigger data-testid={`class-color-change-${c.id}`} className="h-6 w-6 p-0 border-0 bg-transparent" aria-label="Byt färg">
                    <span className="sr-only">Byt färg</span>
                  </SelectTrigger>
                  <SelectContent>
                    {CLASS_COLORS.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        <div className="flex items-center gap-2">
                          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: cc.bg, border: `1px solid ${cc.border}` }} />
                          {cc.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <button onClick={() => planner.deleteClass(c.id)} className="text-[#A3A69F] hover:text-[#9E4A3B]" data-testid={`class-delete-${c.id}`}><Trash2 className="h-3.5 w-3.5" /></button>
            </div>
          );
        })}
      </div>
    </Section>
  );
};

const SubjectsSection = ({ planner }) => {
  const [name, setName] = useState("");
  const [colorId, setColorId] = useState(SUBJECT_COLORS[0].id);
  return (
    <Section title="Ämnen" description="Välj en pastellfärg för att kunna känna igen ämnena snabbt." testId="section-subjects">
      <div className="flex gap-2 mb-3 flex-wrap">
        <Input data-testid="subject-name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="T.ex. Matematik" className="flex-1 min-w-[200px]" />
        <Select value={colorId} onValueChange={setColorId}>
          <SelectTrigger data-testid="subject-color-select" className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SUBJECT_COLORS.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }} />
                  {c.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          data-testid="subject-add-btn"
          onClick={() => { if (name.trim()) { planner.addSubject(name, colorId); setName(""); toast.success("Ämne tillagt"); } }}
          className="bg-[#718A7F] hover:bg-[#5C7267]"
        ><Plus className="h-4 w-4 mr-1" /> Lägg till</Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {planner.subjects.length === 0 && <div className="text-sm text-[#A3A69F]">Inga ämnen tillagda ännu.</div>}
        {planner.subjects.map((s) => {
          const col = getSubjectColor(s.colorId);
          return (
            <span key={s.id} data-testid={`subject-row-${s.id}`} className="text-sm px-3 py-1.5 rounded-full border flex items-center gap-2"
              style={{ backgroundColor: col.bg, color: col.text, borderColor: col.border }}>
              {s.name}
              <button onClick={() => planner.deleteSubject(s.id)} data-testid={`subject-delete-${s.id}`}><Trash2 className="h-3.5 w-3.5 opacity-60 hover:opacity-100" /></button>
            </span>
          );
        })}
      </div>
    </Section>
  );
};

const StudentsSection = ({ planner }) => {
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("");
  return (
    <Section title="Elever" description="Elever tillhör en klass." testId="section-students">
      {planner.classes.length === 0 ? (
        <div className="text-sm text-[#A3A69F]">Skapa minst en klass först.</div>
      ) : (
        <>
          <div className="flex gap-2 mb-4 flex-wrap">
            <Input data-testid="student-name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Elevens namn" className="flex-1 min-w-[200px]" />
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger data-testid="student-class-select" className="w-40"><SelectValue placeholder="Klass" /></SelectTrigger>
              <SelectContent>
                {planner.classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button
              data-testid="student-add-btn"
              onClick={() => { if (name.trim() && classId) { planner.addStudent(name, classId); setName(""); toast.success("Elev tillagd"); } }}
              className="bg-[#718A7F] hover:bg-[#5C7267]"
            ><Plus className="h-4 w-4 mr-1" /> Lägg till</Button>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
            {planner.students.length === 0 && <div className="text-sm text-[#A3A69F]">Inga elever ännu.</div>}
            {planner.students.map((st) => {
              const klass = planner.classes.find((c) => c.id === st.classId);
              return (
                <div key={st.id} className="flex items-center justify-between rounded-lg border border-[#DEDAD2] px-3 py-2 bg-[#FFFEFB]" data-testid={`student-row-${st.id}`}>
                  <div>
                    <div className="text-sm">{st.name}</div>
                    <div className="text-xs text-[#A3A69F]">{klass?.name}</div>
                  </div>
                  <button onClick={() => planner.deleteStudent(st.id)} className="text-[#A3A69F] hover:text-[#9E4A3B]" data-testid={`student-delete-${st.id}`}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}
    </Section>
  );
};

const TimetableSection = ({ planner }) => {
  const [weekday, setWeekday] = useState("0");
  const [time, setTime] = useState("08:20");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [defaultTitle, setDefaultTitle] = useState("");
  const canAdd = classId && subjectId && time;

  return (
    <Section title="Återkommande schema" description="Dessa lektioner visas automatiskt varje relevant vecka." testId="section-timetable">
      {planner.classes.length === 0 || planner.subjects.length === 0 ? (
        <div className="text-sm text-[#A3A69F]">Skapa minst en klass och ett ämne först.</div>
      ) : (
        <>
          <div className="grid md:grid-cols-6 gap-2 mb-4">
            <Select value={weekday} onValueChange={setWeekday}>
              <SelectTrigger data-testid="tt-weekday-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input data-testid="tt-time-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger data-testid="tt-class-select"><SelectValue placeholder="Klass" /></SelectTrigger>
              <SelectContent>{planner.classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger data-testid="tt-subject-select"><SelectValue placeholder="Ämne" /></SelectTrigger>
              <SelectContent>{planner.subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
            </Select>
            <Input data-testid="tt-title-input" value={defaultTitle} onChange={(e) => setDefaultTitle(e.target.value)} placeholder="Rubrik (valfri)" />
            <Button
              disabled={!canAdd}
              data-testid="tt-add-btn"
              onClick={() => { planner.addTimetableSlot({ weekday: Number(weekday), time, classId, subjectId, defaultTitle }); setDefaultTitle(""); toast.success("Schemarad tillagd"); }}
              className="bg-[#718A7F] hover:bg-[#5C7267]"
            ><Plus className="h-4 w-4 mr-1" /> Lägg till</Button>
          </div>

          <div className="grid gap-1">
            {planner.timetable.length === 0 && <div className="text-sm text-[#A3A69F]">Inga schemarader ännu.</div>}
            {planner.timetable
              .slice()
              .sort((a, b) => a.weekday - b.weekday || (a.time || "").localeCompare(b.time || ""))
              .map((t) => {
                const klass = planner.classes.find((c) => c.id === t.classId);
                const subj = planner.subjects.find((s) => s.id === t.subjectId);
                const col = subj ? getSubjectColor(subj.colorId) : null;
                return (
                  <div key={t.id} className="flex items-center gap-3 rounded-lg border border-[#DEDAD2] px-3 py-2 bg-[#FFFEFB]" data-testid={`tt-row-${t.id}`}>
                    <span className="text-xs uppercase tracking-widest text-[#A3A69F] font-semibold w-20">{WEEKDAYS[t.weekday]}</span>
                    <span className="text-sm font-semibold tabular-nums w-12">{t.time}</span>
                    {subj && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md border font-semibold" style={{ backgroundColor: col.bg, color: col.text, borderColor: col.border }}>
                        {subj.name}
                      </span>
                    )}
                    <span className="text-sm text-[#78817D]">{klass?.name}</span>
                    <span className="text-sm text-[#293330] flex-1 truncate">{t.defaultTitle}</span>
                    <button onClick={() => planner.deleteTimetableSlot(t.id)} className="text-[#A3A69F] hover:text-[#9E4A3B]" data-testid={`tt-delete-${t.id}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
          </div>
        </>
      )}
    </Section>
  );
};

const MeetingTemplatesSection = ({ planner }) => {
  const [name, setName] = useState("");
  const [meetingType, setMeetingType] = useState("");
  const [participants, setParticipants] = useState("");
  const [notes, setNotes] = useState("");
  const templates = planner.meetingTemplates || [];

  const save = () => {
    if (!name.trim()) { toast.info("Ge mallen ett namn."); return; }
    planner.addMeetingTemplate({
      name: name.trim(),
      meetingType: meetingType.trim(),
      participants: participants.trim(),
      notes: notes.trim(),
    });
    setName(""); setMeetingType(""); setParticipants(""); setNotes("");
    toast.success("Mall sparad");
  };

  return (
    <Section title="Mötesmallar" description="Skapa återanvändbara mallar för vanliga möten – t.ex. elevhälsomöte eller trygghetssamtal." testId="section-templates">
      <div className="rounded-xl border border-[#DEDAD2] p-3 bg-[#FFFEFB] space-y-2 mb-4">
        <div className="grid md:grid-cols-3 gap-2">
          <Input data-testid="template-name-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mallens namn (t.ex. Elevhälsomöte)" />
          <Input data-testid="template-type-input" value={meetingType} onChange={(e) => setMeetingType(e.target.value)} placeholder="Typ av möte" />
          <Input data-testid="template-participants-input" value={participants} onChange={(e) => setParticipants(e.target.value)} placeholder="Standarddeltagare" />
        </div>
        <Textarea data-testid="template-notes-input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Standardanteckning eller struktur (valfri)" />
        <div className="flex justify-end">
          <Button data-testid="template-add-btn" onClick={save} className="bg-[#718A7F] hover:bg-[#5C7267]"><Plus className="h-4 w-4 mr-1" />Spara mall</Button>
        </div>
      </div>
      {templates.length === 0 ? (
        <div className="text-sm text-[#A3A69F]">Inga mallar sparade ännu.</div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-2">
          {templates.map((t) => (
            <div key={t.id} className="rounded-lg border border-[#DEDAD2] bg-[#FFFEFB] p-3" data-testid={`template-row-${t.id}`}>
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-[#293330]">{t.name}</div>
                <button onClick={() => planner.deleteMeetingTemplate(t.id)} className="text-[#A3A69F] hover:text-[#9E4A3B]" data-testid={`template-delete-${t.id}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {t.meetingType && <div className="text-xs text-[#78817D] mt-1">{t.meetingType}</div>}
              {t.participants && <div className="text-xs text-[#A3A69F] mt-0.5">Deltagare: {t.participants}</div>}
              {t.notes && <div className="text-xs text-[#A3A69F] mt-1 whitespace-pre-wrap line-clamp-3">{t.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </Section>
  );
};


const BackupSection = ({ planner }) => {
  const fileRef = React.useRef(null);
  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result);
        planner.importBackup(parsed);
        toast.success("Backup importerad");
      } catch (err) {
        toast.error("Kunde inte läsa filen");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <Section title="Säkerhetskopiering" description="All data sparas lokalt. Exportera regelbundet för att inte förlora något." testId="section-backup">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={planner.exportBackup} data-testid="backup-export-btn" className="border-[#DEDAD2]"><Download className="h-4 w-4 mr-2" />Exportera backup</Button>
        <Button variant="outline" onClick={() => fileRef.current?.click()} data-testid="backup-import-btn" className="border-[#DEDAD2]"><Upload className="h-4 w-4 mr-2" />Importera backup</Button>
        <input type="file" ref={fileRef} onChange={handleImport} accept="application/json" className="hidden" />
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="border-[#F5D5D0] text-[#9E4A3B] hover:bg-[#FDF2F0]" data-testid="clear-all-btn"><RotateCcw className="h-4 w-4 mr-2" />Rensa hela planeraren</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Är du säker?</AlertDialogTitle>
              <AlertDialogDescription>Detta raderar all data i din planerare. Åtgärden kan inte ångras.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="clear-cancel-btn">Avbryt</AlertDialogCancel>
              <AlertDialogAction onClick={() => { planner.clearAll(); toast.success("Planeraren rensad"); }} className="bg-[#9E4A3B] hover:bg-[#7A3627]" data-testid="clear-confirm-btn">Rensa</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Section>
  );
};
