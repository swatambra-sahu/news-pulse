"use client";

import { useEffect, useState } from "react";
import { getClusterDetail } from "@/lib/api";

function formatDateTime(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ClusterDetail({ clusterId, onClose }) {
  const [cluster, setCluster] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getClusterDetail(clusterId)
      .then((data) => {
        if (!cancelled) setCluster(data.cluster);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clusterId]);

  return (
    <aside className="fixed inset-y-0 right-0 z-20 flex w-full max-w-md flex-col border-l border-zinc-200 bg-white shadow-xl">
      <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
            Cluster
          </p>
          <h2 className="mt-1 text-lg font-semibold text-zinc-900">
            {cluster?.label || "Loading…"}
          </h2>
          {cluster && (
            <p className="mt-1 text-xs text-zinc-500">
              {cluster.article_count} article{cluster.article_count === 1 ? "" : "s"}
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
          aria-label="Close cluster detail"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && <p className="text-sm text-zinc-500">Loading articles…</p>}
        {error && <p className="text-sm text-red-600">Error: {error}</p>}
        {cluster && (
          <ul className="flex flex-col gap-3">
            {cluster.articles.map((article) => (
              <li
                key={article.id}
                className="rounded-lg border border-zinc-200 p-3 transition-colors hover:border-indigo-300"
              >
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-zinc-900 hover:text-indigo-600"
                >
                  {article.title}
                </a>
                <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-500">
                  <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-medium">
                    {article.source}
                  </span>
                  <span>{formatDateTime(article.published_at)}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
