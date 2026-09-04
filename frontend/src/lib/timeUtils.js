// Time utility helpers for lessons & meetings.
// A "time string" is "HH:MM" (24h). Anything else returns null / falls back.

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const isValidTime = (t) => typeof t === "string" && HHMM_RE.test(t);

export const toMinutes = (t) => {
  if (!isValidTime(t)) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export const fromMinutes = (min) => {
  const clamped = Math.max(0, Math.min(24 * 60 - 1, Math.floor(min)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export const addMinutes = (t, delta) => {
  const m = toMinutes(t);
  if (m == null) return null;
  return fromMinutes(m + delta);
};

// Duration between two HH:MM strings in minutes. Undefined/invalid => null.
export const durationMinutes = (start, end) => {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s == null || e == null) return null;
  return e - s;
};

// Default lesson length used when an event has only a startTime.
export const DEFAULT_LESSON_MINUTES = 60;

/**
 * Given a partial event/slot with `time` (start) and optional `endTime`,
 * return `{start, end}` in HH:MM (backfilling end from start + defaultMinutes).
 */
export const normaliseSlotTimes = (obj, defaultMinutes = DEFAULT_LESSON_MINUTES) => {
  const start = obj?.time && isValidTime(obj.time) ? obj.time : null;
  let end = obj?.endTime && isValidTime(obj.endTime) ? obj.endTime : null;
  if (start && !end) end = addMinutes(start, defaultMinutes);
  return { start, end };
};

// Two intervals overlap if start1 < end2 AND start2 < end1 (open intervals).
export const rangesOverlap = (aStart, aEnd, bStart, bEnd) => {
  const as = toMinutes(aStart);
  const ae = toMinutes(aEnd);
  const bs = toMinutes(bStart);
  const be = toMinutes(bEnd);
  if (as == null || ae == null || bs == null || be == null) return false;
  return as < be && bs < ae;
};

// Format an event's time range as "08:20–09:20"
export const formatTimeRange = (start, end) => {
  if (!isValidTime(start)) return "";
  if (isValidTime(end) && end !== start) return `${start}–${end}`;
  return start;
};

// Validate & normalise a "user submitted" pair. Returns { ok, message, start, end }.
export const validateTimePair = (start, end, { minLen = 5 } = {}) => {
  if (!isValidTime(start)) return { ok: false, message: "Ange en giltig starttid.", start, end };
  const finalEnd = isValidTime(end) ? end : addMinutes(start, DEFAULT_LESSON_MINUTES);
  const dur = durationMinutes(start, finalEnd);
  if (dur == null) return { ok: false, message: "Ange en giltig sluttid.", start, end: finalEnd };
  if (dur <= 0) return { ok: false, message: "Sluttiden måste vara efter starttiden.", start, end: finalEnd };
  if (dur < minLen) return { ok: false, message: `Lektionen är kortare än ${minLen} minuter.`, start, end: finalEnd };
  return { ok: true, start, end: finalEnd };
};

/**
 * Find scheduled items that overlap a proposed interval on the same date.
 * @param items All events + timetable slot-instances for that date, shape:
 *   { id, title, startTime, endTime, kind: 'lesson'|'meeting'|'slot'|'utvecklingssamtal' }
 * @param excludeId id to skip (the event being edited)
 * @returns list of overlapping items
 */
export const findOverlaps = (items, start, end, excludeId = null) => {
  if (!isValidTime(start) || !isValidTime(end)) return [];
  return items.filter((it) => {
    if (excludeId && it.id === excludeId) return false;
    if (!it.startTime || !it.endTime) return false;
    return rangesOverlap(start, end, it.startTime, it.endTime);
  });
};
