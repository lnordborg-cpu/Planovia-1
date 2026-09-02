// Rule-based insights derived from planner.daySummaries.
// No AI – deterministic, private, runs in the browser.
import { weekdayIndex } from "@/lib/dateUtils";

const WEEKDAY_LABELS_SHORT = ["Måndagar", "Tisdagar", "Onsdagar", "Torsdagar", "Fredagar"];
const WEEKDAY_LABELS_LOWER = ["måndagar", "tisdagar", "onsdagar", "torsdagar", "fredagar"];

// Small numeric utilities
const mean = (xs) => (xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length);
const isStrictMonotonic = (xs, dir) => {
  if (xs.length < 3) return false;
  for (let i = 1; i < xs.length; i += 1) {
    if (dir === "up" && xs[i] <= xs[i - 1]) return false;
    if (dir === "down" && xs[i] >= xs[i - 1]) return false;
  }
  return true;
};

/**
 * @param {Array<{date:string, values:Object}>} summaries
 * @param {Array<{id:string, name:string, colorId:string}>} trends
 * @returns {Array<{id:string, tone:'good'|'watch'|'neutral', title:string, body:string, trendId?:string}>}
 */
export const computeTrendInsights = (summaries, trends) => {
  const insights = [];
  if (!summaries || summaries.length < 5 || !trends || trends.length === 0) return insights;

  const sorted = [...summaries].sort((a, b) => a.date.localeCompare(b.date));

  trends.forEach((t) => {
    const values = sorted
      .map((s) => (s.values && s.values[t.id] != null ? { date: s.date, v: s.values[t.id] } : null))
      .filter(Boolean);
    if (values.length < 5) return;

    const overallAvg = mean(values.map((x) => x.v));

    // 1) Weekday effect – average of a weekday >=1.0 below the overall average
    const buckets = Array.from({ length: 5 }, () => []);
    values.forEach(({ date, v }) => {
      const wd = weekdayIndex(date);
      if (wd >= 0 && wd < 5) buckets[wd].push(v);
    });
    buckets.forEach((bucket, wd) => {
      if (bucket.length < 2) return;
      const wdAvg = mean(bucket);
      const diff = wdAvg - overallAvg;
      if (diff <= -1.0) {
        insights.push({
          id: `${t.id}-heavy-${wd}`,
          tone: "watch",
          trendId: t.id,
          title: `${WEEKDAY_LABELS_SHORT[wd]} känns oftast tyngre`,
          body: `Din ${t.name.toLowerCase()} ligger på ${wdAvg.toFixed(1)} / 5 på ${WEEKDAY_LABELS_LOWER[wd]}, mot ${overallAvg.toFixed(1)} i snitt. Kanske något lättare planering just då?`,
        });
      } else if (diff >= 1.0 && wdAvg >= 4) {
        insights.push({
          id: `${t.id}-light-${wd}`,
          tone: "good",
          trendId: t.id,
          title: `${WEEKDAY_LABELS_SHORT[wd]} är dina bästa dagar`,
          body: `Din ${t.name.toLowerCase()} landar på ${wdAvg.toFixed(1)} / 5 på ${WEEKDAY_LABELS_LOWER[wd]}. Fin rytm.`,
        });
      }
    });

    // 2) Trend in the last 3-5 entries – strictly rising or falling
    const recent = values.slice(-Math.min(5, values.length));
    const last3 = recent.slice(-3).map((x) => x.v);
    if (isStrictMonotonic(last3, "down")) {
      insights.push({
        id: `${t.id}-falling`,
        tone: "watch",
        trendId: t.id,
        title: `${t.name} har sjunkit`,
        body: `${t.name} har fallit tre dagar i rad (${last3.join(" → ")}). Ta hand om dig.`,
      });
    } else if (isStrictMonotonic(last3, "up")) {
      insights.push({
        id: `${t.id}-rising`,
        tone: "good",
        trendId: t.id,
        title: `Fin utveckling på ${t.name.toLowerCase()}`,
        body: `${t.name} har stigit tre dagar i rad (${last3.join(" → ")}). Vad gjorde du bra?`,
      });
    }
  });

  // 3) Overall dreamy week – all trends have last-7-day average >= 4
  const last7 = sorted.slice(-7);
  if (last7.length >= 5) {
    const allTrendAvgs = trends.map((t) => {
      const xs = last7.map((s) => s.values?.[t.id]).filter((x) => x != null);
      return xs.length >= 3 ? mean(xs) : null;
    });
    if (allTrendAvgs.every((x) => x != null && x >= 4)) {
      insights.push({
        id: "all-dreamy",
        tone: "good",
        title: "Den här veckan går som en dröm",
        body: `Alla dina trender ligger på 4 eller högre den senaste veckan. Njut av rytmen.`,
      });
    }
  }

  // De-duplicate by title, keep first
  const seen = new Set();
  return insights.filter((i) => {
    if (seen.has(i.title)) return false;
    seen.add(i.title);
    return true;
  });
};
