"""Maps a news article to the province it is about, using a dictionary of all provinces and districts."""

import json
import re
from collections import defaultdict
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

from app.pipeline.text import Token, fold, tokenize

DATA_FILE = Path(__file__).resolve().parent.parent / "data" / "provinces.json"
MAX_NGRAM = 3

# Derivational endings written without an apostrophe: "Trabzonlu", "İzmirliler", "Ankaralıların".
DERIVED_SUFFIX_RE = re.compile(
    r"(?:li|lu)(?:ler|lar)?(?:in|un|nin|nun|i|u|e|a|de|da|den|dan|le|la)?$"
)

# Names that are also common words or surnames; they need extra evidence.
AMBIGUOUS_NAMES = {"aydin", "van", "batman", "ordu", "mersin", "tokat", "usak", "kars", "mus", "bolu", "sinop", "kilis", "rize"}
MILITARY_CONTEXT = {"komutani", "komutanligi", "komutanlari", "birlikleri", "birligi", "mensubu", "kuvvetleri", "saflarinda"}
MILITARY_PREFIX = {"turk", "kizil", "rus", "israil", "ukrayna", "kara", "hava", "deniz", "milli", "abd", "iran", "suriye"}
# Capitalised words that commonly follow a place name: "Van Gölü", "Aydın Valiliği", "Ordu Büyükşehir".
PLACE_FOLLOWERS = ("gol", "kale", "vali", "beled", "buyuksehir", "ova", "havaliman", "universite", "il", "merkez", "emniyet", "liman")
BATMAN_CONTEXT = {"film", "filmi", "filminin", "dc", "joker", "gotham", "bruce", "wayne", "robin", "superman", "kahraman"}

PROVINCE_WEIGHT = 2.0
DISTRICT_WEIGHT = 1.5
SHARED_DISTRICT_WEIGHT = 0.75
WEAK_WEIGHT = 0.5
TITLE_MULTIPLIER = 1.5
MIN_SCORE = 1.5


@dataclass(frozen=True)
class Place:
    plate: str
    name: str
    kind: str  # "province" | "district"


@dataclass
class LocationResult:
    plate: str | None
    scores: dict[str, float] = field(default_factory=dict)


class ProvinceLocator:
    def __init__(self, provinces: list[dict]):
        self.names: dict[str, list[Place]] = defaultdict(list)
        for province in provinces:
            self.names[fold(province["name"])].append(Place(province["plate"], province["name"], "province"))
            for district in province["districts"]:
                self.names[fold(district)].append(Place(province["plate"], district, "district"))
        self.names["afyon"].append(Place("03", "Afyon", "province"))
        self.place_keys = set(self.names)

    @classmethod
    def from_file(cls, path: Path = DATA_FILE) -> "ProvinceLocator":
        return cls(json.loads(path.read_text(encoding="utf-8")))

    def locate(self, title: str, summary: str = "") -> LocationResult:
        scores: dict[str, float] = defaultdict(float)
        shared: dict[str, float] = defaultdict(float)
        for text, multiplier in ((title, TITLE_MULTIPLIER), (summary, 1.0)):
            if text:
                self._score_text(text, multiplier, scores, shared)

        for plate, weight in shared.items():
            if plate in scores:
                scores[plate] += weight
        if not scores:
            return LocationResult(None, {})

        ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
        best_plate, best_score = ranked[0]
        tie = len(ranked) > 1 and ranked[1][1] == best_score
        plate = best_plate if best_score >= MIN_SCORE and not tie else None
        return LocationResult(plate, dict(scores))

    def _score_text(self, text: str, multiplier: float, scores: dict, shared: dict) -> None:
        tokens = tokenize(text)
        lowered_words = {t.key for t in tokens}
        i = 0
        while i < len(tokens):
            match = self._match_at(tokens, i)
            if match is None:
                i += 1
                continue
            places, length = match
            mention = tokens[i : i + length]
            i += length
            weight = self._mention_weight(tokens, i - length, mention, places, lowered_words)
            if weight == 0:
                continue
            plates = {place.plate for place in places}
            if len(plates) == 1:
                scores[places[0].plate] += weight * multiplier
            else:
                for plate in plates:
                    shared[plate] += SHARED_DISTRICT_WEIGHT * multiplier

    def _match_at(self, tokens: list[Token], i: int) -> tuple[list[Place], int] | None:
        for length in range(min(MAX_NGRAM, len(tokens) - i), 0, -1):
            words = tokens[i : i + length]
            if not all(t.capitalized for t in words) or any(t.suffix for t in words[:-1]):
                continue
            key = " ".join(t.key for t in words)
            if key in self.names:
                return self.names[key], length
            if length == 1 and not words[0].suffix:
                stem = DERIVED_SUFFIX_RE.sub("", key)
                if stem != key and stem in self.names and self.names[stem][0].kind == "province":
                    return self.names[stem], 1
        return None

    def _mention_weight(self, tokens: list[Token], index: int, mention: list[Token], places: list[Place], words: set[str]) -> float:
        first, last = mention[0], mention[-1]
        is_province = any(place.kind == "province" for place in places)
        base_weight = PROVINCE_WEIGHT if is_province else DISTRICT_WEIGHT
        key = " ".join(t.key for t in mention)

        if key not in AMBIGUOUS_NAMES:
            return base_weight

        prev_token = tokens[index - 1] if index > 0 else None
        next_token = tokens[index + len(mention)] if index + len(mention) < len(tokens) else None

        if key == "batman" and words & BATMAN_CONTEXT:
            return 0
        if key == "ordu":
            if next_token and next_token.key in MILITARY_CONTEXT:
                return 0
            if prev_token and prev_token.key in MILITARY_PREFIX:
                return 0
        if key == "mersin" and next_token and next_token.key.startswith("balig"):
            return 0
        if self._looks_like_person(first, prev_token, next_token, has_suffix=bool(last.suffix)):
            return 0
        if next_token and next_token.capitalized and next_token.key.startswith(PLACE_FOLLOWERS):
            return base_weight
        if first.sentence_start and not last.suffix:
            return WEAK_WEIGHT
        return base_weight

    def _looks_like_person(self, first: Token, prev_token: Token | None, next_token: Token | None, has_suffix: bool) -> bool:
        """'Ahmet Aydın', 'Van Gogh': an adjacent capitalised non-place word marks a personal name."""
        if (
            prev_token
            and prev_token.capitalized
            and not first.sentence_start
            and not prev_token.suffix
            and prev_token.key not in self.place_keys
            and not (prev_token.sentence_start and has_suffix)
        ):
            return True
        if (
            not has_suffix
            and next_token
            and next_token.capitalized
            and next_token.key not in self.place_keys
            and not next_token.key.startswith(PLACE_FOLLOWERS)
        ):
            return True
        return False


@lru_cache
def get_locator() -> ProvinceLocator:
    return ProvinceLocator.from_file()
