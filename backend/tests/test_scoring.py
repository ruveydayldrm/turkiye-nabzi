import math
from datetime import date, timedelta

import pytest

from app.scoring import (
    MIN_ARTICLES,
    SCORE_SPREAD,
    SHRINKAGE_K,
    WINDOW_DAYS,
    ScoredArticle,
    compute_series,
    relative_score,
)

DAYS = [date(2026, 10, 1) + timedelta(days=i) for i in range(5)]


def articles(plate: str, day: date, scores: list[float], category: str | None = "ekonomi") -> list[ScoredArticle]:
    return [ScoredArticle(plate, category, s, day) for s in scores]


def test_relative_score_is_zero_at_the_national_mean() -> None:
    assert relative_score(-0.3, 50, -0.3) == 0.0


def test_relative_score_without_data_is_neutral() -> None:
    assert relative_score(None, 0, 0.1) == 0.0


def test_relative_score_sign_and_bounds() -> None:
    assert relative_score(0.9, 100, -0.9) > 0.99
    assert relative_score(-0.9, 100, 0.9) < -0.99
    assert -1 <= relative_score(1.0, 1000, -1.0) <= 1


def test_shrinkage_pulls_thin_provinces_toward_national_mean() -> None:
    thin = relative_score(0.5, 2, 0.0)
    thick = relative_score(0.5, 200, 0.0)
    assert 0 < thin < thick
    expected = math.tanh(((0.5 * 2) / (2 + SHRINKAGE_K)) / SCORE_SPREAD)
    assert thin == pytest.approx(expected, abs=1e-3)


def test_national_raw_is_the_article_weighted_mean() -> None:
    rows = articles("06", DAYS[0], [0.5, 0.5, 0.5]) + articles("34", DAYS[0], [-0.5])
    series = compute_series(rows, DAYS, ["06", "34"])
    assert series["national"]["all"]["raw"][0] == pytest.approx(0.25)
    assert series["national"]["all"]["n"][0] == 4
    assert series["national"]["ekonomi"]["n"][0] == 4


def test_counts_use_a_trailing_window() -> None:
    rows = [a for day in DAYS for a in articles("06", day, [0.1, 0.2])]
    counts = compute_series(rows, DAYS, ["06"])["provinces"]["06"]["all"]["n"]
    assert counts == [2, 4, 6, 6, 6][: len(DAYS)]
    assert WINDOW_DAYS == 3


def test_relative_ranking_and_insufficient_data() -> None:
    rows = (
        articles("06", DAYS[-1], [0.6] * 20)
        + articles("34", DAYS[-1], [-0.6] * 20)
        + articles("69", DAYS[-1], [0.9] * 2)
    )
    provinces = compute_series(rows, DAYS, ["06", "34", "69", "81"])["provinces"]
    assert provinces["06"]["all"]["s"][-1] > 0 > provinces["34"]["all"]["s"][-1]
    assert provinces["69"]["all"]["n"][-1] < MIN_ARTICLES
    assert provinces["81"]["all"] == {"s": [0.0] * len(DAYS), "n": [0] * len(DAYS)}


def test_uncategorised_articles_count_only_toward_all() -> None:
    rows = articles("06", DAYS[0], [0.2], category=None)
    series = compute_series(rows, DAYS, ["06"])
    assert series["provinces"]["06"]["all"]["n"][0] == 1
    assert series["provinces"]["06"]["ekonomi"]["n"][0] == 0


def test_articles_outside_the_range_are_ignored() -> None:
    rows = articles("06", DAYS[0] - timedelta(days=1), [0.5])
    assert compute_series(rows, DAYS, ["06"])["national"]["all"]["n"] == [0] * len(DAYS)
