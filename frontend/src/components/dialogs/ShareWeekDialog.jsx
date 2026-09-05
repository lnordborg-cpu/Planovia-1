import React, { useMemo, useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  createWeekShare, revokeWeekShare, getStoredShareForKey, buildShareUrl,
} from "@/lib/shareApi";
import { Copy, Link as LinkIcon, Loader2, Trash2, Clock, CheckCircle2, ExternalLink } from "lucide-react";

const formatExpires = (iso) => {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleString("sv-SE", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
};

const daysLeft = (iso) => {
  if (!iso) return 0;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
};

export default function ShareWeekDialog({
  open,
  onOpenChange,
  weekLabel,       // e.g. "Vecka 12 · 15 mar – 19 mar · 2026"
  buildWeekPayload, // function returning the snapshot to POST
  storageKey,      // stable key so revoke persists (e.g. `week-2026-12`)
}) {
  const [busy, setBusy] = useState(false);
  const [share, setShare] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    setShare(getStoredShareForKey(storageKey));
    setCopied(false);
  }, [open, storageKey]);

  const url = share ? buildShareUrl(share.token) : "";

  const create = async () => {
    setBusy(true);
    try {
      const payload = buildWeekPayload();
      const data = await createWeekShare({ weekData: payload, label: weekLabel, key: storageKey });
      setShare({
        token: data.token,
        revoke_secret: data.revoke_secret,
        expires_at: data.expires_at,
        created_at: data.created_at,
        label: data.label,
      });
      toast.success("Länk skapad – dela den med vikarien!");
    } catch (err) {
      toast.error(err.message || "Kunde inte skapa länken");
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Länken kopierad");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Kunde inte kopiera – markera länken och kopiera manuellt.");
    }
  };

  const revoke = async () => {
    if (!share) return;
    setBusy(true);
    try {
      await revokeWeekShare({ token: share.token, revoke_secret: share.revoke_secret, key: storageKey });
      setShare(null);
      toast.success("Länken är återkallad");
    } catch (err) {
      toast.error(err.message || "Kunde inte återkalla länken");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" data-testid="share-week-dialog">
        <DialogHeader>
          <DialogTitle className="font-serif-display text-2xl">Dela vecka med vikarie</DialogTitle>
          <DialogDescription className="text-sm text-[#78817D]">
            Skapa en läslänk som en vikarie kan öppna utan inloggning. Länken innehåller
            veckans lektioner med mål, plan, material och eventuella instruktioner du markerat
            som ”För vikarie”.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border border-[#DEDAD2] bg-[#F6F3EE]/60 p-3 text-xs text-[#78817D]">
          <div className="flex items-center gap-2 mb-1">
            <LinkIcon className="h-3.5 w-3.5 text-[#718A7F]" />
            <span className="font-semibold text-[#293330]">{weekLabel}</span>
          </div>
          Länken utgår automatiskt efter 7 dagar. Du kan även återkalla den när som helst.
        </div>

        {!share ? (
          <div className="mt-3 flex justify-end">
            <Button
              onClick={create}
              disabled={busy}
              className="bg-[#718A7F] hover:bg-[#5C7267]"
              data-testid="share-create-btn"
            >
              {busy ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Skapar…</>
              ) : (
                <><LinkIcon className="h-4 w-4 mr-2" /> Skapa länk</>
              )}
            </Button>
          </div>
        ) : (
          <div className="mt-2 space-y-3">
            <div>
              <Label className="text-[10px] uppercase tracking-widest text-[#78817D]">Länk</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={url}
                  readOnly
                  onFocus={(e) => e.target.select()}
                  data-testid="share-url-input"
                  className="text-sm"
                />
                <Button
                  onClick={copy}
                  className="bg-[#718A7F] hover:bg-[#5C7267] flex-shrink-0"
                  data-testid="share-copy-btn"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="text-xs text-[#78817D] flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-[#B49E6A]" />
              Utgår {formatExpires(share.expires_at)} · {daysLeft(share.expires_at)} dagar kvar
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#EFEAE1]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => window.open(url, "_blank", "noopener")}
                className="text-[#718A7F] hover:text-[#5C7267]"
                data-testid="share-open-btn"
              >
                <ExternalLink className="h-3.5 w-3.5 mr-1" /> Öppna vikarie-vyn
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={revoke}
                disabled={busy}
                className="text-[#9E4A3B] hover:text-[#7A3627] hover:bg-[#FDF2F0]"
                data-testid="share-revoke-btn"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Återkalla länk
              </Button>
            </div>
          </div>
        )}

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="border-[#DEDAD2]">
            Stäng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
