"""
Central configuration for the News Pulse scraper.
All tunables are read from environment variables (with sane defaults) so
nothing is hardcoded for deployment.
"""
import os

# Path to the shared SQLite database file. The Node backend reads from the
# same file, so keep this in sync with backend/.env's DB_PATH.
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.environ.get("DB_PATH", os.path.join(BASE_DIR, "data", "newspulse.sqlite3"))

# RSS feeds to ingest. Format: (source_name, feed_url).
# Can be overridden entirely via the FEEDS env var as a comma separated list
# of "Name|URL" pairs, e.g. "BBC|http://...,NPR|https://..."
DEFAULT_FEEDS = [
    ("BBC News", "http://feeds.bbci.co.uk/news/rss.xml"),
    ("NPR", "https://feeds.npr.org/1001/rss.xml"),
    ("Al Jazeera", "https://www.aljazeera.com/xml/rss/all.xml"),
]


def _load_feeds_from_env():
    raw = os.environ.get("FEEDS")
    if not raw:
        return DEFAULT_FEEDS
    feeds = []
    for pair in raw.split(","):
        if "|" in pair:
            name, url = pair.split("|", 1)
            feeds.append((name.strip(), url.strip()))
    return feeds or DEFAULT_FEEDS


FEEDS = _load_feeds_from_env()

# Networking
REQUEST_TIMEOUT = float(os.environ.get("REQUEST_TIMEOUT", "10"))
USER_AGENT = os.environ.get(
    "SCRAPER_USER_AGENT",
    "Mozilla/5.0 (compatible; NewsPulseBot/1.0; +https://example.com/bot)",
)

# Clustering thresholds (see README for rationale)
CLUSTER_MIN_SHARED_WORDS = int(os.environ.get("CLUSTER_MIN_SHARED_WORDS", "3"))
CLUSTER_MIN_JACCARD = float(os.environ.get("CLUSTER_MIN_JACCARD", "0.25"))

# Only re-cluster articles published within this many days, to keep the
# timeline focused and clustering fast as the DB grows. Set to 0 to disable.
CLUSTER_LOOKBACK_DAYS = int(os.environ.get("CLUSTER_LOOKBACK_DAYS", "14"))
