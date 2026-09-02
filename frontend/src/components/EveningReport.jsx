import React, { useMemo } from "react";
import { usePlanner } from "@/context/PlannerContext";
import { todayISO, weekdayIndex } from "@/lib/dateUtils";
import { Moon } from "lucide-react";

// Handpicked Swedish evening reflections. Rotates deterministically per date.
const EVENING_REFLECTIONS = [
  "Dagen behöver inte vara perfekt för att vara värdefull.",
  "Du har fyllt dagen med det som mattrar. Nu är det din tur.",
  "Även små steg är rörelse framåt.",
  "Det är okej att stänga av. Eleverna finns kvar imorgon.",
  "En lärare som vilar är en lärare som lär bättre.",
  "Du har gjort ditt bästa idag – det är alltid nog.",
  "Andas ut. Skuldrorna får också sluta för dagen.",
  "Den bästa planeringen är den som lämnar plats för dig själv.",
  "Kvällen är inte en fortsättning på arbetsdagen.",
  "Tack för allt du gav idag. Nu tar vi hand om dig.",
  "Ingen läroplan mäter det goda du sådde idag.",
  "Ge dig själv samma vänlighet du gav dina elever.",
  "En kopp te, en stund utan skärm – det är också planering.",
  "Du är mer än det du hann med idag.",
  "Det finns inget rätt sätt att avsluta en skoldag – bara ditt.",
  "Reflektera gärna, men grubbla inte. Godnattstunden är för lugn.",
  "Även på tröga dagar plockar barn upp mer än vi tror.",
  "Slut ögonen ett ögonblick. Bara vara.",
  "Morgondagen väntar utan att kräva något av dig just nu.",
  "Du är någon som betyder något för någon.",
  "Vardagsmagi räknas – även när ingen ser den.",
  "Läggen bort dagens brus. Det får sortera sig självt.",
  "Du bär tunga stunder med varsam hand. Det är fint gjort.",
  "Fötterna upp. Blicken mjuk. Kvällen är din.",
  "Det bästa du kan planera nu är sömn.",
];

// Deterministic index from an ISO date string
const dateHash = (iso) => {
  let h = 0;
  for (let i = 0; i < iso.length; i += 1) h = (h * 31 + iso.charCodeAt(i)) >>> 0;
  return h;
};

// Determines whether evening mode is *actively* on for the user right now
export const useIsEveningActive = () => {
  const planner = usePlanner();
  return React.useMemo(() => {
    if (planner.eveningMode === "on") return true;
    if (planner.eveningMode === "off") return false;
    const h = new Date().getHours();
    return h >= 20 || h < 5;
  }, [planner.eveningMode]);
};

export default function EveningReport() {
  const planner = usePlanner();
  const isEvening = useIsEveningActive();
  const today = todayISO();

  const { lessonsDone, tasksDone } = useMemo(() => {
    // Completed lessons today (manual + auto)
    const manualLessons = planner.events.filter(
      (e) => e.date === today && e.type === "lesson" && e.completed,
    ).length;
    const autoLessons = (planner.autoCompletedSlots || []).filter((a) => a.date === today).length;

    // Tasks completed today – prefer completedAt timestamp; fall back to deadline===today
    const tasksToday = planner.tasks.filter((t) => {
      if (!t.completed) return false;
      if (t.completedAt) return t.completedAt.slice(0, 10) === today;
      return t.deadline === today;
    }).length;

    return { lessonsDone: manualLessons + autoLessons, tasksDone: tasksToday };
  }, [planner.events, planner.autoCompletedSlots, planner.tasks, today]);

  if (!isEvening) return null;

  const nothingHappened = lessonsDone === 0 && tasksDone === 0;
  const wd = weekdayIndex(new Date());
  const isWeekend = wd > 4;

  // Small, personalised message
  const encouragement = (() => {
    if (nothingHappened) {
      return isWeekend
        ? "En stilla helgkväll. Vila upp dig till nästa vecka."
        : "En lugn kväll. Vila – imorgon är en ny dag.";
    }
    if (lessonsDone >= 4 || tasksDone >= 4) return "Vilken produktiv dag! Väl förtjänt vila nu.";
    if (lessonsDone > 0 && tasksDone > 0) return "Bra jobbat idag. Nu är det din tid.";
    if (lessonsDone > 0) return "Skönt att lektionerna är avklarade.";
    return "Fina steg framåt idag.";
  })();

  const parts = [];
  if (lessonsDone > 0) parts.push(`${lessonsDone} lektion${lessonsDone === 1 ? "" : "er"}`);
  if (tasksDone > 0) parts.push(`${tasksDone} uppgift${tasksDone === 1 ? "" : "er"}`);
  const summary = nothingHappened
    ? "Idag noterades inga avklarade lektioner eller uppgifter."
    : `Idag klarade du ${parts.join(" och ")}.`;

  const reflection = EVENING_REFLECTIONS[dateHash(today) % EVENING_REFLECTIONS.length];

  return (
    <div
      className="rounded-2xl border border-[#3B4A5A] p-5 flex items-start gap-4 shadow-none"
      style={{
        background: "linear-gradient(135deg, #2A3441 0%, #3B4A5A 100%)",
        color: "#E8E5DE",
      }}
      data-testid="evening-report"
    >
      <div className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: "rgba(232,229,222,0.12)" }}>
        <Moon className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <div className="flex-1">
        <div className="text-[11px] uppercase tracking-[0.2em] font-semibold" style={{ color: "#B8B0A3" }}>Nattlig rapport</div>
        <div className="font-serif-display text-2xl mt-1" style={{ color: "#F1EBDD" }}>{summary}</div>
        <div className="text-sm mt-2" style={{ color: "#B8B0A3" }}>{encouragement}</div>
        <div
          className="mt-4 pt-4 border-t italic text-[15px] leading-relaxed"
          style={{ borderColor: "rgba(232,229,222,0.18)", color: "#D8D1BF" }}
          data-testid="evening-reflection"
        >
          <span aria-hidden="true" style={{ color: "#B8B0A3" }}>“</span>
          {reflection}
          <span aria-hidden="true" style={{ color: "#B8B0A3" }}>”</span>
        </div>
      </div>
    </div>
  );
}
