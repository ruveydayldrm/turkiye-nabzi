import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Article
from app.pipeline.categorizer import Categorizer
from app.pipeline.dedupe import Deduplicator, normalize_url
from app.pipeline.fetcher import FeedItem
from app.pipeline.locator import ProvinceLocator
from app.pipeline.sentiment import SentimentAnalyzer
from app.pipeline.text import title_key

log = logging.getLogger(__name__)
TITLE_DEDUPE_WINDOW = timedelta(days=3)


@dataclass
class IngestStats:
    fetched: int = 0
    stored: int = 0
    duplicates: int = 0
    located: int = 0
    too_old: int = 0


def ingest_items(
    session: Session,
    items: list[FeedItem],
    *,
    locator: ProvinceLocator,
    analyzer: SentimentAnalyzer,
    categorizer: Categorizer,
    history_days: int = 30,
    now: datetime | None = None,
) -> IngestStats:
    now = now or datetime.now(UTC)
    stats = IngestStats(fetched=len(items))
    cutoff = now - timedelta(days=history_days)

    candidates = {normalize_url(item.url): item for item in items}
    known_urls = set(session.scalars(select(Article.url).where(Article.url.in_(list(candidates)))))
    recent_keys = list(session.scalars(select(Article.title_key).where(Article.published_at >= now - TITLE_DEDUPE_WINDOW)))
    dedupe = Deduplicator(known_urls, recent_keys)

    fresh: list[Article] = []
    for url, item in candidates.items():
        published = item.published_at if item.published_at.tzinfo else item.published_at.replace(tzinfo=UTC)
        if published < cutoff:
            stats.too_old += 1
            continue
        key = title_key(item.title)
        if dedupe.is_duplicate(url, key):
            stats.duplicates += 1
            continue
        dedupe.add(url, key)
        location = locator.locate(item.title, item.summary)
        fresh.append(
            Article(
                url=url,
                title=item.title,
                title_key=key,
                summary=item.summary,
                source=item.source,
                published_at=min(published, now),
                fetched_at=now,
                province_plate=location.plate,
                category=categorizer.classify(item.summary, title=item.title),
            )
        )
    stats.duplicates += len(items) - len(candidates)

    located = [article for article in fresh if article.province_plate]
    scores = analyzer.score([f"{a.title}. {a.summary}".strip() for a in located])
    for article, score in zip(located, scores):
        article.sentiment = round(score, 4)

    session.add_all(fresh)
    session.commit()
    stats.stored = len(fresh)
    stats.located = len(located)
    log.info("Ingest: %s", stats)
    return stats
