import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { usePlanner } from "@/context/PlannerContext";
import { todayISO, formatDateLong, fromISODate, weekdayIndex, getISOWeek, getMondayOfISOWeek, getWeekdays, toISODate } from "@/lib/dateUtils";
import { getSubjectColor } from "@/lib/constants";
import { unitProgress } from "@/lib/plannerHelpers";
import { Card, CardContent } from "@/components/ui/card";
import { Users, BookOpen, ClipboardList, Sparkles, ArrowRight, Check, CheckCircle2 } from "lucide-react";

const Step = ({ done, label, to }) => (
  <Link
    to={to}
    className="flex items-center justify-between px-4 py-3 rounded-xl border border-[#E6E1DA] bg-white hover:bg-[#FAF7F2] transition"
    data-testid={`onboarding-step-${label.toLowerCase().replace(/\s/g, "-")}`}
  >
    <div className="flex items-center gap-3">
      <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold ${done ? "bg-[#EAF0EC] text-[#3D5A45]" : "bg-[#F3EFEA] text-[#656E67]"}`}>
        {done ? <Check className="h-3.5 w-3.5" /> : ""}
      </span>
      <span className="text-sm">{label}</span>
    </div>
    <ArrowRight className="h-4 w-4 text-[#8A948C]" />
  </Link>
);

const StatCard = ({ icon: Icon, label, value, hint, tone = "default" }) => (
  <Card className="border-[#E6E1DA] bg-white shadow-none">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] tracking-widest uppercase text-[#8A948C] font-semibold">{label}</div>
          <div className="font-serif-display text-3xl mt-2 text-[#2D312E]">{value}</div>
          {hint && <div className="text-xs text-[#656E67] mt-1">{hint}</div>}
        </div>
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${tone === "green" ? "bg-[#EFF5F0] text-[#2D5A3A]" : tone === "clay" ? "bg-[#FDF2F0] text-[#9E4A3B]" : tone === "sky" ? "bg-[#F0F5FA] text-[#2C5282]" : "bg-[#F6F2FB] text-[#5A3B8B]"}`}>
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function Oversikt() {
  const { classes, subjects, students, timetable, events, units, tasks, followups, autoCompletedSlots } = usePlanner();
  const today = todayISO();

  const dayIdx = weekdayIndex(new Date());
  const todayIsWeekday = dayIdx >= 0 && dayIdx <= 4;
  const todaysEvents = useMemo(() => events.filter((e) => e.date === today).sort((a, b) => (a.time || "").localeCompare(b.time || "")), [events, today]);
  const todaysSlots = useMemo(
    () => (todayIsWeekday ? timetable.filter((t) => t.weekday === dayIdx && !todaysEvents.some((e) => e.timetableId === t.id)) : []),
    [timetable, dayIdx, todayIsWeekday, todaysEvents],
  );

  const lessonsToday = todaysEvents.filter((e) => e.type === "lesson").length + todaysSlots.length;
  const openTasks = tasks.filter((t) => !t.completed).length;
  const activeUnits = units.length;

  const completedThisWeek = useMemo(() => {
    const [y, w] = getISOWeek(new Date());
    const weekDates = new Set(getWeekdays(getMondayOfISOWeek(y, w)).map(toISODate));
    const completedEvents = events.filter((e) => e.completed && weekDates.has(e.date)).length;
    const autoDone = (autoCompletedSlots || []).filter((a) => weekDates.has(a.date)).length;
    return completedEvents + autoDone;
  }, [events, autoCompletedSlots]);

  const isEmpty = classes.length === 0 && subjects.length === 0 && students.length === 0 && timetable.length === 0 && units.length === 0 && events.length === 0;

  const upcomingFollowups = useMemo(
    () => followups.filter((f) => !f.completed && f.dueDate >= today).sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 5),
    [followups, today],
  );

  return (
    <div className="space-y-8" data-testid="page-oversikt">
      <header className="flex items-end justify-between">
        <div>
          <div className="text-[11px] tracking-[0.2em] uppercase text-[#8A948C] font-semibold">Idag är det {formatDateLong(new Date())}</div>
          <h1 className="font-serif-display text-4xl mt-1 text-[#2D312E]">Översikt</h1>
        </div>
      </header>

      {isEmpty && (
        <Card className="border-[#E6E1DA] bg-white shadow-none" data-testid="onboarding-card">
          <CardContent className="p-8">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-2xl bg-[#EAF0EC] flex items-center justify-center text-[#3D5A45]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-serif-display text-2xl text-[#2D312E]">Din planerare är tom och redo.</h2>
                <p className="text-sm text-[#656E67] mt-1">Följ stegen nedan för att komma igång på några minuter.</p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-2 mt-6">
              <Step done={classes.length > 0} label="1. Lägg till klasser" to="/installningar" />
              <Step done={subjects.length > 0} label="2. Lägg till ämnen" to="/installningar" />
              <Step done={students.length > 0} label="3. Lägg till elever" to="/installningar" />
              <Step done={timetable.length > 0} label="4. Skapa schema" to="/installningar" />
              <Step done={units.length > 0} label="5. Skapa arbetsområde" to="/lasar" />
              <Step done={events.length > 0} label="6. Börja planera" to="/vecka" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={BookOpen} label="Lektioner idag" value={lessonsToday} hint={todayIsWeekday ? "inkl. återkommande" : "Helg"} tone="green" />
        <StatCard icon={CheckCircle2} label="Genomförda denna vecka" value={completedThisWeek} hint="uppdateras automatiskt" tone="lilac" />
        <StatCard icon={ClipboardList} label="Öppna uppgifter" value={openTasks} tone="clay" />
        <StatCard icon={Users} label="Elever" value={students.length} tone="sky" />
      </div>

      <section className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="font-serif-display text-2xl text-[#2D312E]">Idag</h2>
          <TodayList todaysEvents={todaysEvents} todaysSlots={todaysSlots} />
        </div>
        <div className="space-y-3">
          <h2 className="font-serif-display text-2xl text-[#2D312E]">Nästa uppföljningar</h2>
          <FollowupsList followups={upcomingFollowups} />
        </div>
      </section>

      {units.length > 0 && (
        <section>
          <h2 className="font-serif-display text-2xl text-[#2D312E] mb-3">Arbetsområden</h2>
          <div className="grid md:grid-cols-2 gap-3">
            {units.slice(0, 4).map((u) => {
              const { done, total } = unitProgress(u, events);
              const pct = total > 0 ? Math.round((done / total) * 100) : 0;
              return (
                <div key={u.id} className="rounded-xl border border-[#E6E1DA] p-4 bg-white">
                  <div className="text-sm font-semibold">{u.title}</div>
                  <div className="text-xs text-[#8A948C] mt-1">v{u.startWeek}–{u.endWeek}</div>
                  <div className="h-1.5 bg-[#F3EFEA] rounded-full mt-3 overflow-hidden">
                    <div className="h-full bg-[#3D5A45]" style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-xs text-[#656E67] mt-1">{done} / {total} lektioner klara</div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

const TodayList = ({ todaysEvents, todaysSlots }) => {
  const { classes, subjects } = usePlanner();
  const nameOf = (id, list) => list.find((x) => x.id === id)?.name || "—";
  const total = todaysEvents.length + todaysSlots.length;
  if (total === 0)
    return <div className="rounded-xl border border-dashed border-[#E6E1DA] p-6 text-sm text-[#8A948C]">Inget planerat för idag.</div>;
  const rows = [
    ...todaysSlots.map((s) => ({ time: s.time, title: s.defaultTitle || "", classId: s.classId, subjectId: s.subjectId, virtual: true, id: `s-${s.id}` })),
    ...todaysEvents.map((e) => ({ time: e.time, title: e.title, classId: e.classId, subjectId: e.subjectId, id: e.id, type: e.type })),
  ].sort((a, b) => (a.time || "").localeCompare(b.time || ""));
  return (
    <div className="space-y-2">
      {rows.map((r) => {
        const subj = subjects.find((s) => s.id === r.subjectId);
        const color = subj ? getSubjectColor(subj.colorId) : null;
        return (
          <div key={r.id} className="flex items-center gap-4 rounded-xl border border-[#E6E1DA] bg-white p-3">
            <div className="w-14 text-sm font-semibold tabular-nums text-[#2D312E]">{r.time || "—"}</div>
            {subj && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border font-semibold"
                style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}>
                {subj.name}
              </span>
            )}
            <div className="text-sm text-[#656E67]">{nameOf(r.classId, classes)}</div>
            <div className="text-sm text-[#2D312E] flex-1 truncate">{r.title}</div>
            {r.virtual && <span className="text-[10px] text-[#8A948C]">Återkommande</span>}
          </div>
        );
      })}
    </div>
  );
};

const FollowupsList = ({ followups }) => {
  const { students } = usePlanner();
  if (followups.length === 0)
    return <div className="rounded-xl border border-dashed border-[#E6E1DA] p-6 text-sm text-[#8A948C]">Inga kommande uppföljningar.</div>;
  return (
    <div className="space-y-2">
      {followups.map((f) => {
        const student = students.find((s) => s.id === f.studentId);
        return (
          <div key={f.id} className="rounded-xl border border-[#E6E1DA] bg-white p-3">
            <div className="text-sm">{f.description}</div>
            <div className="text-xs text-[#8A948C] mt-1">{student?.name} · {formatDateLong(fromISODate(f.dueDate))}</div>
          </div>
        );
      })}
    </div>
  );
};
