"""
SQLite persistence layer shared by the scraper and (read-only) the Node
backend. SQLite was chosen for this assessment because it needs zero
external infra to run locally and is one of the officially-allowed options
(Postgres/MongoDB/SQLite). See README for the tradeoffs on ephemeral hosts.
"""
import os
import sqlite3
from contextlib import contextmanager

from config import DB_PATH

SCHEMA = """
CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    content TEXT,
    source TEXT NOT NULL,
    published_at TEXT NOT NULL,
    fetched_at TEXT NOT NULL,
    cluster_id INTEGER REFERENCES clusters(id)
);

CREATE TABLE IF NOT EXISTS clusters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_articles_published_at ON articles(published_at);
CREATE INDEX IF NOT EXISTS idx_articles_cluster_id ON articles(cluster_id);
"""


def get_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def connection():
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db():
    with connection() as conn:
        conn.executescript(SCHEMA)


def article_exists(conn, url):
    row = conn.execute("SELECT 1 FROM articles WHERE url = ?", (url,)).fetchone()
    return row is not None


def insert_article(conn, article):
    conn.execute(
        """
        INSERT OR IGNORE INTO articles
            (url, title, summary, content, source, published_at, fetched_at)
        VALUES (:url, :title, :summary, :content, :source, :published_at, :fetched_at)
        """,
        article,
    )


def get_articles_for_clustering(conn, since_iso=None):
    if since_iso:
        rows = conn.execute(
            "SELECT * FROM articles WHERE published_at >= ? ORDER BY published_at",
            (since_iso,),
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM articles ORDER BY published_at").fetchall()
    return [dict(r) for r in rows]


def reset_clusters(conn):
    """Clear existing cluster assignments so clustering can be recomputed
    idempotently on every ingestion run (see README limitation notes)."""
    conn.execute("UPDATE articles SET cluster_id = NULL")
    conn.execute("DELETE FROM clusters")


def insert_cluster(conn, label, created_at):
    cur = conn.execute(
        "INSERT INTO clusters (label, created_at) VALUES (?, ?)",
        (label, created_at),
    )
    return cur.lastrowid


def assign_cluster(conn, article_ids, cluster_id):
    conn.executemany(
        "UPDATE articles SET cluster_id = ? WHERE id = ?",
        [(cluster_id, aid) for aid in article_ids],
    )


def count_articles(conn):
    return conn.execute("SELECT COUNT(*) AS c FROM articles").fetchone()["c"]
