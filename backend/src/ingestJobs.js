// In-memory job tracker for POST /ingest/trigger + GET /ingest/status/:jobId.
//
// An in-memory Map is sufficient for this assessment's scope (single backend
// instance, jobs are short-lived and only need to survive a poll cycle).
// A production system with multiple backend replicas would need to persist
// job state in the shared DB or a queue instead - noted as a known
// limitation in the README.
const { randomUUID } = require("crypto");
const { spawn } = require("child_process");
const { PYTHON_BIN, SCRAPER_PATH, SCRAPER_CWD } = require("./config");

const jobs = new Map();

function createJob() {
  const jobId = randomUUID();
  jobs.set(jobId, {
    id: jobId,
    status: "running", // running | completed | failed
    startedAt: new Date().toISOString(),
    finishedAt: null,
    result: null,
    error: null,
  });
  return jobId;
}

function getJob(jobId) {
  return jobs.get(jobId);
}

function runScraperJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) return;

  const child = spawn(PYTHON_BIN, [SCRAPER_PATH], { cwd: SCRAPER_CWD });

  let stdout = "";
  let stderr = "";

  child.stdout.on("data", (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString();
  });

  child.on("error", (err) => {
    // e.g. python binary not found
    job.status = "failed";
    job.finishedAt = new Date().toISOString();
    job.error = `Failed to start scraper process: ${err.message}`;
  });

  child.on("close", (code) => {
    job.finishedAt = new Date().toISOString();
    const resultLine = stdout
      .split("\n")
      .reverse()
      .find((line) => line.startsWith("SCRAPE_RESULT:"));

    if (resultLine) {
      try {
        job.result = JSON.parse(resultLine.replace("SCRAPE_RESULT:", "").trim());
      } catch (e) {
        job.result = { raw: resultLine };
      }
    }

    if (code === 0) {
      job.status = "completed";
    } else {
      job.status = "failed";
      job.error = job.error || stderr.slice(-2000) || `Scraper exited with code ${code}`;
    }
  });
}

module.exports = { createJob, getJob, runScraperJob };
