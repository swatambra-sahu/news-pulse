// Thin fetch wrapper around the News Pulse backend REST API.
// Base URL is configured via NEXT_PUBLIC_API_URL (see .env.local.example)
// so nothing is hardcoded between local dev and the deployed backend.
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

async function request(path, options) {
  const res = await fetch(`${API_URL}${path}`, options);
  if (!res.ok) {
    let message = `Request failed: ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore non-JSON error bodies
    }
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return res.json();
}

export function getTimeline() {
  return request("/timeline");
}

export function getClusters() {
  return request("/clusters");
}

export function getClusterDetail(id) {
  return request(`/clusters/${id}`);
}

export function triggerIngest() {
  return request("/ingest/trigger", { method: "POST" });
}

export function getIngestStatus(jobId) {
  return request(`/ingest/status/${jobId}`);
}
