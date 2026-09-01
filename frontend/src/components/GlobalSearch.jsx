import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { usePlanner } from "@/context/PlannerContext";
import { formatDateShort, fromISODate } from "@/lib/dateUtils";
import { getSubjectColor } from "@/lib/constants";
import { BookOpen, Users, ClipboardList, GraduationCap } from "lucide-react";

export default function GlobalSearch({ open, onOpenChange }) {
  const navigate = useNavigate();
  const planner = usePlanner();
  const [q, setQ] = useState("");

  useEffect(() => { if (!open) setQ(""); }, [open]);

  const go = (path) => { onOpenChange(false); navigate(path); };

  const events = useMemo(
    () => planner.events.map((e) => {
      const subj = planner.subjects.find((s) => s.id === e.subjectId);
      const klass = planner.classes.find((c) => c.id === e.classId);
      return { ...e, subjectName: subj?.name, className: klass?.name };
    }),
    [planner.events, planner.subjects, planner.classes],
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput data-testid="global-search-input" value={q} onValueChange={setQ} placeholder="Sök elever, lektioner, uppgifter, arbetsområden…" />
      <CommandList>
        <CommandEmpty>Inga träffar.</CommandEmpty>

        {planner.students.length > 0 && (
          <CommandGroup heading="Elever">
            {planner.students.map((s) => {
              const klass = planner.classes.find((c) => c.id === s.classId);
              return (
                <CommandItem key={s.id} value={`elev ${s.name} ${klass?.name || ""}`} onSelect={() => go(`/elever/${s.id}`)} data-testid={`search-student-${s.id}`}>
                  <Users className="h-4 w-4 text-[#2C5282]" />
                  <span>{s.name}</span>
                  <span className="text-xs text-[#8A948C] ml-2">{klass?.name}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {events.length > 0 && (
          <CommandGroup heading="Lektioner & händelser">
            {events.map((e) => {
              const subj = planner.subjects.find((s) => s.id === e.subjectId);
              const color = subj ? getSubjectColor(subj.colorId) : null;
              return (
                <CommandItem key={e.id} value={`lektion ${e.title} ${e.subjectName || ""} ${e.className || ""} ${e.date}`} onSelect={() => go(`/vecka`)} data-testid={`search-event-${e.id}`}>
                  <BookOpen className="h-4 w-4" style={{ color: color?.text || "#2D5A3A" }} />
                  <span>{e.title || "(utan rubrik)"}</span>
                  <span className="text-xs text-[#8A948C] ml-2">{e.subjectName} · {e.className} · {formatDateShort(fromISODate(e.date))}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {planner.tasks.length > 0 && (
          <CommandGroup heading="Uppgifter">
            {planner.tasks.map((t) => (
              <CommandItem key={t.id} value={`uppgift ${t.title} ${t.category}`} onSelect={() => go("/oversikt")} data-testid={`search-task-${t.id}`}>
                <ClipboardList className="h-4 w-4 text-[#9E4A3B]" />
                <span className={t.completed ? "line-through text-[#8A948C]" : ""}>{t.title}</span>
                <span className="text-xs text-[#8A948C] ml-2">{t.category}{t.deadline ? ` · ${formatDateShort(fromISODate(t.deadline))}` : ""}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {planner.units.length > 0 && (
          <CommandGroup heading="Arbetsområden">
            {planner.units.map((u) => {
              const subj = planner.subjects.find((s) => s.id === u.subjectId);
              return (
                <CommandItem key={u.id} value={`arbetsomrade ${u.title} ${subj?.name || ""}`} onSelect={() => go("/lasar")} data-testid={`search-unit-${u.id}`}>
                  <GraduationCap className="h-4 w-4 text-[#5A3B8B]" />
                  <span>{u.title}</span>
                  <span className="text-xs text-[#8A948C] ml-2">{subj?.name}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
