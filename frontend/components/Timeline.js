"use client";

import { useMemo } from "react";
import { assignLanes, getOverallTimeRange, makeTimeScale } from "@/lib/timeGeometry";

const LANE_HEIGHT_PX = 52;
const MIN_BLOCK_WIDTH_PCT = 1.5;

function formatAxisLabel(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
  });
}

/**
 * A custom-built (no charting library) timeline: each topic cluster is a
 * horizontal block spanning from its earliest to latest article, placed
 * into a non-overlapping lane. Block width visually communicates how long
 * a story stayed active; block opacity/height communicates its intensity
 * (article_count), satisfying the "bigger cluster = bolder marker" idea.
 */
export default function Timeline({ items, onSelectCluster, selectedId }) {
  const { laidOut, laneCount, min, max } = useMemo(() => {
    const { min, max } = getOverallTimeRange(items);
    const { items: laidOut, laneCount } = assignLanes(items);
    return { laidOut, laneCount, min, max };
  }, [items]);

  const scale = useMemo(() => makeTimeScale(min, max), [min, max]);

  const axisTicks = useMemo(() => {
    const ticks = 5;
    const minMs = new Date(min).getTime();
    const maxMs = new Date(max).getTime();
    return Array.from({ length: ticks }, (_, i) => {
      const t = minMs + ((maxMs - minMs) * i) / (ticks - 1);
      return new Date(t).toISOString();
    });
  }, [min, max]);

  if (items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-zinc-300 text-sm text-zinc-500">
        No clusters to display yet. Try “Refresh data”.
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div
        className="relative w-full min-w-[720px] rounded-lg border border-zinc-200 bg-white"
        style={{ height: laneCount * LANE_HEIGHT_PX + 32 }}
      >
        {/* axis */}
        <div className="absolute inset-x-0 top-0 flex h-6 items-center border-b border-zinc-100 text-[10px] text-zinc-400">
          {axisTicks.map((t) => (
            <span
              key={t}
              className="absolute -translate-x-1/2"
              style={{ left: `${scale(t)}%` }}
            >
              {formatAxisLabel(t)}
            </span>
          ))}
        </div>

        {laidOut.map((item) => {
          const left = scale(item.start_time);
          const right = scale(item.end_time);
          const width = Math.max(right - left, MIN_BLOCK_WIDTH_PCT);
          const isSelected = selectedId === item.id;
          const opacity = 0.45 + item.intensity * 0.55;

          return (
            <button
              key={item.id}
              onClick={() => onSelectCluster(item.id)}
              title={`${item.label} — ${item.article_count} article${item.article_count === 1 ? "" : "s"}`}
              className={`group absolute flex items-center overflow-hidden rounded-md px-2 text-left text-xs font-medium text-white shadow-sm transition-transform hover:z-10 hover:scale-[1.03] ${
                isSelected ? "ring-2 ring-offset-1 ring-indigo-500" : ""
              }`}
              style={{
                left: `${left}%`,
                width: `${width}%`,
                top: 32 + item.lane * LANE_HEIGHT_PX,
                height: LANE_HEIGHT_PX - 10,
                backgroundColor: `rgba(79, 70, 229, ${opacity})`,
              }}
            >
              <span className="truncate">{item.label}</span>
              <span className="ml-auto shrink-0 rounded-full bg-white/25 px-1.5 py-0.5 text-[10px]">
                {item.article_count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
