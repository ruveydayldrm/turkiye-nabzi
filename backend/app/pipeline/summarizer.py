"""Optional "today's highlights" summary per province. Silently disabled without ANTHROPIC_API_KEY."""

import logging
from functools import lru_cache

from app.config import get_settings

log = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "Sen yerel haberleri özetleyen tarafsız bir haber editörüsün. Sana bir ile ait bugünkü haber "
    "başlıkları ve kısa özetleri verilecek. Bu ilde bugün öne çıkan gelişmeleri 2-3 kısa Türkçe "
    "cümleyle özetle. Yalnızca verilen haberlerdeki bilgileri kullan; yorum, tahmin veya abartı ekleme. "
    "Liste, başlık veya giriş cümlesi kullanma, doğrudan özeti yaz."
)


class HighlightSummarizer:
    def __init__(self, api_key: str, model: str):
        import anthropic

        self._anthropic = anthropic
        self.client = anthropic.Anthropic(api_key=api_key)
        self.model = model

    def summarize(self, province: str, headlines: list[tuple[str, str]]) -> str | None:
        news = "\n".join(f"- {title}" + (f": {summary[:240]}" if summary else "") for title, summary in headlines)
        try:
            response = self.client.beta.messages.create(
                model=self.model,
                max_tokens=2000,
                system=SYSTEM_PROMPT,
                output_config={"effort": "low"},
                betas=["server-side-fallback-2026-07-01"],
                fallbacks="default",
                messages=[{"role": "user", "content": f"İl: {province}\n\nBugünkü haberler:\n{news}"}],
            )
        except self._anthropic.APIError as error:
            log.warning("Highlight summary failed for %s: %s", province, error)
            return None
        if response.stop_reason == "refusal":
            return None
        text = "".join(block.text for block in response.content if block.type == "text").strip()
        return text or None


@lru_cache
def get_summarizer() -> HighlightSummarizer | None:
    settings = get_settings()
    if not settings.llm_enabled:
        return None
    try:
        return HighlightSummarizer(settings.anthropic_api_key or "", settings.llm_model)
    except ImportError:
        log.warning("anthropic package missing; highlights disabled")
        return None
