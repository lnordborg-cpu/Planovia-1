// Layout an ordered list of timed items (by startMin) into lanes so that
// overlapping items sit side-by-side within a day column.
// Returns each item enriched with { laneIndex, laneCount, startMin, endMin, durationMin }.
// items: [{ id, startTime, endTime, ... }]

import { toMinutes } from "@/lib/timeUtils";

export const layoutTimetable = (items, { defaultDurationMin = 60 } = {}) => {
  const withMinutes = items
    .map((it) => {
      const startMin = toMinutes(it.startTime);
      const endMin = it.endTime ? toMinutes(it.endTime) : startMin != null ? startMin + defaultDurationMin : null;
      return { ...it, startMin, endMin };
    })
    .filter((it) => it.startMin != null && it.endMin != null && it.endMin > it.startMin)
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

  // Group into clusters of overlapping items using sweep
  const clusters = [];
  let current = [];
  let currentEnd = -Infinity;
  for (const it of withMinutes) {
    if (current.length === 0 || it.startMin < currentEnd) {
      current.push(it);
      currentEnd = Math.max(currentEnd, it.endMin);
    } else {
      clusters.push(current);
      current = [it];
      currentEnd = it.endMin;
    }
  }
  if (current.length > 0) clusters.push(current);

  const out = [];
  for (const cluster of clusters) {
    // Greedy lane assignment within cluster
    const laneEnds = []; // laneEnds[l] = end minute of last item in lane l
    const withLane = cluster.map((it) => {
      let lane = laneEnds.findIndex((end) => end <= it.startMin);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(it.endMin);
      } else {
        laneEnds[lane] = it.endMin;
      }
      return { ...it, laneIndex: lane };
    });
    const laneCount = laneEnds.length;
    withLane.forEach((it) => out.push({ ...it, laneCount, durationMin: it.endMin - it.startMin }));
  }
  return out;
};
