const express = require("express");
const { getDb } = require("../db");

const router = express.Router();

// GET /clusters - label, article count, time range (earliest -> latest)
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
          MAX(a.published_at) AS end_time
        FROM clusters c
        JOIN articles a ON a.cluster_id = c.id
        GROUP BY c.id
        ORDER BY end_time DESC
        `
      )
      .all();
    res.json({ clusters: rows });
  } catch (err) {
    next(err);
  }
});

// GET /clusters/:id - full cluster detail with all articles, sorted chronologically
router.get("/:id", (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "Invalid cluster id; must be a positive integer." });
    }

    const db = getDb();
    const cluster = db.prepare("SELECT id, label FROM clusters WHERE id = ?").get(id);
    if (!cluster) {
      return res.status(404).json({ error: `Cluster ${id} not found.` });
    }

    const articles = db
      .prepare(
        `
        SELECT id, url, title, summary, source, published_at
        FROM articles
        WHERE cluster_id = ?
        ORDER BY published_at ASC
        `
      )
      .all(id);

    res.json({ cluster: { ...cluster, article_count: articles.length, articles } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
