import json
import logging
import threading
from datetime import UTC, date, datetime, time, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import TURKEY_TZ, get_settings
from app.models import Article, ProvinceHighlight
from app.pipeline.categorizer import KeywordCategorizer
from app.pipeline.fetcher import fetch_all, load_sources
from app.pipeline.ingest import IngestStats, ingest_items
from app.pipeline.keywords import top_keywords
from app.pipeline.locator import DATA_FILE, get_locator
from app.pipeline.sentiment import get_analyzer
from app.pipeline.summarizer import get_summarizer
from app.scoring import MIN_ARTICLES, WINDOW_DAYS, ScoredArticle, compute_series

log = logging.getLogger(__name__)
PROVINCES = json.loads(DATA_FILE.read_text(encoding="utf-8"))
PLATES = [p["plate"] for p in PROVINCES]
NAMES = {p["plate"]: p["name"] for p in PROVINCES}
HIGHLIGHT_MIN_ARTICLES = 5
KEYWORD_LOOKBACK = timedelta(days=7)

_lock = threading.Lock()
_cache: dict[str, object] = {"key": None, "dataset": None}
_last_ingest: datetime | None = None


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def turkey_today() -> date:
    return datetime.now(TURKEY_TZ).date()


def _day_start_utc(day: date) -> datetime:
    return datetime.combine(day, time.min, tzinfo=TURKEY_TZ).astimezone(UTC)


def build_dataset(session: Session, today: date | None = None) -> dict:
    settings = get_settings()
    today = today or turkey_today()
    days = [today - timedelta(days=settings.history_days - 1 - i) for i in range(settings.history_days)]
    rows = session.execute(
        select(Article.province_plate, Article.category, Article.sentiment, Article.published_at).where(
            Article.province_plate.is_not(None),
            Article.sentiment.is_not(None),
            Article.published_at >= _day_start_utc(days[0]),
        )
    )
    articles = [
        ScoredArticle(plate, category, sentiment, _as_utc(published).astimezone(TURKEY_TZ).date())
        for plate, category, sentiment, published in rows
    ]
    series = compute_series(articles, days, PLATES)
    return {
        "generatedAt": (_last_ingest or datetime.now(UTC)).astimezone(TURKEY_TZ).isoformat(timespec="seconds"),
        "isDemo": False,
        "days": [day.isoformat() for day in days],
        "windowDays": WINDOW_DAYS,
        "minArticles": MIN_ARTICLES,
        **series,
    }


def cached_dataset(session: Session) -> dict:
    key = (turkey_today().isoformat(), _last_ingest)
    with _lock:
        if _cache["key"] != key:
            _cache["dataset"] = build_dataset(session)
            _cache["key"] = key
        return _cache["dataset"]  # type: ignore[return-value]


def province_detail(session: Session, plate: str) -> dict:
    latest = session.scalars(
        select(Article).where(Article.province_plate == plate).order_by(Article.published_at.desc()).limit(5)
    ).all()
    since = datetime.now(UTC) - KEYWORD_LOOKBACK
    recent = session.execute(
        select(Article.title, Article.summary).where(Article.province_plate == plate, Article.published_at >= since)
    ).all()
    keywords = top_keywords((f"{title} {summary}" for title, summary in recent), exclude=get_locator().place_keys)
    return {
        "plate": plate,
        "generatedAt": datetime.now(TURKEY_TZ).isoformat(timespec="seconds"),
        "headlines": [
            {
                "title": a.title,
                "url": a.url,
                "source": a.source,
                "category": a.category or "ekonomi",
                "sentiment": a.sentiment or 0.0,
                "publishedAt": _as_utc(a.published_at).astimezone(TURKEY_TZ).isoformat(timespec="seconds"),
            }
            for a in latest
            if a.category
        ],
        "keywords": [{"text": text, "weight": weight} for text, weight in keywords],
        "highlights": _highlights(session, plate),
    }


def _highlights(session: Session, plate: str) -> str | None:
    today = turkey_today()
    cached = session.scalar(select(ProvinceHighlight.text).where(ProvinceHighlight.plate == plate, ProvinceHighlight.day == today.isoformat()))
    if cached:
        return cached
    summarizer = get_summarizer()
    if summarizer is None:
        return None
    todays = session.execute(
        select(Article.title, Article.summary)
        .where(Article.province_plate == plate, Article.published_at >= _day_start_utc(today))
        .order_by(Article.published_at.desc())
        .limit(15)
    ).all()
    if len(todays) < HIGHLIGHT_MIN_ARTICLES:
        return None
    text = summarizer.summarize(NAMES[plate], [(t, s) for t, s in todays])
    if text:
        session.add(ProvinceHighlight(plate=plate, day=today.isoformat(), text=text, created_at=datetime.now(UTC)))
        session.commit()
    return text


def run_ingest(session: Session) -> IngestStats:
    global _last_ingest
    settings = get_settings()
    items = fetch_all(load_sources(settings.sources_file), settings.request_timeout_seconds)
    stats = ingest_items(
        session,
        items,
        locator=get_locator(),
        analyzer=get_analyzer(),
        categorizer=KeywordCategorizer(),
        history_days=settings.history_days,
    )
    _last_ingest = datetime.now(UTC)
    return stats


def article_count(session: Session) -> int:
    return session.scalar(select(func.count(Article.id))) or 0
