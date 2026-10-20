from datetime import UTC, datetime, timedelta

from fastapi.testclient import TestClient

from app.db import SessionLocal, init_db
from app.main import app
from app.pipeline.categorizer import KeywordCategorizer
from app.pipeline.dedupe import normalize_url, titles_match
from app.pipeline.fetcher import FeedItem
from app.pipeline.ingest import ingest_items
from app.pipeline.locator import get_locator
from app.pipeline.sentiment import LexiconSentimentAnalyzer
from app.pipeline.text import title_key


def test_normalize_url_drops_tracking_and_trailing_slash() -> None:
    assert normalize_url("http://www.Example.com/haber/1/?utm_source=x&id=5#top") == "https://example.com/haber/1?id=5"


def test_titles_match_near_duplicates_only() -> None:
    a = title_key("Ankara'da sağanak yağış hayatı olumsuz etkiledi")
    b = title_key("Ankara'da sağanak yağış, hayatı olumsuz etkiledi!")
    c = title_key("İzmir'de yeni metro hattı açıldı")
    assert titles_match(a, b)
    assert not titles_match(a, c)


def test_lexicon_does_not_confuse_similar_words() -> None:
    analyzer = LexiconSentimentAnalyzer()
    won, crash = analyzer.score(["Takım şampiyonluğu kazandı", "Zincirleme trafik kazası: 3 yaralı"])
    assert won > 0 > crash
    assert analyzer.score(["Zaman içinde olumlu gelişmeler bekleniyor"])[0] > 0


def test_categorizer_keywords() -> None:
    categorizer = KeywordCategorizer()
    assert categorizer.classify("", title="Derbide 3 gol, taraftar coştu") == "spor"
    assert categorizer.classify("", title="Kazada 2 kişi yaralandı") == "asayis"
    assert categorizer.classify("", title="İhracatta rekor artış") == "ekonomi"
    assert categorizer.classify("", title="Van Gölü kıyısında fidan dikimi") == "hava-cevre"
    assert categorizer.classify("", title="Toplantı yarın yapılacak") is None


def _item(title: str, url: str, hours_ago: int = 1, summary: str = "") -> FeedItem:
    return FeedItem(title, summary, url, "Test", datetime.now(UTC) - timedelta(hours=hours_ago))


def test_ingest_dedupes_and_serves_api() -> None:
    init_db()
    items = [
        _item("Ankara'da yeni hastane hizmete açıldı", "https://a.test/1"),
        _item("Ankara'da yeni hastane hizmete açıldı!", "https://b.test/1"),
        _item("Ankara'da yeni hastane hizmete açıldı", "https://a.test/1/?utm_source=x"),
        _item("İzmir'de trafik kazası: 2 yaralı", "https://a.test/2"),
        _item("Döviz kurlarında son durum", "https://a.test/3"),
        _item("Eski haber", "https://a.test/4", hours_ago=24 * 60),
    ]
    with SessionLocal() as session:
        stats = ingest_items(
            session, items, locator=get_locator(), analyzer=LexiconSentimentAnalyzer(), categorizer=KeywordCategorizer()
        )
        again = ingest_items(
            session, items, locator=get_locator(), analyzer=LexiconSentimentAnalyzer(), categorizer=KeywordCategorizer()
        )
    assert (stats.stored, stats.located, stats.duplicates, stats.too_old) == (3, 2, 2, 1)
    assert again.stored == 0

    with TestClient(app) as client:
        dataset = client.get("/api/dataset").json()
        assert set(dataset) == {"generatedAt", "isDemo", "days", "windowDays", "minArticles", "national", "provinces"}
        assert len(dataset["days"]) == 30 and len(dataset["provinces"]) == 81
        assert dataset["national"]["all"]["n"][-1] == 2
        assert dataset["provinces"]["06"]["saglik"]["n"][-1] == 1

        detail = client.get("/api/provinces/06").json()
        assert detail["headlines"][0]["title"] == "Ankara'da yeni hastane hizmete açıldı"
        assert detail["highlights"] is None
        assert "ankara" not in {k["text"] for k in detail["keywords"]}

        assert client.get("/api/provinces/99").status_code == 404
        assert client.get("/api/health").json()["status"] == "ok"
