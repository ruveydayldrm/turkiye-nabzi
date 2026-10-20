import logging
import math
from functools import lru_cache
from typing import Protocol

from app.config import get_settings
from app.pipeline.text import PatternSet, lower_words

log = logging.getLogger(__name__)


class SentimentAnalyzer(Protocol):
    name: str

    def score(self, texts: list[str]) -> list[float]:
        """Returns one score in [-1, 1] per text."""
        ...


class TransformersSentimentAnalyzer:
    def __init__(self, model_name: str, batch_size: int = 16):
        from transformers import pipeline

        self.name = model_name
        self.batch_size = batch_size
        self._pipeline = pipeline("text-classification", model=model_name, top_k=None, truncation=True, max_length=256)

    def score(self, texts: list[str]) -> list[float]:
        if not texts:
            return []
        outputs = self._pipeline(texts, batch_size=self.batch_size)
        return [self._to_score(labels) for labels in outputs]

    @staticmethod
    def _to_score(labels: list[dict]) -> float:
        positive = negative = 0.0
        for item in labels:
            label = item["label"].lower()
            if label.startswith("pos") or label == "label_1":
                positive += item["score"]
            elif label.startswith("neg") or label == "label_0":
                negative += item["score"]
        return max(-1.0, min(1.0, positive - negative))


POSITIVE = PatternSet((
    "başarı*", "rekor*", "kazandı*", "kazanan*", "ödül*", "şampiyon*", "birinci*", "galibiyet*", "zafer*",
    "açıldı", "hizmete*", "kurtarıldı*", "kurtardı*", "sevindir*", "mutlu*", "umut*", "destek*", "yatırım*",
    "istihdam*", "festival*", "coşku*", "büyüme*", "olumlu*", "iyileşti*", "tamamlandı*", "güçlü*", "ilgi*",
    "bayram*", "ihracat*", "rekor kır*", "sağ kurtarıldı*",
))
NEGATIVE = PatternSet((
    "kaza", "kazası*", "kazada", "kazasında", "kazay*", "kazalar*", "boğul*", "öldü", "ölü", "ölüm", "öldürül*", "hayatını kaybet*", "yaralı*",
    "yaralandı*", "yangın*", "sel", "seli", "selde", "deprem*", "cinayet*", "gözaltı*", "tutuklan*", "saldırı*",
    "zam", "zamm*", "kriz*", "iflas*", "kapandı*", "mağlup*", "yenildi*", "kirlilik*", "salgın*", "şikayet*",
    "şikâyet*", "tepki*", "protesto*", "dolandırıc*", "hırsız*", "patlama*", "heyelan*", "felaket*", "işsiz*",
    "alarm*", "endişe*", "tehlike*", "çökme*", "iptal*", "sorun*", "sıkıntı*", "su baskın*",
))


class LexiconSentimentAnalyzer:
    """Dependency-free fallback used in tests and slim deployments."""

    name = "lexicon"

    def score(self, texts: list[str]) -> list[float]:
        return [self._score(text) for text in texts]

    @staticmethod
    def _score(text: str) -> float:
        words = lower_words(text)
        return math.tanh((POSITIVE.count(words) - NEGATIVE.count(words)) / 1.5)


@lru_cache
def get_analyzer() -> SentimentAnalyzer:
    settings = get_settings()
    if settings.sentiment_backend == "lexicon":
        return LexiconSentimentAnalyzer()
    try:
        analyzer = TransformersSentimentAnalyzer(settings.sentiment_model)
        log.info("Sentiment model loaded: %s", settings.sentiment_model)
        return analyzer
    except Exception as error:  # ImportError or model download failure
        if settings.sentiment_backend == "transformers":
            raise
        log.warning("Transformers unavailable (%s); falling back to lexicon sentiment", error)
        return LexiconSentimentAnalyzer()
