"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Timeline from "@/components/Timeline";
import SourceFilter from "@/components/SourceFilter";
import ClusterDetail from "@/components/ClusterDetail";
import RefreshButton from "@/components/RefreshButton";
import { getTimeline } from "@/lib/api";

export default function Home() {
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSources, setActiveSources] = useState(null); // null = all
  const [selectedClusterId, setSelectedClusterId] = useState(null);

  const loadTimeline = useCallback(() => {
    setLoading(true);
    setError(null);
    return getTimeline()
      .then((data) => setTimeline(data.timeline))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadTimeline();
  }, [loadTimeline]);

  const allSources = useMemo(() => {
    const set = new Set();
    timeline.forEach((item) => item.sources.forEach((s) => set.add(s)));
    return Array.from(set).sort();
  }, [timeline]);

  const effectiveActiveSources = activeSources ?? new Set(allSources);

  function handleToggleSource(source) {
    setActiveSources((prev) => {
      const base = prev ?? new Set(allSources);
      const next = new Set(base);
      if (next.has(source)) {
        next.delete(source);
      } else {
        next.add(source);
      }
      return next;
    });
  }

  const filteredTimeline = useMemo(
    () =>
      timeline.filter((item) =>
        item.sources.some((s) => effectiveActiveSources.has(s))
      ),
    [timeline, effectiveActiveSources]
  );

  return (
    <div className="min-h-full flex-1 bg-zinc-50 font-sans">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
              News Pulse
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Topic clusters from live RSS feeds, plotted on a timeline.
            </p>
          </div>
          <RefreshButton onComplete={loadTimeline} />
        </header>

        <SourceFilter
          sources={allSources}
          activeSources={effectiveActiveSources}
          onToggle={handleToggleSource}
        />

        {loading && <p className="text-sm text-zinc-500">Loading timeline…</p>}
        {error && (
          <p className="text-sm text-red-600">
            Failed to load timeline: {error}
          </p>
        )}

        {!loading && !error && (
          <Timeline
            items={filteredTimeline}
            selectedId={selectedClusterId}
            onSelectCluster={setSelectedClusterId}
          />
        )}
      </main>

      {selectedClusterId && (
        <ClusterDetail
          clusterId={selectedClusterId}
          onClose={() => setSelectedClusterId(null)}
        />
      )}
    </div>
  );
}
