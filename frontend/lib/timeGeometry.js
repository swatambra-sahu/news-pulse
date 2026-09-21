// Pure helpers for laying out timeline clusters into non-overlapping lanes
// and mapping timestamps to pixel positions. Kept dependency-free (no
// charting library) so the timeline is fully custom-built per the
// assessment's "custom-built timeline" option.

/**
 * Greedy interval-scheduling lane assignment: walk clusters sorted by start
 * time, place each into the first lane whose last item ends before this
 * one starts, otherwise open a new lane. This keeps visually overlapping
 * time ranges from being drawn on top of each other.
 */
export function assignLanes(items) {
  const sorted = [...items].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
  const laneEndTimes = []; // last end time (ms) per lane
  const withLanes = [];

  for (const item of sorted) {
    const start = new Date(item.start_time).getTime();
    const end = new Date(item.end_time).getTime();

    let laneIndex = laneEndTimes.findIndex((endTime) => endTime <= start);
    if (laneIndex === -1) {
      laneIndex = laneEndTimes.length;
      laneEndTimes.push(end);
    } else {
      laneEndTimes[laneIndex] = end;
    }

    withLanes.push({ ...item, lane: laneIndex });
  }

  return { items: withLanes, laneCount: laneEndTimes.length || 1 };
}

/**
 * Returns a function mapping a Date/ISO string to a percentage (0-100)
 * position along the timeline. Using percentages (rather than pixels) keeps
 * the timeline responsive without needing a ResizeObserver.
 */
export function makeTimeScale(minTime, maxTime, paddingPct = 2) {
  const min = new Date(minTime).getTime();
  const max = new Date(maxTime).getTime();
  const span = Math.max(max - min, 1000 * 60); // avoid divide-by-zero for a single instant

  return (time) => {
    const t = new Date(time).getTime();
    const ratio = (t - min) / span;
    return paddingPct + ratio * (100 - paddingPct * 2);
  };
}

export function getOverallTimeRange(items) {
  if (items.length === 0) {
    const now = new Date();
    return { min: now.toISOString(), max: now.toISOString() };
  }
  let min = items[0].start_time;
  let max = items[0].end_time;
  for (const item of items) {
    if (new Date(item.start_time) < new Date(min)) min = item.start_time;
    if (new Date(item.end_time) > new Date(max)) max = item.end_time;
  }
  return { min, max };
}
