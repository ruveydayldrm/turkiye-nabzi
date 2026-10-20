import html
import re
from dataclasses import dataclass

APOSTROPHES = "'’`´‘"
_FOLD = str.maketrans({"ç": "c", "ğ": "g", "ı": "i", "ö": "o", "ş": "s", "ü": "u", "â": "a", "î": "i", "û": "u"})
_TAG_RE = re.compile(r"<[^>]+>")
_SPACE_RE = re.compile(r"\s+")
TOKEN_RE = re.compile(rf"[A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû]+(?:[{APOSTROPHES}][A-Za-zÇĞİÖŞÜçğıöşüÂâÎîÛû]+)?")
SENTENCE_END = tuple(".!?…:;\"“”«»")


def turkish_lower(text: str) -> str:
    return text.replace("İ", "i").replace("I", "ı").lower()


def fold(text: str) -> str:
    """Case- and diacritic-insensitive key: 'İzmir' and 'IZMIR' both become 'izmir'."""
    return turkish_lower(text).translate(_FOLD).replace("̇", "")


def clean_html(text: str) -> str:
    return _SPACE_RE.sub(" ", html.unescape(_TAG_RE.sub(" ", text or ""))).strip()


@dataclass(frozen=True)
class Token:
    text: str
    base: str
    suffix: str
    start: int
    sentence_start: bool

    @property
    def capitalized(self) -> bool:
        return self.base[:1].isupper()

    @property
    def key(self) -> str:
        return fold(self.base)


def tokenize(text: str) -> list[Token]:
    tokens: list[Token] = []
    for match in TOKEN_RE.finditer(text):
        word = match.group()
        base, _, suffix = next(
            ((word[:i], word[i], word[i + 1 :]) for i, ch in enumerate(word) if ch in APOSTROPHES),
            (word, "", ""),
        )
        before = text[: match.start()].rstrip()
        tokens.append(
            Token(
                text=word,
                base=base,
                suffix=suffix,
                start=match.start(),
                sentence_start=not before or before.endswith(SENTENCE_END),
            )
        )
    return tokens


class PatternSet:
    """Turkish-aware word patterns: 'kaza*' is a prefix, 'kaza' an exact word, 'su baskını' a phrase."""

    def __init__(self, patterns: tuple[str, ...]):
        lowered = [turkish_lower(p) for p in patterns]
        self.prefixes = tuple(p[:-1] for p in lowered if p.endswith("*"))
        self.exact = {p for p in lowered if not p.endswith("*") and " " not in p}
        self.phrases = tuple(p for p in lowered if " " in p)

    def count(self, words: list[str]) -> int:
        joined = f" {' '.join(words)} "
        hits = sum(1 for w in words if w in self.exact or (self.prefixes and w.startswith(self.prefixes)))
        return hits + sum(1 for phrase in self.phrases if f" {phrase.rstrip('*')}" in joined)


def lower_words(text: str) -> list[str]:
    return [turkish_lower(token.base) for token in tokenize(text)]


def title_key(title: str) -> str:
    return " ".join(fold(t.text) for t in tokenize(title))
