import React, { useMemo, useState } from "react";
import { usePlanner } from "@/context/PlannerContext";
import { todayISO } from "@/lib/dateUtils";
import { getSubjectColor, TREND_SCALE_LABELS } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { NotebookPen, CheckCircle2, Pencil, X } from "lucide-react";
import { toast } from "sonner";

const ScaleRow = ({ trend, value, onChange }) => {
  const col = getSubjectColor(trend.colorId);
  return (
    <div className="space-y-2" data-testid={`trend-row-${trend.id}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: col.text }} />
          <span className="text-sm font-medium text-[#293330]">{trend.name}</span>
        </div>
        <span className="text-xs text-[#78817D]">{value ? TREND_SCALE_LABELS[value] : "—"}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = value === n;
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              data-testid={`trend-${trend.id}-scale-${n}`}
              className={`flex-1 h-9 rounded-lg border text-sm font-semibold transition ${
                selected
                  ? "text-[#293330] shadow-sm"
                  : "text-[#A3A69F] hover:text-[#293330] border-[#DEDAD2] bg-white"
              }`}
              style={
                selected
                  ? { backgroundColor: col.bg, borderColor: col.border, color: col.text }
                  : {}
              }
            >{n}</button>
          );
        })}
      </div>
    </div>
  );
};

export default function DaySummaryCard() {
  const planner = usePlanner();
  const today = todayISO();
  const existing = useMemo(
    () => (planner.daySummaries || []).find((d) => d.date === today),
    [planner.daySummaries, today],
  );
  const [isOpen, setIsOpen] = useState(false);
  const [values, setValues] = useState(() => existing?.values || {});
  const [note, setNote] = useState(() => existing?.note || "");

  React.useEffect(() => {
    if (isOpen) {
      setValues(existing?.values || {});
      setNote(existing?.note || "");
    }
  }, [isOpen, existing]);

  const trends = planner.dayTrends || [];

  const save = () => {
    planner.upsertDaySummary({ date: today, values, note });
    toast.success("Dagen sammanfattad");
    setIsOpen(false);
  };

  const hasAnyValue = existing && Object.keys(existing.values || {}).length > 0;

  if (!isOpen && hasAnyValue) {
    return (
      <Card className="border-[#DEDAD2] bg-white shadow-none" data-testid="day-summary-card">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-[#DFE9E2] flex items-center justify-center text-[#47594E]">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-widest text-[#A3A69F] font-semibold">Dagens sammanfattning</div>
                <div className="text-sm text-[#293330]">Sparat idag</div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(true)}
              className="text-[#78817D] hover:text-[#293330]"
              data-testid="day-summary-edit-btn"
            ><Pencil className="h-3.5 w-3.5 mr-1" /> Redigera</Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {trends.map((t) => {
              const val = existing.values?.[t.id];
              const col = getSubjectColor(t.colorId);
              return (
                <div
                  key={t.id}
                  className="rounded-lg border border-[#DEDAD2] px-3 py-2"
                  style={{ backgroundColor: val ? col.bg : "#FFFEFB" }}
                  data-testid={`day-summary-value-${t.id}`}
                >
                  <div className="text-[10px] uppercase tracking-widest font-semibold" style={{ color: col.text }}>{t.name}</div>
                  <div className="font-serif-display text-xl mt-0.5" style={{ color: col.text }}>
                    {val ? `${val} / 5` : "—"}
                  </div>
                </div>
              );
            })}
          </div>
          {existing.note && (
            <div className="mt-3 text-sm text-[#78817D] whitespace-pre-wrap border-t border-[#DEDAD2] pt-3">{existing.note}</div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!isOpen) {
    return (
      <Card className="border-[#DEDAD2] bg-white shadow-none" data-testid="day-summary-prompt">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#EEDACB] flex items-center justify-center text-[#7B4B31]">
              <NotebookPen className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="font-serif-display text-lg text-[#293330]">Sammanfatta dagen</div>
              <div className="text-sm text-[#78817D]">Fyll i några trender så följer du mönster i statistiken över tid.</div>
            </div>
            <Button onClick={() => setIsOpen(true)} className="bg-[#718A7F] hover:bg-[#5C7267]" data-testid="day-summary-open-btn">
              Öppna
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#DEDAD2] bg-white shadow-none" data-testid="day-summary-form">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-widest text-[#A3A69F] font-semibold">Sammanfatta dagen</div>
            <div className="font-serif-display text-xl text-[#293330]">Hur var din dag?</div>
          </div>
          <button onClick={() => setIsOpen(false)} className="text-[#A3A69F] hover:text-[#293330]" data-testid="day-summary-close-btn">
            <X className="h-4 w-4" />
          </button>
        </div>

        {trends.length === 0 ? (
          <div className="text-sm text-[#A3A69F]">Inga trender att fylla i. Lägg till dem i Inställningar.</div>
        ) : (
          <div className="space-y-4">
            {trends.map((t) => (
              <ScaleRow
                key={t.id}
                trend={t}
                value={values[t.id]}
                onChange={(n) => setValues((v) => ({ ...v, [t.id]: n }))}
              />
            ))}
            <div>
              <label className="text-xs text-[#78817D] mb-1 block">Kort anteckning (valfritt)</label>
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="En rad om dagen…"
                data-testid="day-summary-note-input"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={() => setIsOpen(false)} className="border-[#DEDAD2]" data-testid="day-summary-cancel-btn">Avbryt</Button>
              <Button
                onClick={save}
                className="bg-[#718A7F] hover:bg-[#5C7267]"
                disabled={Object.keys(values).length === 0}
                data-testid="day-summary-save-btn"
              >Spara</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
