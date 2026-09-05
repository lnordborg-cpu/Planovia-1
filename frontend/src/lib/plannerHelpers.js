import { toISODate, getMondayOfISOWeek, getWeekdays, dateInRange, weekdayIndex } from "./dateUtils";
import { PRIORITY_VALUES } from "./constants";
import { expandEventsInRange } from "./recurrence";

// For given ISO year+week, return array of 5 day objects
export const buildWeekData = ({ year, week, timetable, events, calendarExceptions, followups, autoCompletedSlots = [] }) => {
  const monday = getMondayOfISOWeek(year, week);
  const days = getWeekdays(monday);
  const rangeStart = toISODate(days[0]);
  const rangeEnd = toISODate(days[days.length - 1]);
  const expanded = expandEventsInRange(events, rangeStart, rangeEnd);
  const autoSet = new Set(autoCompletedSlots.map((a) => `${a.slotId}|${a.date}`));
  return days.map((date, i) => {
    const iso = toISODate(date);

    // exceptions covering this date
    const exceptionsOnDate = calendarExceptions.filter((e) => dateInRange(iso, e.startDate, e.endDate));
    const hideRegular = exceptionsOnDate.some((e) => e.hideRegularLessons);

    const dayEvents = expanded.filter((e) => e.date === iso);

    // Timetable slots for this weekday, unless a manual lesson already exists at the same time+class+subject
    const slots = hideRegular
      ? []
      : timetable
          .filter((t) => t.weekday === i)
          .filter((t) => !dayEvents.some((ev) => ev.timetableId === t.id))
          .map((t) => ({ ...t, autoCompleted: autoSet.has(`${t.id}|${iso}`) }));

    const dayFollowups = followups.filter((f) => f.dueDate === iso);

    return {
      date,
      iso,
      weekdayIndex: i,
      events: dayEvents,
      slots,
      exceptions: exceptionsOnDate,
      hideRegular,
      followups: dayFollowups,
    };
  });
};

// Sort tasks: unfinished first (overdue, today, nearest deadline, priority), completed after
export const sortTasks = (tasks, todayIso) => {
  const active = tasks.filter((t) => !t.completed);
  const done = tasks.filter((t) => t.completed);

  const rank = (t) => {
    const d = t.deadline;
    if (!d) return 3;
    if (d < todayIso) return 0; // overdue
    if (d === todayIso) return 1;
    return 2;
  };

  active.sort((a, b) => {
    const rA = rank(a); const rB = rank(b);
    if (rA !== rB) return rA - rB;
    // nearest deadline
    if (a.deadline && b.deadline && a.deadline !== b.deadline) return a.deadline.localeCompare(b.deadline);
    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;
    // priority desc
    const pA = PRIORITY_VALUES[a.priority] ?? 0;
    const pB = PRIORITY_VALUES[b.priority] ?? 0;
    return pB - pA;
  });

  done.sort((a, b) => (b.deadline || "").localeCompare(a.deadline || ""));

  return [...active, ...done];
};

// Unit progress: how many linked events completed vs total
export const unitProgress = (unit, events) => {
  const linked = events.filter((e) => e.unitId === unit.id && e.type === "lesson");
  const done = linked.filter((e) => e.completed).length;
  return { done, total: linked.length };
};

// Derived materials: aggregate all materials across events + standalone
export const allMaterials = (events, classes, subjects, standaloneMaterials = []) => {
  const list = [];
  events.forEach((ev) => {
    (ev.materials || []).forEach((m) => {
      list.push({
        id: `${ev.id}:${m.id}`,
        source: "event",
        eventId: ev.id,
        materialId: m.id,
        name: m.name,
        url: m.url,
        isFile: m.isFile,
        mimeType: m.mimeType,
        size: m.size,
        date: ev.date,
        classId: ev.classId,
        subjectId: m.subjectId || ev.subjectId,
        subcategory: m.subcategory || null,
        eventTitle: ev.title,
      });
    });
  });
  standaloneMaterials.forEach((m) => {
    list.push({
      id: `standalone:${m.id}`,
      source: "standalone",
      standaloneId: m.id,
      name: m.name,
      url: m.url,
      isFile: m.isFile,
      mimeType: m.mimeType,
      size: m.size,
      date: (m.createdAt || "").slice(0, 10),
      classId: null,
      subjectId: m.subjectId || null,
      subcategory: m.subcategory || "Övrigt",
      eventTitle: null,
    });
  });
  return list;
};

export { weekdayIndex };
