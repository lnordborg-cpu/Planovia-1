import React from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Repeat, X } from "lucide-react";

/**
 * Prompt with 3 scope options for actions on a recurring event.
 * @param mode 'edit' | 'delete'
 * @param onChoose (scope: 'single' | 'future' | 'all')
 */
export default function SeriesActionDialog({ open, onOpenChange, mode = "edit", onChoose }) {
  const title = mode === "delete" ? "Ta bort återkommande möte" : "Vad vill du ändra?";
  const labels = mode === "delete"
    ? {
      single: "Ta bort endast detta tillfälle",
      future: "Ta bort detta och framtida tillfällen",
      all: "Ta bort hela serien",
    }
    : {
      single: "Bara detta möte",
      future: "Detta och framtida möten",
      all: "Hela mötesserien",
    };
  const hints = {
    single: "Övriga tillfällen påverkas inte.",
    future: "Tidigare tillfällen behålls, resten uppdateras.",
    all: "Alla tillfällen förändras.",
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent data-testid="series-action-dialog" className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 rounded-lg bg-[#F0F5FA] text-[#2C5282] flex items-center justify-center">
              <Repeat className="h-4 w-4" />
            </div>
            <AlertDialogTitle className="font-serif-display">{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-[#78817D]">
            Detta möte återkommer regelbundet. Välj vad ändringen ska gälla.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-2 my-2">
          {(["single", "future", "all"]).map((scope) => (
            <button
              key={scope}
              onClick={() => onChoose(scope)}
              className="text-left rounded-xl border border-[#DEDAD2] bg-[#FFFEFB] p-3 hover:bg-[#F6F3EE] transition"
              data-testid={`series-scope-${scope}`}
            >
              <div className="font-semibold text-[#293330] text-sm">{labels[scope]}</div>
              <div className="text-xs text-[#78817D] mt-0.5">{hints[scope]}</div>
            </button>
          ))}
        </div>

        <AlertDialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-[#78817D]">Avbryt</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
