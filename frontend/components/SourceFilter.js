"use client";

export default function SourceFilter({ sources, activeSources, onToggle }) {
  if (sources.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
        Sources:
      </span>
      {sources.map((source) => {
        const active = activeSources.has(source);
        return (
          <button
            key={source}
            onClick={() => onToggle(source)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              active
                ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                : "border-zinc-300 bg-white text-zinc-400 hover:text-zinc-600"
            }`}
          >
            {source}
          </button>
        );
      })}
    </div>
  );
}
