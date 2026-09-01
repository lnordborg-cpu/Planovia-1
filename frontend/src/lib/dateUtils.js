// ISO week helpers (Sweden uses ISO weeks, Monday first)

export const pad = (n) => String(n).padStart(2, "0");

export const toISODate = (d) => {
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  return `${y}-${m}-${day}`;
};

export const fromISODate = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Returns [year, week] (ISO)
export const getISOWeek = (date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return [d.getUTCFullYear(), weekNo];
};

// Get Monday date (local) for a given ISO year+week
export const getMondayOfISOWeek = (year, week) => {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = new Date(simple);
  if (dow <= 4) ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  return ISOweekStart;
};

// Given a monday, produce array of 5 dates (Mon..Fri)
export const getWeekdays = (monday) => {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
};

export const addWeeks = (date, weeks) => {
  const d = new Date(date);
  d.setDate(d.getDate() + weeks * 7);
  return d;
};

export const isSameDate = (a, b) => toISODate(a) === toISODate(b);

export const formatDateLong = (d) => {
  const months = ["januari","februari","mars","april","maj","juni","juli","augusti","september","oktober","november","december"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
};

export const formatDateShort = (d) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;

export const todayISO = () => toISODate(new Date());

// dateOrISO -> weekday index Mon=0..Sun=6
export const weekdayIndex = (dateOrISO) => {
  const d = typeof dateOrISO === "string" ? fromISODate(dateOrISO) : dateOrISO;
  const js = d.getDay(); // 0 Sun ... 6 Sat
  return (js + 6) % 7;
};

export const dateInRange = (iso, startIso, endIso) => {
  return iso >= startIso && iso <= endIso;
};
