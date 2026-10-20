from difflib import SequenceMatcher
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

TRACKING_PREFIXES = ("utm_", "fbclid", "gclid", "ref", "share", "from")
TITLE_RATIO_THRESHOLD = 0.9
TOKEN_JACCARD_THRESHOLD = 0.85


def normalize_url(url: str) -> str:
    parts = urlsplit(url.strip())
    host = parts.netloc.lower().removeprefix("www.")
    query = urlencode(sorted((k, v) for k, v in parse_qsl(parts.query) if not k.lower().startswith(TRACKING_PREFIXES)))
    path = parts.path.rstrip("/") or "/"
    return urlunsplit(("https", host, path, query, ""))


def titles_match(a: str, b: str) -> bool:
    """Compares two `title_key`s; catches the same story republished with small edits."""
    if a == b:
        return True
    tokens_a, tokens_b = set(a.split()), set(b.split())
    if min(len(tokens_a), len(tokens_b)) >= 4:
        jaccard = len(tokens_a & tokens_b) / len(tokens_a | tokens_b)
        if jaccard >= TOKEN_JACCARD_THRESHOLD:
            return True
    return SequenceMatcher(None, a, b).ratio() >= TITLE_RATIO_THRESHOLD


class Deduplicator:
    def __init__(self, known_urls: set[str], recent_title_keys: list[str]):
        self.urls = set(known_urls)
        self.title_keys = list(recent_title_keys)

    def is_duplicate(self, url: str, key: str) -> bool:
        if url in self.urls:
            return True
        return any(titles_match(key, existing) for existing in self.title_keys)

    def add(self, url: str, key: str) -> None:
        self.urls.add(url)
        self.title_keys.append(key)
