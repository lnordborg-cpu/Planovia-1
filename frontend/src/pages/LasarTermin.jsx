import React, { useMemo, useState } from "react";
import { usePlanner } from "@/context/PlannerContext";
import { unitProgress } from "@/lib/plannerHelpers";
import { getSubjectColor, EXCEPTION_TYPES, getExceptionType } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { formatDateShort, fromISODate } from "@/lib/dateUtils";
import { toast } from "sonner";
import TerminTimeline from "@/components/TerminTimeline";

export default function LasarTermin() {
  const planner = usePlanner();
  return (
    <div className="space-y-8" data-testid="page-lasar">
      <header>
        <div className="text-[11px] tracking-[0.2em] uppercase text-[#8A948C] font-semibold">Läsår / Termin</div>
        <h1 className="font-serif-display text-4xl mt-1 text-[#2D312E]">Terminsöversikt</h1>
      </header>

      <UnitsSection planner={planner} />
      <TerminTimeline />
      <ExceptionsSection planner={planner} />
    </div>
  );
}

const UnitsSection = ({ planner }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", classId: "", subjectId: "", startWeek: "", endWeek: "", goals: "", notes: "" });
  const reset = () => setForm({ title: "", classId: "", subjectId: "", startWeek: "", endWeek: "", goals: "", notes: "" });
  const save = () => {
    if (!form.title.trim()) return;
    planner.addUnit({
      ...form,
      startWeek: form.startWeek ? Number(form.startWeek) : null,
      endWeek: form.endWeek ? Number(form.endWeek) : null,
    });
    reset(); setOpen(false); toast.success("Arbetsområde skapat");
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif-display text-2xl text-[#2D312E]">Arbetsområden</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="unit-new-btn" className="bg-[#3D5A45] hover:bg-[#2F4736]"><Plus className="h-4 w-4 mr-1" /> Nytt arbetsområde</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg" data-testid="unit-dialog">
            <DialogHeader><DialogTitle className="font-serif-display text-2xl">Nytt arbetsområde</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs uppercase tracking-widest text-[#656E67]">Titel</Label>
                <Input data-testid="unit-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-widest text-[#656E67]">Klass</Label>
                  <Select value={form.classId} onValueChange={(v) => setForm({ ...form, classId: v })}>
                    <SelectTrigger data-testid="unit-class-select" className="mt-1"><SelectValue placeholder="Välj klass" /></SelectTrigger>
                    <SelectContent>{planner.classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest text-[#656E67]">Ämne</Label>
                  <Select value={form.subjectId} onValueChange={(v) => setForm({ ...form, subjectId: v })}>
                    <SelectTrigger data-testid="unit-subject-select" className="mt-1"><SelectValue placeholder="Välj ämne" /></SelectTrigger>
                    <SelectContent>{planner.subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest text-[#656E67]">Startvecka</Label>
                  <Input data-testid="unit-start-input" type="number" min="1" max="53" value={form.startWeek} onChange={(e) => setForm({ ...form, startWeek: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest text-[#656E67]">Slutvecka</Label>
                  <Input data-testid="unit-end-input" type="number" min="1" max="53" value={form.endWeek} onChange={(e) => setForm({ ...form, endWeek: e.target.value })} className="mt-1" />
                </div>
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest text-[#656E67]">Mål</Label>
                <Textarea data-testid="unit-goals-input" value={form.goals} onChange={(e) => setForm({ ...form, goals: e.target.value })} rows={2} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest text-[#656E67]">Anteckningar</Label>
                <Textarea data-testid="unit-notes-input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="mt-1" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
              <Button onClick={save} data-testid="unit-save-btn" className="bg-[#3D5A45] hover:bg-[#2F4736]">Spara</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {planner.units.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E6E1DA] p-10 text-center text-sm text-[#8A948C]">Inga arbetsområden ännu.</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {planner.units.map((u) => {
            const subj = planner.subjects.find((s) => s.id === u.subjectId);
            const klass = planner.classes.find((c) => c.id === u.classId);
            const color = subj ? getSubjectColor(subj.colorId) : null;
            const { done, total } = unitProgress(u, planner.events);
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <Card key={u.id} className="border-[#E6E1DA] shadow-none bg-white" data-testid={`unit-card-${u.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        {subj && (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md border font-semibold"
                            style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}>
                            {subj.name}
                          </span>
                        )}
                        {klass && <span className="text-xs text-[#656E67]">{klass.name}</span>}
                      </div>
                      <h3 className="font-serif-display text-lg text-[#2D312E]">{u.title}</h3>
                      {(u.startWeek || u.endWeek) && (
                        <div className="text-xs text-[#8A948C] mt-1">Vecka {u.startWeek || "?"}–{u.endWeek || "?"}</div>
                      )}
                    </div>
                    <button onClick={() => planner.deleteUnit(u.id)} className="text-[#8A948C] hover:text-[#9E4A3B]" data-testid={`unit-delete-${u.id}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {u.goals && <p className="text-sm text-[#656E67] mt-3 whitespace-pre-wrap">{u.goals}</p>}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#656E67]">Framsteg</span>
                      <span className="text-[#2D312E] font-semibold tabular-nums">{done} / {total}</span>
                    </div>
                    <div className="h-1.5 bg-[#F3EFEA] rounded-full mt-2 overflow-hidden">
                      <div className="h-full bg-[#3D5A45] transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
};

const ExceptionsSection = ({ planner }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", type: "lov", startDate: "", endDate: "", hideRegularLessons: true });
  const reset = () => setForm({ title: "", type: "lov", startDate: "", endDate: "", hideRegularLessons: true });
  const save = () => {
    if (!form.title.trim() || !form.startDate || !form.endDate) return;
    planner.addException(form);
    reset(); setOpen(false); toast.success("Händelse tillagd i kalendern");
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-serif-display text-2xl text-[#2D312E]">Kalenderavvikelser</h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="exception-new-btn" variant="outline" className="border-[#E6E1DA]"><Plus className="h-4 w-4 mr-1" /> Lägg till</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md" data-testid="exception-dialog">
            <DialogHeader><DialogTitle className="font-serif-display text-2xl">Kalenderavvikelse</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs uppercase tracking-widest text-[#656E67]">Rubrik</Label>
                <Input data-testid="exception-title-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="mt-1" placeholder="T.ex. Höstlov" />
              </div>
              <div>
                <Label className="text-xs uppercase tracking-widest text-[#656E67]">Typ</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger data-testid="exception-type-select" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>{EXCEPTION_TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs uppercase tracking-widest text-[#656E67]">Startdatum</Label>
                  <Input data-testid="exception-start-input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label className="text-xs uppercase tracking-widest text-[#656E67]">Slutdatum</Label>
                  <Input data-testid="exception-end-input" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="mt-1" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox data-testid="exception-hide-check" checked={form.hideRegularLessons} onCheckedChange={(v) => setForm({ ...form, hideRegularLessons: !!v })} />
                Dölj ordinarie lektioner under denna period
              </label>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Avbryt</Button>
              <Button onClick={save} data-testid="exception-save-btn" className="bg-[#3D5A45] hover:bg-[#2F4736]">Spara</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {planner.calendarExceptions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E6E1DA] p-6 text-center text-sm text-[#8A948C]">Inga kalenderavvikelser ännu.</div>
      ) : (
        <div className="space-y-2">
          {planner.calendarExceptions.map((ex) => {
            const t = getExceptionType(ex.type);
            return (
              <div key={ex.id} className="flex items-center gap-3 rounded-xl border border-[#E6E1DA] bg-white p-3" data-testid={`exception-row-${ex.id}`}>
                <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border font-semibold ${t.badge}`}>{t.label}</span>
                <span className="text-sm text-[#2D312E] flex-1">{ex.title}</span>
                <span className="text-xs text-[#656E67] tabular-nums">{formatDateShort(fromISODate(ex.startDate))} – {formatDateShort(fromISODate(ex.endDate))}</span>
                {ex.hideRegularLessons && <span className="text-[10px] text-[#8A948C]">Dölj ordinarie</span>}
                <button onClick={() => planner.deleteException(ex.id)} className="text-[#8A948C] hover:text-[#9E4A3B]" data-testid={`exception-delete-${ex.id}`}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
