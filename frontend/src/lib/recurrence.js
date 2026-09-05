// Recurrence expansion for meeting events.
// Recurrence shape stored on the template event:
//   recurrence: {
//     frequency: 'daily' | 'weekly' | 'monthly',
//     interval:  1..N (e.g. 2 = every second),
//     ends:      { type: 'never' } | { type: 'date', date: 'YYYY-MM-DD' } | { type: 'count', count: N },
//     exceptions: ['YYYY-MM-DD', …]      // skip / override list
//   }
//   seriesId:  'srs_…'  shared identifier used for the series
//
// A recurring event is stored ONCE (the template). Its `date` field is the FIRST
// occurrence. Virtual future occurrences are generated on-the-fly.

import { fromISODate, toISODate, dateInRange } from "./dateUtils";

const clone = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

const advance = (date, rec) => {
  const d = clone(date);
  const interval = Math.max(1, rec.interval || 1);
  switch (rec.frequency) {
    case "daily":
      d.setDate(d.getDate() + interval);
      break;
    case "weekly":
      d.setDate(d.getDate() + 7 * interval);
      break;
    case "monthly": {
      const day = d.getDate();
      d.setDate(1);
      d.setMonth(d.getMonth() + interval);
      // Clamp to last day of month if the target month is shorter
      const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(day, dim));
      break;
    }
    default:
      d.setDate(d.getDate() + 7);
  }
  return d;
};

/**
 * Given a single template event and a date range, return the list of occurrence dates
 * (ISO) that fall within [rangeStartISO, rangeEndISO]. The template event itself is included
 * if its date is in range and not excepted.
 */
export const occurrencesInRange = (event, rangeStartISO, rangeEndISO) => {
  if (!event?.recurrence || !event.date) return [];
  const rec = event.recurrence;
  const start = fromISODate(event.date);
  const rangeEnd = fromISODate(rangeEndISO);
  const exceptions = new Set(rec.exceptions || []);
  const results = [];
  let i = 0;
  let cursor = clone(start);
  const hardCap = 2000; // safety
  while (i < hardCap) {
    const iso = toISODate(cursor);
    // Check "ends" condition
    if (rec.ends?.type === "date" && rec.ends.date && iso > rec.ends.date) break;
    if (rec.ends?.type === "count" && (rec.ends.count || 0) > 0 && i >= rec.ends.count) break;
    if (cursor > rangeEnd) break;
    if (!exceptions.has(iso) && dateInRange(iso, rangeStartISO, rangeEndISO)) {
      results.push(iso);
    }
    cursor = advance(cursor, rec);
    i += 1;
  }
  return results;
};

/**
 * Expand every recurring event into virtual occurrences within [rangeStartISO, rangeEndISO].
 * Non-recurring events are passed through unchanged.
 * Virtual occurrences have the same fields as the template but with `date` set to
 * the occurrence date and two markers: `_seriesTemplateId` and `_isSeriesOccurrence`.
 * The original template date's own occurrence is emitted as the concrete event.
 */
export const expandEventsInRange = (events, rangeStartISO, rangeEndISO) => {
  const out = [];
  for (const ev of events) {
    if (!ev.recurrence) { out.push(ev); continue; }
    const isoDates = occurrencesInRange(ev, rangeStartISO, rangeEndISO);
    for (const iso of isoDates) {
      if (iso === ev.date) {
        out.push(ev); // the template's own date – emit as-is
      } else {
        out.push({
          ...ev,
          id: `${ev.id}__${iso}`,
          date: iso,
          _seriesTemplateId: ev.id,
          _isSeriesOccurrence: true,
          completed: false, // per-instance state doesn't leak into future
        });
      }
    }
  }
  return out;
};

// Human-friendly Swedish description of a recurrence pattern
export const describeRecurrence = (rec) => {
  if (!rec) return "";
  const i = Math.max(1, rec.interval || 1);
  let base = "";
  if (rec.frequency === "daily") base = i === 1 ? "Varje dag" : `Var ${i}:e dag`;
  else if (rec.frequency === "weekly") base = i === 1 ? "Varje vecka" : i === 2 ? "Varannan vecka" : i === 3 ? "Var tredje vecka" : i === 4 ? "Var fjärde vecka" : `Var ${i}:e vecka`;
  else if (rec.frequency === "monthly") base = i === 1 ? "Varje månad" : `Var ${i}:e månad`;
  else base = "Återkommer";
  if (rec.ends?.type === "date" && rec.ends.date) base += ` t.o.m. ${rec.ends.date}`;
  else if (rec.ends?.type === "count" && rec.ends.count) base += ` · ${rec.ends.count} tillfällen`;
  return base;
};
