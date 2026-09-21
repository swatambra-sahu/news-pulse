const express = require("express");
const { getDb } = require("../db");

const router = express.Router();

// GET /timeline - clusters shaped for a charting library: label, start/end
// timestamps (not just a raw article list), article count, and a simple
// size/intensity metric (article_count itself, normalized 0-1 against the
// largest cluster) so the frontend can size markers without recomputing it.
router.get("/", (req, res, next) => {
  try {
    const db = getDb();
    const rows = db
      .prepare(
        `
        SELECT
          c.id,
          c.label,
          COUNT(a.id) AS article_count,
          MIN(a.published_at) AS start_time,
          MAX(a.published_at) AS end_time,
          GROUP_CONCAT(DISTINCT a.source) AS sources_csv
        FROM clusters c
        JOIN articles a ON a.cluster_id = c.id
        GROUP BY c.id
        ORDER BY start_time ASC
        `
      )
      .all();

    const maxCount = rows.reduce((max, r) => Math.max(max, r.article_count), 0) || 1;

    const items = rows.map((r) => ({
      id: r.id,
      label: r.label,
      start_time: r.start_time,
      end_time: r.end_time,
      article_count: r.article_count,
      sources: r.sources_csv ? r.sources_csv.split(",") : [],
      intensity: Number((r.article_count / maxCount).toFixed(3)),
    }));

    res.json({ timeline: items });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
