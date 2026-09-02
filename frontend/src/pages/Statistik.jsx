import React, { useMemo, useState } from "react";
import { usePlanner } from "@/context/PlannerContext";
import { getSubjectColor, TERMS, inferCurrentTerm, TREND_SCALE_LABELS } from "@/lib/constants";
import { getISOWeek, toISODate, weekdayIndex, fromISODate, getMondayOfISOWeek } from "@/lib/dateUtils";
import { Card, CardContent } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend, LineChart, Line } from "recharts";
import { BookOpen, CheckCircle2, ListTodo, TrendingUp, Sparkles } from "lucide-react";

const Stat = ({ label, value, hint, icon: Icon, tone = "green" }) => (
  <Card className="border-[#DEDAD2] bg-white shadow-none">
    <CardContent className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] tracking-widest uppercase text-[#A3A69F] font-semibold">{label}</div>
          <div className="font-serif-display text-3xl mt-2 text-[#293330]">{value}</div>
          {hint && <div className="text-xs text-[#78817D] mt-1">{hint}</div>}
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
    <div className="rounded-lg border border-[#DEDAD2] bg-white px-3 py-2 shadow-md text-xs">
      <div className="font-semibold text-[#293330]">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="text-[#78817D] mt-0.5">
          {p.name}: <span className="font-semibold text-[#293330]">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const ColorLegend = ({ title, items, testIdPrefix, selectedId, onSelect }) => (
  <div className="rounded-xl border border-[#DEDAD2] bg-[#FFFEFB] p-3" data-testid={`${testIdPrefix}-panel`}>
    <div className="flex items-center justify-between mb-2">
      <div className="text-[10px] uppercase tracking-widest text-[#A3A69F] font-semibold">{title}</div>
      {selectedId && (
        <button
          onClick={() => onSelect(null)}
          className="text-[10px] text-[#718A7F] hover:underline"
          data-testid={`${testIdPrefix}-clear`}
        >Visa alla</button>
      )}
    </div>
    <ul className="space-y-1">
      {items.map((it, i) => {
        const col = getSubjectColor(it.colorId);
        const swatch = col.text === "#FFFFFF" ? col.bg : col.text;
        const isSelected = selectedId === it.id;
        const dimmed = selectedId && !isSelected;
        return (
          <li key={it.id}>
            <button
              onClick={() => onSelect(isSelected ? null : it.id)}
              className={`w-full flex items-center gap-2 text-xs text-left px-2 py-1 rounded-md transition ${isSelected ? "bg-white shadow-sm border border-[#DEDAD2]" : "hover:bg-white/60"} ${dimmed ? "opacity-40" : ""}`}
              data-testid={`${testIdPrefix}-${it.id}`}
            >
              <span className="inline-block h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: swatch, border: `1px solid ${col.border}` }} />
              <span className="truncate text-[#293330]">{it.label}</span>
            </button>
          </li>
        );
      })}
      <li className="flex items-center gap-2 text-xs text-[#78817D] pt-2 mt-1 border-t border-[#DEDAD2] px-2">
        <span className="inline-block h-3 w-3 rounded-sm flex-shrink-0" style={{ backgroundColor: "#D2E4D5" }} />
        <span>Planerade</span>
      </li>
    </ul>
  </div>
);

export default function Statistik() {
  const planner = usePlanner();
  const { classes, subjects, events, tasks, followups, timetable, autoCompletedSlots = [] } = planner;
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);

  const stats = useMemo(() => {
    const lessons = events.filter((e) => e.type === "lesson");
    const completedLessons = lessons.filter((l) => l.completed);
    const completedAll = completedLessons.length + autoCompletedSlots.length;
    const plannedTotal = lessons.length + timetable.length * 20; // rough estimate: 20 weeks
    const completionRate = lessons.length > 0 ? Math.round((completedLessons.length / lessons.length) * 100) : 0;

    // Per subject: count completed events + autoCompletedSlots (auto ones need slot lookup for subject)
    const bySubject = {};
    subjects.forEach((s) => { bySubject[s.id] = { id: s.id, name: s.name, colorId: s.colorId, planned: 0, completed: 0 }; });
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
    classes.forEach((c) => { byClass[c.id] = { id: c.id, name: c.name, colorId: c.colorId, planned: 0, completed: 0 }; });
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

  // Weekly trend for the active term (falls back to last 12 weeks if term hasn't started yet)
  const weeklyTrend = useMemo(() => {
    const activeTermId = planner.activeTerm === "auto" ? inferCurrentTerm() : planner.activeTerm;
    const [wStart, wEnd] = TERMS[activeTermId].weeks;
    const items = [];
    for (let w = wStart; w <= wEnd; w += 1) items.push({ week: w, key: `w${w}`, lessons: 0, tasks: 0 });
    const keyForDate = (iso) => {
      const [, w] = getISOWeek(fromISODate(iso));
      return `w${w}`;
    };
    const map = Object.fromEntries(items.map((it) => [it.key, it]));
    events.forEach((e) => {
      if (e.type === "lesson" && e.completed) {
        const k = keyForDate(e.date);
        if (map[k]) map[k].lessons += 1;
      }
    });
    autoCompletedSlots.forEach((a) => {
      const k = keyForDate(a.date);
      if (map[k]) map[k].lessons += 1;
    });
    tasks.forEach((t) => {
      if (t.completed && t.deadline) {
        const k = keyForDate(t.deadline);
        if (map[k]) map[k].tasks += 1;
      }
    });
    return items;
  }, [events, tasks, autoCompletedSlots, planner.activeTerm]);

  const filteredSubject = selectedSubject
    ? stats.bySubject.filter((s) => s.id === selectedSubject)
    : stats.bySubject;
  const filteredClass = selectedClass
    ? stats.byClass.filter((c) => c.id === selectedClass)
    : stats.byClass;

  const hasAnyData = classes.length > 0 || subjects.length > 0 || events.length > 0 || (planner.daySummaries || []).length > 0;

  return (
    <div className="space-y-8" data-testid="page-statistik">
      <header>
        <div className="text-[11px] tracking-[0.2em] uppercase text-[#A3A69F] font-semibold">Statistik</div>
        <h1 className="font-serif-display text-4xl mt-1 text-[#293330]">Din progress i siffror</h1>
        <p className="text-sm text-[#78817D] mt-2 max-w-xl">
          En översikt över genomförda lektioner per klass och ämne. Statistik uppdateras automatiskt när du markerar lektioner som genomförda.
        </p>
      </header>

      {!hasAnyData ? (
        <div className="rounded-2xl border border-dashed border-[#DEDAD2] p-10 text-center text-sm text-[#A3A69F]">
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
            <h2 className="font-serif-display text-2xl text-[#293330] mb-3">Per ämne</h2>
            {stats.bySubject.length === 0 ? (
              <div className="text-sm text-[#A3A69F]">Inga ämnen registrerade.</div>
            ) : (
              <Card className="border-[#DEDAD2] shadow-none bg-white">
                <CardContent className="p-5" data-testid="chart-per-subject">
                  <div className="grid md:grid-cols-[1fr,180px] gap-6 items-start">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={filteredSubject} barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#DEDAD2" vertical={false} />
                        <XAxis dataKey="name" stroke="#A3A69F" fontSize={12} />
                        <YAxis stroke="#A3A69F" fontSize={12} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="planned" name="Planerade" fill="#D2E4D5" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="completed" name="Genomförda" radius={[6, 6, 0, 0]}>
                          {filteredSubject.map((entry, i) => {
                            const col = getSubjectColor(entry.colorId);
                            return <Cell key={`sub-${i}`} fill={col.bg && col.bg !== "#FFFFFF" && col.text === "#FFFFFF" ? col.bg : col.text} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <ColorLegend
                      title="Ämnen · klicka för att fokusera"
                      items={stats.bySubject.map((s) => ({ id: s.id, label: s.name, colorId: s.colorId }))}
                      testIdPrefix="legend-subject"
                      selectedId={selectedSubject}
                      onSelect={setSelectedSubject}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          <section>
            <h2 className="font-serif-display text-2xl text-[#293330] mb-3">Per klass</h2>
            {stats.byClass.length === 0 ? (
              <div className="text-sm text-[#A3A69F]">Inga klasser registrerade.</div>
            ) : (
              <Card className="border-[#DEDAD2] shadow-none bg-white">
                <CardContent className="p-5" data-testid="chart-per-class">
                  <div className="grid md:grid-cols-[1fr,180px] gap-6 items-start">
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={filteredClass} layout="vertical" barGap={4}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#DEDAD2" horizontal={false} />
                        <XAxis type="number" stroke="#A3A69F" fontSize={12} allowDecimals={false} />
                        <YAxis type="category" dataKey="name" stroke="#A3A69F" fontSize={12} width={70} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="planned" name="Planerade" fill="#D2E4D5" radius={[0, 6, 6, 0]} />
                        <Bar dataKey="completed" name="Genomförda" radius={[0, 6, 6, 0]}>
                          {filteredClass.map((entry, i) => {
                            const col = getSubjectColor(entry.colorId);
                            return <Cell key={`cls-${i}`} fill={col.bg && col.bg !== "#FFFFFF" && col.text === "#FFFFFF" ? col.bg : col.text} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <ColorLegend
                      title="Klasser · klicka för att fokusera"
                      items={stats.byClass.map((c) => ({ id: c.id, label: c.name, colorId: c.colorId }))}
                      testIdPrefix="legend-class"
                      selectedId={selectedClass}
                      onSelect={setSelectedClass}
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </section>

          <section>
            <h2 className="font-serif-display text-2xl text-[#293330] mb-3">Trend – {(planner.activeTerm === "auto" ? inferCurrentTerm() : planner.activeTerm) === "ht" ? "höstterminen" : "vårterminen"}</h2>
            <Card className="border-[#DEDAD2] shadow-none bg-white">
              <CardContent className="p-5" data-testid="chart-trend">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={weeklyTrend} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DEDAD2" vertical={false} />
                    <XAxis dataKey="week" stroke="#A3A69F" fontSize={12} tickFormatter={(w) => `v${w}`} />
                    <YAxis stroke="#A3A69F" fontSize={12} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} labelFormatter={(w) => `Vecka ${w}`} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="lessons" name="Genomförda lektioner" stroke="#718A7F" strokeWidth={2.5} dot={{ r: 3, fill: "#718A7F" }} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="tasks" name="Klarade uppgifter" stroke="#9E4A3B" strokeWidth={2.5} dot={{ r: 3, fill: "#9E4A3B" }} activeDot={{ r: 5 }} strokeDasharray="4 4" />
                  </LineChart>
                </ResponsiveContainer>
                <div className="text-[11px] text-[#A3A69F] mt-2">Rytmen av lektioner och avklarade uppgifter över terminen.</div>
              </CardContent>
            </Card>
          </section>

          <DayTrendsSection planner={planner} />
        </>
      )}
    </div>
  );
}

const WEEKDAY_LABELS = ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"];

const DayTrendsSection = ({ planner }) => {
  const trends = planner.dayTrends || [];
  const summaries = planner.daySummaries || [];

  const sorted = useMemo(
    () => [...summaries].sort((a, b) => a.date.localeCompare(b.date)),
    [summaries],
  );

  // Series over time – last 30 entries
  const timeSeries = useMemo(() => {
    const items = sorted.slice(-30).map((s) => {
      const row = { date: s.date, label: s.date.slice(5) };
      trends.forEach((t) => {
        if (s.values?.[t.id] != null) row[t.id] = s.values[t.id];
      });
      return row;
    });
    return items;
  }, [sorted, trends]);

  // Averages by weekday (Mon..Fri)
  const weekdayAverages = useMemo(() => {
    const buckets = Array.from({ length: 5 }, (_, i) => ({ weekday: i, label: WEEKDAY_LABELS[i] }));
    trends.forEach((t) => {
      buckets.forEach((b) => { b[`${t.id}_sum`] = 0; b[`${t.id}_count`] = 0; });
    });
    summaries.forEach((s) => {
      const wd = weekdayIndex(s.date);
      if (wd < 0 || wd > 4) return;
      const b = buckets[wd];
      trends.forEach((t) => {
        const v = s.values?.[t.id];
        if (v != null) { b[`${t.id}_sum`] += v; b[`${t.id}_count`] += 1; }
      });
    });
    return buckets.map((b) => {
      const row = { label: b.label };
      trends.forEach((t) => {
        const c = b[`${t.id}_count`];
        row[t.id] = c > 0 ? Number((b[`${t.id}_sum`] / c).toFixed(2)) : null;
      });
      return row;
    });
  }, [summaries, trends]);

  const lastEntry = sorted.length > 0 ? sorted[sorted.length - 1] : null;

  if (trends.length === 0) {
    return (
      <section data-testid="section-daytrends-stats">
        <h2 className="font-serif-display text-2xl text-[#293330] mb-3">Dagliga trender</h2>
        <div className="rounded-2xl border border-dashed border-[#DEDAD2] p-8 text-center text-sm text-[#A3A69F]">
          Inga trender är aktiva. Lägg till dem i Inställningar.
        </div>
      </section>
    );
  }

  if (summaries.length === 0) {
    return (
      <section data-testid="section-daytrends-stats">
        <h2 className="font-serif-display text-2xl text-[#293330] mb-3">Dagliga trender</h2>
        <Card className="border-[#DEDAD2] shadow-none bg-white">
          <CardContent className="p-8 text-center">
            <div className="inline-flex h-10 w-10 rounded-xl bg-[#F6F2FB] text-[#5A3B8B] items-center justify-center mb-3">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="text-sm text-[#78817D]">Fyll i ”Sammanfatta dagen” på Översikt så börjar dina trender byggas upp här.</div>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6" data-testid="section-daytrends-stats">
      <div>
        <h2 className="font-serif-display text-2xl text-[#293330] mb-3">Dagliga trender</h2>
        <Card className="border-[#DEDAD2] shadow-none bg-white">
          <CardContent className="p-5" data-testid="chart-trend-over-time">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[11px] uppercase tracking-widest text-[#A3A69F] font-semibold">Trender över tid</div>
                <div className="text-sm text-[#78817D]">Senaste {timeSeries.length} sammanfattade dagar</div>
              </div>
              {lastEntry && (
                <div className="text-[11px] text-[#A3A69F]">Senaste: {lastEntry.date}</div>
              )}
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={timeSeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DEDAD2" vertical={false} />
                <XAxis dataKey="label" stroke="#A3A69F" fontSize={12} />
                <YAxis stroke="#A3A69F" fontSize={12} domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {trends.map((t) => {
                  const col = getSubjectColor(t.colorId);
                  return (
                    <Line
                      key={t.id}
                      type="monotone"
                      dataKey={t.id}
                      name={t.name}
                      stroke={col.text}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: col.text }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="font-serif-display text-2xl text-[#293330] mb-3">Mönster per veckodag</h2>
        <Card className="border-[#DEDAD2] shadow-none bg-white">
          <CardContent className="p-5" data-testid="chart-trend-weekday">
            <div className="text-[11px] uppercase tracking-widest text-[#A3A69F] font-semibold mb-2">Medelvärde per dag</div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={weekdayAverages} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#DEDAD2" vertical={false} />
                <XAxis dataKey="label" stroke="#A3A69F" fontSize={12} />
                <YAxis stroke="#A3A69F" fontSize={12} domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                {trends.map((t) => {
                  const col = getSubjectColor(t.colorId);
                  return (
                    <Bar key={t.id} dataKey={t.id} name={t.name} fill={col.text} radius={[6, 6, 0, 0]} />
                  );
                })}
              </BarChart>
            </ResponsiveContainer>
            <div className="text-[11px] text-[#A3A69F] mt-2">Se om vissa veckodagar är särskilt energigivande eller tunga.</div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
