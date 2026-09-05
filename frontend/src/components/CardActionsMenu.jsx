import React, { useState } from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ExternalLink, Clock, Copy, Trash2, AlertTriangle } from "lucide-react";
import { usePlanner } from "@/context/PlannerContext";
import { addMinutes, validateTimePair, DEFAULT_LESSON_MINUTES } from "@/lib/timeUtils";
import SeriesActionDialog from "@/components/dialogs/SeriesActionDialog";
import { toast } from "sonner";

/**
 * ⋯ menu shown on top-right of a timetable card. Provides:
 *   - Öppna (opens the expanded view)
 *   - Ändra tid (small time-only dialog)
 *   - Duplicera (creates a copy on same day)
 *   - Ta bort (delete, with series scope prompt if applicable)
 */
export default function CardActionsMenu({ event, onOpen }) {
  const planner = usePlanner();
  const [timeOpen, setTimeOpen] = useState(false);
  const [seriesAction, setSeriesAction] = useState(null); // {mode:'edit'|'delete', patch?:{}}
  const [start, setStart] = useState(event.time || "08:20");
  const [end, setEnd] = useState(event.endTime || addMinutes(event.time || "08:20", DEFAULT_LESSON_MINUTES));
  const [timeError, setTimeError] = useState("");

  const isSeries = !!(event.recurrence || event._isSeriesOccurrence);
  const templateId = event._seriesTemplateId || event.id;

  const openTime = () => {
    setStart(event.time || "08:20");
    setEnd(event.endTime || addMinutes(event.time || "08:20", DEFAULT_LESSON_MINUTES));
    setTimeError("");
    setTimeOpen(true);
  };

  const saveTime = () => {
    const v = validateTimePair(start, end);
    if (!v.ok) { setTimeError(v.message); return; }
    if (isSeries) {
      setSeriesAction({ mode: "edit", patch: { time: v.start, endTime: v.end } });
      return;
    }
    planner.upsertEvent({ ...event, time: v.start, endTime: v.end });
    setTimeOpen(false);
    toast.success("Tid uppdaterad");
  };

  const duplicate = (e) => {
    e?.stopPropagation();
    const dup = planner.duplicateEvent(event._isSeriesOccurrence ? { ...event, id: undefined } : event.id);
    if (dup) toast.success("Duplicerad");
  };

  const remove = (e) => {
    e?.stopPropagation();
    if (isSeries) { setSeriesAction({ mode: "delete" }); return; }
    planner.deleteEvent(event.id);
    toast.success("Borttagen");
  };

  const applySeriesChoice = (scope) => {
    if (!seriesAction) return;
    if (seriesAction.mode === "delete") {
      planner.deleteEventInSeries(event, scope);
      toast.success("Serien uppdaterad");
    } else {
      planner.updateEventInSeries(event, seriesAction.patch, scope);
      toast.success(scope === "all" ? "Hela serien uppdaterad" : scope === "future" ? "Detta och framtida uppdaterade" : "Endast detta tillfälle uppdaterat");
    }
    setSeriesAction(null);
    setTimeOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            onClick={(e) => e.stopPropagation()}
            className="absolute top-0.5 right-0.5 p-0.5 rounded hover:bg-white/70 opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
            aria-label="Åtgärder"
            data-testid={`card-menu-${event.id}`}
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-[#293330]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={onOpen} data-testid={`card-menu-open-${event.id}`}>
            <ExternalLink className="h-3.5 w-3.5 mr-2" /> Öppna
          </DropdownMenuItem>
          <DropdownMenuItem onClick={openTime} data-testid={`card-menu-time-${event.id}`}>
            <Clock className="h-3.5 w-3.5 mr-2" /> Ändra tid
          </DropdownMenuItem>
          <DropdownMenuItem onClick={duplicate} data-testid={`card-menu-dup-${event.id}`}>
            <Copy className="h-3.5 w-3.5 mr-2" /> Duplicera
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={remove} className="text-[#9E4A3B] focus:text-[#9E4A3B]" data-testid={`card-menu-del-${event.id}`}>
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Ta bort
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={timeOpen} onOpenChange={setTimeOpen}>
        <DialogContent className="max-w-sm" data-testid="quick-time-dialog" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle className="font-serif-display flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#718A7F]" /> Ändra tid
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs text-[#78817D]">{event.title}</div>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <Label className="text-[10px] uppercase tracking-widest text-[#78817D]">Starttid</Label>
              <Input data-testid="quick-time-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-widest text-[#78817D]">Sluttid</Label>
              <Input data-testid="quick-time-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="mt-1" />
            </div>
          </div>
          {timeError && (
            <div className="flex items-center gap-2 text-xs text-[#9E4A3B] mt-1" data-testid="quick-time-error">
              <AlertTriangle className="h-3.5 w-3.5" /> {timeError}
            </div>
          )}
          <DialogFooter className="mt-3">
            <Button variant="outline" onClick={() => setTimeOpen(false)} className="border-[#DEDAD2]">Avbryt</Button>
            <Button onClick={saveTime} className="bg-[#718A7F] hover:bg-[#5C7267]" data-testid="quick-time-save">Spara</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SeriesActionDialog
        open={!!seriesAction}
        onOpenChange={(v) => !v && setSeriesAction(null)}
        mode={seriesAction?.mode}
        onChoose={applySeriesChoice}
      />
    </>
  );
}
