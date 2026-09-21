"""
Fetches RSS feeds and normalizes wildly inconsistent field names/formats
(different <description> vs <content:encoded> usage, missing pubDate,
inconsistent date formats) into one consistent internal schema:

    {url, title, summary, source, published_at (ISO 8601 UTC string)}
"""
import logging
import re
from datetime import datetime, timezone

import feedparser
import requests
from dateutil import parser as dateutil_parser

from config import FEEDS, REQUEST_TIMEOUT, USER_AGENT

logger = logging.getLogger("scraper.feeds")

# Some feeds (e.g. NPR) append photo-credit boilerplate like
# "(Image credit: Getty Images)" straight into the summary text. It's not
# HTML so BeautifulSoup won't strip it, but it pollutes both the displayed
# summary and the clustering keywords, so strip it explicitly.
IMAGE_CREDIT_RE = re.compile(r"\(\s*(image|photo)\s*credit\s*:.*?\)", re.IGNORECASE)


def _clean_html_summary(raw_html):
    """Feed summaries sometimes contain raw HTML. Strip it down to text."""
    if not raw_html:
        return ""
    from bs4 import BeautifulSoup

    text = BeautifulSoup(raw_html, "html.parser").get_text(separator=" ", strip=True)
    text = IMAGE_CREDIT_RE.sub("", text)
    return re.sub(r"\s+", " ", text).strip()


def _extract_summary(entry):
    # Some feeds put the richer body in content:encoded (feedparser exposes
    # this as entry.content), others only have <description>/<summary>.
    if entry.get("content"):
        try:
            return _clean_html_summary(entry["content"][0].get("value", ""))
        except (IndexError, AttributeError):
            pass
    if entry.get("summary"):
        return _clean_html_summary(entry["summary"])
    if entry.get("description"):
        return _clean_html_summary(entry["description"])
    return ""


def _extract_published_at(entry):
    # feedparser gives a struct_time in *_parsed fields when it can parse the
    # date itself; fall back to dateutil for the formats it misses, and
    # finally to "now" so a missing pubDate never crashes the run.
    for field in ("published_parsed", "updated_parsed"):
        value = entry.get(field)
        if value:
            try:
                return datetime(*value[:6], tzinfo=timezone.utc).isoformat()
            except (TypeError, ValueError):
                continue

    for field in ("published", "updated", "pubDate"):
        raw = entry.get(field)
        if raw:
            try:
                dt = dateutil_parser.parse(raw)
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                return dt.astimezone(timezone.utc).isoformat()
            except (ValueError, TypeError):
                continue

    logger.warning("No parsable pubDate for entry %s; defaulting to now", entry.get("link"))
    return datetime.now(timezone.utc).isoformat()


def normalize_entry(entry, source_name):
    url = entry.get("link") or entry.get("id")
    title = (entry.get("title") or "").strip()
    if not url or not title:
        return None
    return {
        "url": url,
        "title": title,
        "summary": _extract_summary(entry).strip(),
        "source": source_name,
        "published_at": _extract_published_at(entry),
    }


def fetch_feed(source_name, feed_url):
    """Fetch and normalize a single feed. Never raises - logs and returns
    an empty list on failure so one broken feed doesn't kill the whole run."""
    try:
        # Fetch via requests (uses certifi's CA bundle) rather than letting
        # feedparser open the URL itself, which can hit SSL verification
        # issues on some Python installs (notably stock macOS Python).
        response = requests.get(
            feed_url,
            headers={"User-Agent": USER_AGENT},
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        parsed = feedparser.parse(response.content)
        if parsed.bozo and not parsed.entries:
            logger.warning("Feed %s (%s) failed to parse: %s", source_name, feed_url, parsed.bozo_exception)
            return []
        normalized = []
        for entry in parsed.entries:
            item = normalize_entry(entry, source_name)
            if item:
                normalized.append(item)
        logger.info("Fetched %d entries from %s", len(normalized), source_name)
        return normalized
    except Exception as exc:  # noqa: BLE001 - a broken feed must not crash the run
        logger.error("Error fetching feed %s (%s): %s", source_name, feed_url, exc)
        return []


def fetch_all_feeds():
    all_items = []
    for source_name, feed_url in FEEDS:
        all_items.extend(fetch_feed(source_name, feed_url))
    return all_items
