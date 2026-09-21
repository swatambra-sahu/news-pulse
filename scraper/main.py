"""
Entry point for the News Pulse ingestion pipeline:
  1. Pull new articles from all configured RSS feeds (feeds.py)
  2. Skip ones we've already stored (dedupe by URL) - makes the script
     safe to re-run on a schedule, only doing work for new articles.
  3. Fetch the full article body for genuinely new articles (extract.py)
  4. Recompute topic clusters over the (bounded) recent article window
     (cluster.py) and persist cluster assignments.

Invoked directly (`python main.py`) or as a subprocess from the Node
backend's POST /ingest/trigger endpoint. Prints a final
`SCRAPE_RESULT: {json}` line so the caller can capture a machine-readable
summary from stdout.
"""
import json
import logging
import sys
from datetime import datetime, timedelta, timezone

import db
from cluster import cluster_articles
from config import CLUSTER_LOOKBACK_DAYS
from extract import fetch_full_text
from feeds import fetch_all_feeds

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("scraper.main")


def ingest_new_articles(conn):
    new_count = 0
    seen_count = 0
    items = fetch_all_feeds()

    for item in items:
        if db.article_exists(conn, item["url"]):
            seen_count += 1
            continue

        content = fetch_full_text(item["url"], fallback_summary=item["summary"])
        record = {
            **item,
            "content": content,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
        try:
            db.insert_article(conn, record)
            new_count += 1
        except Exception as exc:  # noqa: BLE001 - never let one bad row kill the run
            logger.error("Failed to insert article %s: %s", item.get("url"), exc)

    return {"fetched": len(items), "new": new_count, "already_seen": seen_count}


def recluster(conn):
    since_iso = None
    if CLUSTER_LOOKBACK_DAYS > 0:
        since_iso = (datetime.now(timezone.utc) - timedelta(days=CLUSTER_LOOKBACK_DAYS)).isoformat()

    articles = db.get_articles_for_clustering(conn, since_iso=since_iso)
    clusters = cluster_articles(articles)

    db.reset_clusters(conn)
    now_iso = datetime.now(timezone.utc).isoformat()
    for cluster in clusters:
        cluster_id = db.insert_cluster(conn, cluster["label"], now_iso)
        db.assign_cluster(conn, cluster["article_ids"], cluster_id)

    return {"articles_clustered": len(articles), "clusters_created": len(clusters)}


def run():
    db.init_db()
    with db.connection() as conn:
        ingest_stats = ingest_new_articles(conn)
        cluster_stats = recluster(conn)
        total_articles = db.count_articles(conn)

    result = {
        "status": "completed",
        "finished_at": datetime.now(timezone.utc).isoformat(),
        **ingest_stats,
        **cluster_stats,
        "total_articles_in_db": total_articles,
    }
    logger.info("Run complete: %s", result)
    # Machine-readable line for the Node backend subprocess wrapper.
    print(f"SCRAPE_RESULT: {json.dumps(result)}")
    return result


if __name__ == "__main__":
    try:
        run()
    except Exception as exc:  # noqa: BLE001
        logger.exception("Fatal error during scrape run")
        print(f"SCRAPE_RESULT: {json.dumps({'status': 'failed', 'error': str(exc)})}")
        sys.exit(1)
