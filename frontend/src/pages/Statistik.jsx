import React, { useMemo } from "react";
import { usePlanner } from "@/context/PlannerContext";
import { getSubjectColor } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from "recharts";
import { BookOpen, CheckCircle2, ListTodo, TrendingUp } from "lucide-react";

const Stat = ({ label, value, hint, icon: Icon, tone = "green" }) => (
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

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-[#E6E1DA] bg-white px-3 py-2 shadow-md text-xs">
      <div className="font-semibold text-[#2D312E]">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="text-[#656E67] mt-0.5">
          {p.name}: <span className="font-semibold text-[#2D312E]">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const ColorLegend = ({ title, items, testIdPrefix }) => (
  <div className="rounded-xl border border-[#E6E1DA] bg-[#FAF7F2] p-3" data-testid={`${testIdPrefix}-panel`}>
    <div className="text-[10px] uppercase tracking-widest text-[#8A948C] font-semibold mb-2">{title}</div>
    <ul className="space-y-1.5">
      {items.map((it, i) => {
        const col = getSubjectColor(it.colorId);
        const swatch = col.text === "#FFFFFF" ? col.bg : col.text;
        return (
          <li key={i} className="flex items-center gap-2 text-xs text-[#2D312E]" data-testid={`${testIdPrefix}-${i}`}>
            <span className="inline-block h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: swatch, border: `1px solid ${col.border}` }} />
            <span className="truncate">{it.label}</span>
          </li>
        );
      })}
      <li className="flex items-center gap-2 text-xs text-[#656E67] pt-1 mt-1 border-t border-[#E6E1DA]">
        <span className="inline-block h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: "#D2E4D5" }} />
        <span>Planerade</span>
      </li>
    </ul>
  </div>
);

export default function Statistik() {
  const { classes, subjects, events, tasks, followups, timetable, autoCompletedSlots = [] } = usePlanner();

  const stats = useMemo(() => {
    const lessons = events.filter((e) => e.type === "lesson");
    const completedLessons = lessons.filter((l) => l.completed);
    const completedAll = completedLessons.length + autoCompletedSlots.length;
    const plannedTotal = lessons.length + timetable.length * 20; // rough estimate: 20 weeks
    const completionRate = lessons.length > 0 ? Math.round((completedLessons.length / lessons.length) * 100) : 0;

    // Per subject: count completed events + autoCompletedSlots (auto ones need slot lookup for subject)
    const bySubject = {};
    subjects.forEach((s) => { bySubject[s.id] = { name: s.name, colorId: s.colorId, planned: 0, completed: 0 }; });
    lessons.forEach((l) => {
      if (l.subjectId && bySubject[l.subjectId]) {
        bySubject[l.subjectId].planned += 1;
        if (l.completed) bySubject[l.subjectId].completed += 1;
      }
    });
    autoCompletedSlots.forEach((a) => {
      const slot = timetable.find((t) => t.id === a.slotId);
      if (slot && bySubject[slot.subjectId]) bySubject[slot.subjectId].completed += 1;
    });

    // Per class
    const byClass = {};
    classes.forEach((c) => { byClass[c.id] = { name: c.name, colorId: c.colorId, planned: 0, completed: 0 }; });
    lessons.forEach((l) => {
      if (l.classId && byClass[l.classId]) {
        byClass[l.classId].planned += 1;
        if (l.completed) byClass[l.classId].completed += 1;
      }
    });
    autoCompletedSlots.forEach((a) => {
      const slot = timetable.find((t) => t.id === a.slotId);
      if (slot && byClass[slot.classId]) byClass[slot.classId].completed += 1;
    });

    return {
      totalPlanned: lessons.length,
      totalCompleted: completedAll,
      completionRate,
      openTasks: tasks.filter((t) => !t.completed).length,
      openFollowups: followups.filter((f) => !f.completed).length,
      bySubject: Object.values(bySubject),
      byClass: Object.values(byClass),
    };
  }, [events, subjects, classes, tasks, followups, timetable, autoCompletedSlots]);

  const hasAnyData = classes.length > 0 || subjects.length > 0 || events.length > 0;

  return (
    <div className="space-y-8" data-testid="page-statistik">
      <header>
        <div className="text-[11px] tracking-[0.2em] uppercase text-[#8A948C] font-semibold">Statistik</div>
        <h1 className="font-serif-display text-4xl mt-1 text-[#2D312E]">Din progress i siffror</h1>
        <p className="text-sm text-[#656E67] mt-2 max-w-xl">
          En översikt över genomförda lektioner per klass och ämne. Statistik uppdateras automatiskt när du markerar lektioner som genomförda.
        </p>
      </header>

      {!hasAnyData ? (
        <div className="rounded-2xl border border-dashed border-[#E6E1DA] p-10 text-center text-sm text-[#8A948C]">
          Inget att visa ännu. Lägg till klasser, ämnen och lektioner så börjar din statistik byggas upp här.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Planerade lektioner" value={stats.totalPlanned} icon={BookOpen} tone="sky" />
            <Stat label="Genomförda" value={stats.totalCompleted} hint="manuellt + automatiskt" icon={CheckCircle2} tone="green" />
            <Stat label="Färdigmarkerat" value={`${stats.completionRate}%`} icon={TrendingUp} tone="lilac" />
            <Stat label="Öppna uppgifter" value={stats.openTasks} hint={`${stats.openFollowups} uppföljningar`} icon={ListTodo} tone="clay" />
          </div>

          <section>
            <h2 className="font-serif-display text-2xl text-[#2D312E] mb-3">Per ämne</h2>
            {stats.bySubject.length === 0 ? (
              <div className="text-sm text-[#8A948C]">Inga ämnen registrerade.</div>
            ) : (
              <Card className="border-[#E6E1DA] shadow-none bg-white">
                <CardContent className="p-5" data-testid="chart-per-subject">
                  <div className="grid md:grid-cols-[1fr,180px] gap-6 items-start">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={stats.bySubject} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E6E1DA" vertical={false} />
                        <XAxis dataKey="name" stroke="#8A948C" fontSize={12} />
                        <YAxis stroke="#8A948C" fontSize={12} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="planned" name="Planerade" fill="#D2E4D5" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="completed" name="Genomförda" radius={[6, 6, 0, 0]}>
                          {stats.bySubject.map((entry, i) => {
                            const col = getSubjectColor(entry.colorId);
                            return <Cell key={`sub-${i}`} fill={col.bg && col.bg !== "#FFFFFF" && col.text === "#FFFFFF" ? col.bg : col.text} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <ColorLegend
                      title="Ämnen"
                      items={stats.bySubject.map((s) => ({ label: s.name, colorId: s.colorId }))}
                      testIdPrefix="legend-subject"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          <section>
            <h2 className="font-serif-display text-2xl text-[#2D312E] mb-3">Per klass</h2>
            {stats.byClass.length === 0 ? (
              <div className="text-sm text-[#8A948C]">Inga klasser registrerade.</div>
            ) : (
              <Card className="border-[#E6E1DA] shadow-none bg-white">
                <CardContent className="p-5" data-testid="chart-per-class">
                  <div className="grid md:grid-cols-[1fr,180px] gap-6 items-start">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={stats.byClass} layout="vertical" barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E6E1DA" horizontal={false} />
                        <XAxis type="number" stroke="#8A948C" fontSize={12} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" stroke="#8A948C" fontSize={12} width={70} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="planned" name="Planerade" fill="#D2E4D5" radius={[0, 6, 6, 0]} />
                        <Bar dataKey="completed" name="Genomförda" radius={[0, 6, 6, 0]}>
                          {stats.byClass.map((entry, i) => {
                            const col = getSubjectColor(entry.colorId);
                            return <Cell key={`cls-${i}`} fill={col.bg && col.bg !== "#FFFFFF" && col.text === "#FFFFFF" ? col.bg : col.text} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <ColorLegend
                      title="Klasser"
                      items={stats.byClass.map((c) => ({ label: c.name, colorId: c.colorId }))}
                      testIdPrefix="legend-class"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </section>
        </>
      )}
    </div>
  );
}
