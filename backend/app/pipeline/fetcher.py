import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path

import feedparser
import httpx
import yaml

from app.pipeline.text import clean_html

log = logging.getLogger(__name__)
USER_AGENT = "TurkiyeNabzi/1.0 (+https://github.com/; RSS reader)"
MAX_SUMMARY_CHARS = 600


@dataclass(frozen=True)
class Source:
    name: str
    url: str


@dataclass(frozen=True)
class FeedItem:
    title: str
    summary: str
    url: str
    source: str
    published_at: datetime


def load_sources(path: Path) -> list[Source]:
    config = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
    return [Source(name=s["name"], url=s["url"]) for s in config.get("sources", []) if s.get("enabled", True)]


def _published(entry: feedparser.FeedParserDict) -> datetime:
    parsed = entry.get("published_parsed") or entry.get("updated_parsed")
    if parsed:
        return datetime(*parsed[:6], tzinfo=UTC)
    return datetime.now(UTC)


def parse_feed(content: bytes, source: Source) -> list[FeedItem]:
    feed = feedparser.parse(content)
    items = []
    for entry in feed.entries:
        title = clean_html(entry.get("title", ""))
        link = entry.get("link", "")
        if not title or not link:
            continue
        summary = clean_html(entry.get("summary", "") or entry.get("description", ""))[:MAX_SUMMARY_CHARS]
        items.append(FeedItem(title=title, summary=summary, url=link, source=source.name, published_at=_published(entry)))
    return items


def fetch_all(sources: list[Source], timeout: float) -> list[FeedItem]:
    items: list[FeedItem] = []
    with httpx.Client(timeout=timeout, follow_redirects=True, headers={"User-Agent": USER_AGENT}) as client:
        for source in sources:
            try:
                response = client.get(source.url)
                response.raise_for_status()
                parsed = parse_feed(response.content, source)
                log.info("%s: %d items", source.name, len(parsed))
                items.extend(parsed)
            except httpx.HTTPError as error:
                log.warning("%s: fetch failed (%s)", source.name, error)
    return items
