const express = require("express");
const { createJob, getJob, runScraperJob } = require("../ingestJobs");

const router = express.Router();

// POST /ingest/trigger - triggers the Python pipeline as a subprocess,
// returns a job ID immediately (fire-and-forget; job runs async).
router.post("/trigger", (req, res, next) => {
  try {
    const jobId = createJob();
    runScraperJob(jobId);
    res.status(202).json({ jobId, status: "running" });
  } catch (err) {
    next(err);
  }
});

// GET /ingest/status/:jobId - lets the frontend poll job status.
router.get("/status/:jobId", (req, res, next) => {
  try {
    const { jobId } = req.params;
    const job = getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: `Job ${jobId} not found.` });
    }
    res.json(job);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
