import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Repeat } from "lucide-react";

const PRESETS = [
  { id: "daily-1",    frequency: "daily",   interval: 1,  label: "Varje dag" },
  { id: "weekly-1",   frequency: "weekly",  interval: 1,  label: "Varje vecka" },
  { id: "weekly-2",   frequency: "weekly",  interval: 2,  label: "Varannan vecka" },
  { id: "weekly-3",   frequency: "weekly",  interval: 3,  label: "Var tredje vecka" },
  { id: "weekly-4",   frequency: "weekly",  interval: 4,  label: "Var fjärde vecka" },
  { id: "monthly-1",  frequency: "monthly", interval: 1,  label: "Varje månad" },
  { id: "custom",     frequency: "custom",  interval: 1,  label: "Anpassat intervall" },
];

const matchesPreset = (rec) => {
  if (!rec) return "";
  const p = PRESETS.find((x) => x.frequency === rec.frequency && x.interval === rec.interval);
  return p ? p.id : "custom";
};

export default function RecurrencePicker({ value, onChange }) {
  const enabled = !!value;
  const rec = value || { frequency: "weekly", interval: 1, ends: { type: "never" }, exceptions: [] };
  const activePreset = enabled ? matchesPreset(rec) : "";

  const setEnabled = (on) => {
    if (on) onChange({ frequency: "weekly", interval: 1, ends: { type: "never" }, exceptions: [] });
    else onChange(null);
  };
  const setPreset = (id) => {
    if (id === "custom") {
      onChange({ ...rec, frequency: rec.frequency === "custom" ? rec.frequency : "weekly" });
      return;
    }
    const p = PRESETS.find((x) => x.id === id);
    if (!p) return;
    onChange({ ...rec, frequency: p.frequency, interval: p.interval });
  };
  const setFrequency = (f) => onChange({ ...rec, frequency: f });
  const setInterval = (n) => onChange({ ...rec, interval: Math.max(1, Number(n) || 1) });
  const setEnds = (patch) => onChange({ ...rec, ends: { ...(rec.ends || { type: "never" }), ...patch } });

  return (
    <div className="rounded-xl border border-[#DEDAD2] bg-[#F6F3EE]/50 p-3 space-y-3" data-testid="recurrence-picker">
      <label className="flex items-center gap-2 text-sm text-[#293330] font-medium cursor-pointer">
        <Checkbox
          checked={enabled}
          onCheckedChange={(v) => setEnabled(!!v)}
          data-testid="recurrence-toggle"
        />
        <Repeat className="h-3.5 w-3.5 text-[#718A7F]" />
        Återkommande möte
      </label>

      {enabled && (
        <div className="space-y-3 pl-6">
          <div>
            <Label className="text-[10px] uppercase tracking-widest text-[#78817D]">Upprepning</Label>
            <Select value={activePreset || ""} onValueChange={setPreset}>
              <SelectTrigger data-testid="recurrence-preset-select" className="mt-1 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRESETS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {activePreset === "custom" && (
            <div className="grid grid-cols-3 gap-2" data-testid="recurrence-custom">
              <div>
                <Label className="text-[10px] uppercase tracking-widest text-[#78817D]">Var</Label>
                <Input
                  type="number"
                  min={1}
                  value={rec.interval}
                  onChange={(e) => setInterval(e.target.value)}
                  className="mt-1 bg-white"
                  data-testid="recurrence-interval-input"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-[10px] uppercase tracking-widest text-[#78817D]">Enhet</Label>
                <Select value={rec.frequency === "custom" ? "weekly" : rec.frequency} onValueChange={setFrequency}>
                  <SelectTrigger data-testid="recurrence-frequency-select" className="mt-1 bg-white"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">dag / dagar</SelectItem>
                    <SelectItem value="weekly">vecka / veckor</SelectItem>
                    <SelectItem value="monthly">månad / månader</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div>
            <Label className="text-[10px] uppercase tracking-widest text-[#78817D] mb-1 block">Slutar</Label>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setEnds({ type: "never", date: undefined, count: undefined })}
                className={`text-xs px-2.5 py-1 rounded-lg border transition ${rec.ends?.type === "never" ? "bg-[#DFE9E2] border-[#C7D6CB] text-[#293330]" : "bg-white border-[#DEDAD2] text-[#78817D]"}`}
                data-testid="recurrence-ends-never"
              >Aldrig</button>
              <button
                type="button"
                onClick={() => setEnds({ type: "date" })}
                className={`text-xs px-2.5 py-1 rounded-lg border transition ${rec.ends?.type === "date" ? "bg-[#DFE9E2] border-[#C7D6CB] text-[#293330]" : "bg-white border-[#DEDAD2] text-[#78817D]"}`}
                data-testid="recurrence-ends-date"
              >På ett datum</button>
              <button
                type="button"
                onClick={() => setEnds({ type: "count" })}
                className={`text-xs px-2.5 py-1 rounded-lg border transition ${rec.ends?.type === "count" ? "bg-[#DFE9E2] border-[#C7D6CB] text-[#293330]" : "bg-white border-[#DEDAD2] text-[#78817D]"}`}
                data-testid="recurrence-ends-count"
              >Efter antal</button>
              {rec.ends?.type === "date" && (
                <Input
                  type="date"
                  value={rec.ends.date || ""}
                  onChange={(e) => setEnds({ date: e.target.value })}
                  className="h-8 bg-white w-40"
                  data-testid="recurrence-ends-date-input"
                />
              )}
              {rec.ends?.type === "count" && (
                <Input
                  type="number"
                  min={1}
                  value={rec.ends.count || ""}
                  onChange={(e) => setEnds({ count: Math.max(1, Number(e.target.value) || 1) })}
                  className="h-8 bg-white w-20"
                  placeholder="10"
                  data-testid="recurrence-ends-count-input"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
