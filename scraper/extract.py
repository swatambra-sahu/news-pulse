"""
Fetches the actual article page and pulls out the main body text, since RSS
feeds usually only give a short summary. Uses trafilatura first (handles
boilerplate removal well out of the box) and falls back to a plain
BeautifulSoup <p>-tag scrape if that fails. Any failure is caught and logged
so a single bad page never aborts the whole run - we just keep the RSS
summary as the content in that case.
"""
import logging

import requests
import trafilatura
from bs4 import BeautifulSoup

from config import REQUEST_TIMEOUT, USER_AGENT

logger = logging.getLogger("scraper.extract")

MIN_USEFUL_LENGTH = 200  # characters; below this we treat extraction as failed


def _fallback_bs4_extract(html):
    soup = BeautifulSoup(html, "html.parser")
    for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
        tag.decompose()
    paragraphs = [p.get_text(" ", strip=True) for p in soup.find_all("p")]
    text = "\n".join(p for p in paragraphs if p)
    return text


def fetch_full_text(url, fallback_summary=""):
    """Best-effort full article body extraction. Always returns a string
    (never raises) - falls back to fallback_summary if everything fails."""
    try:
        response = requests.get(
            url,
            headers={"User-Agent": USER_AGENT},
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        html = response.text
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to download article page %s: %s", url, exc)
        return fallback_summary

    try:
        extracted = trafilatura.extract(html, include_comments=False, include_tables=False)
        if extracted and len(extracted) >= MIN_USEFUL_LENGTH:
            return extracted.strip()
    except Exception as exc:  # noqa: BLE001
        logger.warning("trafilatura failed for %s: %s", url, exc)

    try:
        text = _fallback_bs4_extract(html)
        if text and len(text) >= MIN_USEFUL_LENGTH:
            return text.strip()
    except Exception as exc:  # noqa: BLE001
        logger.warning("BeautifulSoup fallback failed for %s: %s", url, exc)

    logger.info("Falling back to RSS summary for %s (article body too short/unparseable)", url)
    return fallback_summary
