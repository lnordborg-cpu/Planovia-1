import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { usePlanner } from "@/context/PlannerContext";
import { getSubjectColor } from "@/lib/constants";
import { formatDateLong, fromISODate } from "@/lib/dateUtils";
import { Trash2, Link as LinkIcon, X } from "lucide-react";

export default function LessonExpandedDialog({ open, onOpenChange, eventId }) {
  const planner = usePlanner();
  const event = planner.events.find((e) => e.id === eventId);
  const [matName, setMatName] = useState("");
  const [matUrl, setMatUrl] = useState("");
  const [confirmPrint, setConfirmPrint] = useState(null); // pending pdf mat name
  const [notes, setNotes] = useState(event?.notes || "");

  React.useEffect(() => { setNotes(event?.notes || ""); }, [event?.id, event?.notes]);

  if (!event) return null;

  const subject = planner.subjects.find((s) => s.id === event.subjectId);
  const klass = planner.classes.find((c) => c.id === event.classId);
  const color = subject ? getSubjectColor(subject.colorId) : null;

  const addMaterial = () => {
    if (!matName.trim()) return;
    planner.addMaterialToEvent(event.id, { name: matName.trim(), url: matUrl.trim() });
    const isPdf = /\.pdf(\?|#|$)/i.test(matName.trim()) || /\.pdf(\?|#|$)/i.test(matUrl.trim());
    if (isPdf) setConfirmPrint({ name: matName.trim() });
    setMatName(""); setMatUrl("");
  };

  const removeMaterial = (id) => planner.removeMaterialFromEvent(event.id, id);
  const remove = () => { planner.deleteEvent(event.id); onOpenChange(false); };
  const saveNotes = () => planner.upsertEvent({ ...event, notes });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-xl" data-testid="lesson-expanded-dialog">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {subject && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border font-semibold"
                  style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}>
                  {subject.name}
                </span>
              )}
              {klass && <span className="text-xs text-[#656E67]">{klass.name}</span>}
              <span className="text-xs text-[#8A948C] ml-auto">{formatDateLong(fromISODate(event.date))} · {event.time}</span>
            </div>
            <DialogTitle className="font-serif-display text-2xl">{event.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#656E67]">Anteckningar</Label>
              <Textarea
                data-testid="expanded-notes"
                rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-widest text-[#656E67]">Material</Label>
              <div className="space-y-2 mt-1">
                {(event.materials || []).length === 0 && <div className="text-xs text-[#8A948C]">Inga material tillagda.</div>}
                {(event.materials || []).map((m) => (
                  <div key={m.id} className="flex items-center gap-2 text-sm bg-[#FAF7F2] border border-[#E6E1DA] rounded-lg px-3 py-1.5" data-testid={`material-${m.id}`}>
                    <LinkIcon className="h-3.5 w-3.5 text-[#656E67]" />
                    {m.url ? (
                      <a href={m.url} target="_blank" rel="noreferrer" className="text-[#3D5A45] underline underline-offset-2 flex-1 truncate">{m.name}</a>
                    ) : (
                      <span className="flex-1 truncate">{m.name}</span>
                    )}
                    <button onClick={() => removeMaterial(m.id)} className="text-[#8A948C] hover:text-[#9E4A3B]" data-testid={`material-remove-${m.id}`}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
                <div className="grid grid-cols-5 gap-2">
                  <Input data-testid="material-name-input" value={matName} onChange={(e) => setMatName(e.target.value)} placeholder="Namn på material" className="col-span-2" />
                  <Input data-testid="material-url-input" value={matUrl} onChange={(e) => setMatUrl(e.target.value)} placeholder="Länk (valfri)" className="col-span-2" />
                  <Button data-testid="material-add-btn" onClick={addMaterial} className="bg-[#3D5A45] hover:bg-[#2F4736]">Lägg till</Button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#E6E1DA]">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  data-testid="expanded-completed"
                  checked={!!event.completed}
                  onCheckedChange={() => planner.toggleEventCompleted(event.id)}
                />
                Genomförd
              </label>
              <Button variant="ghost" onClick={remove} className="text-[#9E4A3B] hover:text-[#7A3627] hover:bg-[#FDF2F0]" data-testid="expanded-delete">
                <Trash2 className="h-4 w-4 mr-1" /> Ta bort
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                planner.addPrintTaskForMaterial(event.id, confirmPrint.name, event.date);
                setConfirmPrint(null);
              }}
              className="bg-[#3D5A45] hover:bg-[#2F4736]"
            >
              Ja, lägg till
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
