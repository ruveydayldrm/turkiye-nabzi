"""Province sentiment relative to the national mean.

Mirrors frontend/scripts/generate-demo-data.mjs so demo and live data look alike:
for each day, aggregate a trailing window, shrink thin provinces toward the national
mean, then squash the difference with tanh into [-1, 1].
"""

import math
from collections import defaultdict
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import date

from app.pipeline.categorizer import CATEGORIES

ALL = "all"
ALL_CATEGORIES = (ALL, *CATEGORIES)
WINDOW_DAYS = 3
SHRINKAGE_K = 4
SCORE_SPREAD = 0.2
MIN_ARTICLES = 5


@dataclass(frozen=True)
class ScoredArticle:
    plate: str
    category: str | None
    sentiment: float
    day: date


def _round(value: float) -> float:
    return round(value, 3)


def relative_score(raw: float | None, count: int, national_raw: float) -> float:
    if raw is None or count == 0:
        return 0.0
    shrunk = (raw * count + national_raw * SHRINKAGE_K) / (count + SHRINKAGE_K)
    return _round(math.tanh((shrunk - national_raw) / SCORE_SPREAD))


def _window(sums: list[float], counts: list[int], t: int) -> tuple[float | None, int]:
    start = max(0, t - WINDOW_DAYS + 1)
    total = sum(sums[start : t + 1])
    n = sum(counts[start : t + 1])
    return (total / n if n else None), n


def compute_series(articles: Iterable[ScoredArticle], days: list[date], plates: list[str]) -> dict:
    """Returns the `national` and `provinces` blocks of the dataset contract."""
    index = {day: i for i, day in enumerate(days)}
    size = len(days)
    sums: dict[tuple[str, str], list[float]] = defaultdict(lambda: [0.0] * size)
    counts: dict[tuple[str, str], list[int]] = defaultdict(lambda: [0] * size)

    for article in articles:
        t = index.get(article.day)
        if t is None:
            continue
        for category in (ALL, article.category) if article.category else (ALL,):
            sums[(article.plate, category)][t] += article.sentiment
            counts[(article.plate, category)][t] += 1

    national: dict[str, dict[str, list]] = {}
    national_sums: dict[str, list[float]] = {}
    for category in ALL_CATEGORIES:
        day_sums = [sum(sums[(p, category)][t] for p in plates if (p, category) in sums) for t in range(size)]
        day_counts = [sum(counts[(p, category)][t] for p in plates if (p, category) in counts) for t in range(size)]
        national_sums[category] = day_sums
        national[category] = {
            "raw": [_round(s / n) if n else 0.0 for s, n in zip(day_sums, day_counts)],
            "n": day_counts,
        }

    provinces: dict[str, dict[str, dict[str, list]]] = {plate: {} for plate in plates}
    for category in ALL_CATEGORIES:
        national_window = [
            _window(national_sums[category], national[category]["n"], t)[0] or 0.0 for t in range(size)
        ]
        for plate in plates:
            plate_sums = sums.get((plate, category), [0.0] * size)
            plate_counts = counts.get((plate, category), [0] * size)
            scores, windowed_counts = [], []
            for t in range(size):
                raw, n = _window(plate_sums, plate_counts, t)
                scores.append(relative_score(raw, n, national_window[t]))
                windowed_counts.append(n)
            provinces[plate][category] = {"s": scores, "n": windowed_counts}

    return {"national": national, "provinces": provinces}
