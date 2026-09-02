import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { usePlanner } from "@/context/PlannerContext";
import { getSubjectColor, autoClassifyMaterial } from "@/lib/constants";
import { formatDateLong, fromISODate } from "@/lib/dateUtils";
import { uploadFile, deleteFile } from "@/lib/api";
import { Trash2, Link as LinkIcon, X, Paperclip, FileText, Upload, StickyNote, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import MaterialPreview, { canPreview } from "@/components/dialogs/MaterialPreview";

const PRINTABLE_RE = /\.(pdf|docx?|odt|pptx?|xlsx?|rtf|txt|png|jpe?g)(\?|#|$)/i;

export default function LessonExpandedDialog({ open, onOpenChange, eventId }) {
  const planner = usePlanner();
  const event = planner.events.find((e) => e.id === eventId);
  const [matName, setMatName] = useState("");
  const [matUrl, setMatUrl] = useState("");
  const [confirmPrint, setConfirmPrint] = useState(null); // pending pdf mat name
  const [notes, setNotes] = useState(event?.notes || "");
  const [previewMaterial, setPreviewMaterial] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  React.useEffect(() => { setNotes(event?.notes || ""); }, [event?.id, event?.notes]);

  if (!event) return null;

  const subject = planner.subjects.find((s) => s.id === event.subjectId);
  const klass = planner.classes.find((c) => c.id === event.classId);
  const color = subject ? getSubjectColor(subject.colorId) : null;

  const linkedNotes = planner.studentNotes.filter((n) => n.linkedEventId === event.id);

  const addMaterial = () => {
    if (!matName.trim()) return;
    planner.addMaterialToEvent(event.id, { name: matName.trim(), url: matUrl.trim() });
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
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`${file.name} är för stor (max 20MB).`);
          continue;
        }
        const uploaded = await uploadFile(file);
        const subcategory = autoClassifyMaterial(file.name);
        planner.addMaterialToEvent(event.id, {
          ...uploaded,
          subjectId: event.subjectId || null,
          subcategory,
        });
        addedNames.push(file.name);
      } catch (err) {
        toast.error(`Kunde inte ladda upp ${file.name}: ${err.message || ""}`);
      }
    }
    setUploading(false);
    // Auto-create print tasks for printable-looking files
    addedNames.forEach((name) => {
      if (PRINTABLE_RE.test(name)) {
        planner.addPrintTaskForMaterial(event.id, name, event.date);
      }
    });
    if (addedNames.length > 0) {
      const printable = addedNames.filter((n) => PRINTABLE_RE.test(n)).length;
      toast.success(
        `${addedNames.length} fil${addedNames.length > 1 ? "er" : ""} bifogad${addedNames.length > 1 ? "e" : ""}${printable ? ` · ${printable} utskriftsuppgift${printable > 1 ? "er" : ""} tillagd${printable > 1 ? "a" : ""}` : ""}`,
      );
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeMaterial = (id) => {
    const m = (event.materials || []).find((x) => x.id === id);
    if (m && m.fileId) deleteFile(m.fileId);
    planner.removeMaterialFromEvent(event.id, id);
  };
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
              {klass && <span className="text-xs text-[#78817D]">{klass.name}</span>}
              <span className="text-xs text-[#A3A69F] ml-auto">{formatDateLong(fromISODate(event.date))} · {event.time}</span>
            </div>
            <DialogTitle className="font-serif-display text-2xl">{event.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div>
              <Label className="text-xs uppercase tracking-widest text-[#78817D]">Anteckningar</Label>
              <Textarea
                data-testid="expanded-notes"
                rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={saveNotes} className="mt-1"
              />
            </div>

            <div>
              <Label className="text-xs uppercase tracking-widest text-[#78817D]">Material</Label>
              <div className="space-y-2 mt-1">
                {(event.materials || []).length === 0 && <div className="text-xs text-[#A3A69F]">Inga material tillagda.</div>}
                {(event.materials || []).map((m) => {
                  const previewable = canPreview(m);
                  return (
                    <div key={m.id} className="flex items-center gap-2 text-sm bg-[#FFFEFB] border border-[#DEDAD2] rounded-lg px-3 py-1.5" data-testid={`material-${m.id}`}>
                      {m.isFile ? <FileText className="h-3.5 w-3.5 text-[#718A7F]" /> : <LinkIcon className="h-3.5 w-3.5 text-[#78817D]" />}
                      {previewable && m.url ? (
                        <button
                          onClick={() => setPreviewMaterial(m)}
                          className="text-[#718A7F] underline underline-offset-2 flex-1 truncate text-left hover:text-[#5C7267]"
                          data-testid={`material-preview-${m.id}`}
                        >
                          {m.name}
                        </button>
                      ) : m.url ? (
                        <a href={m.url} download={m.isFile ? m.name : undefined} target="_blank" rel="noreferrer" className="text-[#718A7F] underline underline-offset-2 flex-1 truncate">{m.name}</a>
                      ) : (
                        <span className="flex-1 truncate">{m.name}</span>
                      )}
                      {previewable && m.url && (
                        <button
                          onClick={() => setPreviewMaterial(m)}
                          className="text-[#78817D] hover:text-[#718A7F] p-1 rounded hover:bg-white"
                          title="Förhandsgranska"
                          data-testid={`material-preview-btn-${m.id}`}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
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
                <div className="grid grid-cols-5 gap-2">
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
            </div>

            {linkedNotes.length > 0 && (
              <div data-testid="linked-notes-section">
                <Label className="text-xs uppercase tracking-widest text-[#78817D]">Elevnoteringar från denna lektion</Label>
                <div className="space-y-1.5 mt-1">
                  {linkedNotes.map((n) => {
                    const s = planner.students.find((x) => x.id === n.studentId);
                    return (
                      <div key={n.id} className="text-sm bg-[#FEF8EC] border border-[#F9E8C7] rounded-lg px-3 py-2 flex items-start gap-2" data-testid={`linked-note-${n.id}`}>
                        <StickyNote className="h-3.5 w-3.5 mt-0.5 text-[#8C5E14]" />
                        <div className="flex-1">
                          <div className="text-xs text-[#8C5E14] font-semibold">{s?.name || "Elev"} · {formatDateLong(fromISODate(n.date))}</div>
                          {n.title && <div className="text-sm font-semibold text-[#293330]">{n.title}</div>}
                          {n.note && <div className="text-sm text-[#78817D] whitespace-pre-wrap">{n.note}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 border-t border-[#DEDAD2]">
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

      <MaterialPreview material={previewMaterial} onOpenChange={(v) => !v && setPreviewMaterial(null)} />

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
              className="bg-[#718A7F] hover:bg-[#5C7267]"
            >
              Ja, lägg till
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
