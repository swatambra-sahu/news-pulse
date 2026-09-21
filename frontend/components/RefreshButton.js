"use client";

import { useEffect, useRef, useState } from "react";
import { getIngestStatus, triggerIngest } from "@/lib/api";

const POLL_INTERVAL_MS = 2000;

/**
 * Triggers POST /ingest/trigger, then polls GET /ingest/status/:jobId until
 * the job finishes (completed or failed), calling onComplete so the parent
 * can refresh the timeline data.
 */
export default function RefreshButton({ onComplete }) {
  const [state, setState] = useState("idle"); // idle | running | completed | failed
  const [message, setMessage] = useState("");
  const pollTimer = useRef(null);

  useEffect(() => {
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, []);

  async function pollStatus(jobId) {
    try {
      const job = await getIngestStatus(jobId);
      if (job.status === "running") {
        pollTimer.current = setTimeout(() => pollStatus(jobId), POLL_INTERVAL_MS);
        return;
      }
      if (job.status === "completed") {
        setState("completed");
        const r = job.result || {};
        setMessage(
          `Done — ${r.new ?? 0} new articles, ${r.clusters_created ?? 0} clusters.`
        );
        onComplete?.();
      } else {
        setState("failed");
        setMessage(job.error || "Ingestion failed.");
      }
    } catch (err) {
      setState("failed");
      setMessage(err.message);
    }
  }

  async function handleClick() {
    setState("running");
    setMessage("Starting scrape + clustering job…");
    try {
      const { jobId } = await triggerIngest();
      pollStatus(jobId);
    } catch (err) {
      setState("failed");
      setMessage(err.message);
    }
  }

  const isRunning = state === "running";

  return (
    <div className="flex flex-col items-start gap-1.5 sm:items-end">
      <button
        onClick={handleClick}
        disabled={isRunning}
        className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isRunning && (
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
        )}
        {isRunning ? "Refreshing…" : "Refresh data"}
      </button>
      {message && (
        <p
          className={`text-xs ${
            state === "failed" ? "text-red-600" : "text-zinc-500"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
