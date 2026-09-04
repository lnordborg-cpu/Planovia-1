import React from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Cloud, Sparkles } from "lucide-react";

export default function MergeDialog({ open, onKeep, onStartFresh }) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent data-testid="merge-dialog" className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-[#DFE9E2] text-[#47594E] flex items-center justify-center">
              <Cloud className="h-5 w-5" />
            </div>
            <AlertDialogTitle className="font-serif-display">Ta med din planerare in i molnet?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-[#78817D]">
            Vi hittade befintlig data i den här webbläsaren. Vill du behålla den som din nya molnprofil eller börja tomt?
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="grid gap-3 my-2">
          <button
            type="button"
            onClick={onKeep}
            className="text-left rounded-xl border border-[#DEDAD2] bg-[#FFFEFB] p-4 hover:bg-[#F3F7F4] transition"
            data-testid="merge-keep-btn"
          >
            <div className="flex items-center gap-2 font-semibold text-[#293330]">
              <Sparkles className="h-4 w-4 text-[#718A7F]" /> Behåll min planerare
            </div>
            <div className="text-xs text-[#78817D] mt-1">Din nuvarande data laddas upp och synkas mellan enheter.</div>
          </button>
          <button
            type="button"
            onClick={onStartFresh}
            className="text-left rounded-xl border border-[#DEDAD2] bg-[#FFFEFB] p-4 hover:bg-[#FBF6F0] transition"
            data-testid="merge-start-fresh-btn"
          >
            <div className="font-semibold text-[#293330]">Börja tomt</div>
            <div className="text-xs text-[#78817D] mt-1">Starta en tom molnplanerare (din lokala data raderas).</div>
          </button>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
