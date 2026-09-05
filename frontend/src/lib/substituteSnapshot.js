import { formatDateShort, fromISODate, getMondayOfISOWeek, getWeekdays, toISODate } from "@/lib/dateUtils";
import { WEEKDAYS, getSubjectColor, getExceptionType } from "@/lib/constants";
import { formatTimeRange } from "@/lib/timeUtils";
import { expandEventsInRange } from "@/lib/recurrence";

// Build a self-contained snapshot of the given week ready to render by /vikarie/{token}
// The substitute doesn't need any of the teacher's private data other than what's here.
export const buildSubstituteSnapshot = ({ year, week, planner }) => {
  const monday = getMondayOfISOWeek(year, week);
  const days = getWeekdays(monday); // 5 weekdays Mon-Fri
  const rangeStart = toISODate(days[0]);
  const rangeEnd = toISODate(days[days.length - 1]);
  const expanded = expandEventsInRange(planner.events || [], rangeStart, rangeEnd);

  const classOf = (id) => planner.classes.find((c) => c.id === id) || null;
  const subjectOf = (id) => planner.subjects.find((s) => s.id === id) || null;
  const unitOf = (id) => planner.units.find((u) => u.id === id) || null;
  const colorOf = (subj) => (subj ? getSubjectColor(subj.colorId) : null);

  const mapMaterials = (mats = []) =>
    mats.map((m) => ({
      name: m.name || "",
      url: m.url || null,
      isFile: !!m.isFile,
      mime: m.mimeType || null,
    }));

  const dayPayload = (date, idx) => {
    const iso = toISODate(date);
    const exceptionsOnDate = (planner.calendarExceptions || []).filter(
      (ex) => iso >= ex.startDate && iso <= ex.endDate,
    );
    const hideRegular = exceptionsOnDate.some((e) => e.hideRegularLessons);

    const dayEvents = expanded.filter((e) => e.date === iso);

    const slots = hideRegular
      ? []
      : (planner.timetable || [])
          .filter((t) => t.weekday === idx)
          .filter((t) => !dayEvents.some((ev) => ev.timetableId === t.id));

    // Merge into a single sorted "items" array by start time.
    const rows = [];

    dayEvents.forEach((ev) => {
      const klass = classOf(ev.classId);
      const subj = subjectOf(ev.subjectId);
      const unit = unitOf(ev.unitId);
      rows.push({
        kind: ev.type || "lesson",
        title: ev.title || (ev.type === "meeting" ? "Möte" : "Lektion"),
        time: ev.time || "",
        end_time: ev.endTime || "",
        time_range: formatTimeRange(ev.time, ev.endTime),
        class_name: klass?.name || null,
        subject_name: subj?.name || null,
        subject_color: colorOf(subj),
        location: ev.location || null,
        unit_title: unit?.title || null,
        goals: ev.goals || null,
        plan: ev.plan || null,
        preparation: ev.preparation || null,
        homework: ev.homework || null,
        notes: ev.notes || null,
        substitute_note: ev.substituteNote || null,
        materials: mapMaterials(ev.materials),
        meeting_type: ev.meetingType || null,
        participants: ev.type === "meeting" ? ev.participants || null : null,
      });
    });

    slots.forEach((slot) => {
      const klass = classOf(slot.classId);
      const subj = subjectOf(slot.subjectId);
      rows.push({
        kind: "timetable",
        title: slot.defaultTitle || subj?.name || "Lektion",
        time: slot.time || "",
        end_time: slot.endTime || "",
        time_range: formatTimeRange(slot.time, slot.endTime),
        class_name: klass?.name || null,
        subject_name: subj?.name || null,
        subject_color: colorOf(subj),
        location: null,
        unit_title: null,
        goals: null,
        plan: null,
        preparation: null,
        homework: null,
        notes: null,
        substitute_note: null,
        materials: [],
      });
    });

    rows.sort((a, b) => (a.time || "").localeCompare(b.time || ""));

    return {
      iso,
      weekday_name: WEEKDAYS[idx],
      date_short: formatDateShort(date),
      exceptions: exceptionsOnDate.map((ex) => ({
        type: ex.type,
        type_label: getExceptionType(ex.type).label,
        title: ex.title,
      })),
      hide_regular: hideRegular,
      items: rows,
    };
  };

  return {
    version: 1,
    year,
    week,
    teacher_name: (planner.userName || "").trim() || null,
    monday_iso: toISODate(days[0]),
    friday_iso: toISODate(days[days.length - 1]),
    days: days.map(dayPayload),
  };
};

export const shortWeekLabel = (year, week) => {
  const monday = getMondayOfISOWeek(year, week);
  const friday = getWeekdays(monday)[4];
  return `Vecka ${week} · ${formatDateShort(monday)} – ${formatDateShort(friday)} · ${year}`;
};
