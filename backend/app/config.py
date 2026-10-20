from datetime import timedelta, timezone
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent

# Türkiye has used a fixed UTC+3 offset year-round since 2016.
TURKEY_TZ = timezone(timedelta(hours=3), name="TRT")


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(BACKEND_DIR.parent / ".env", BACKEND_DIR / ".env"),
        extra="ignore",
    )

    database_url: str = f"sqlite:///{(BACKEND_DIR / 'data' / 'nabiz.db').as_posix()}"
    sources_file: Path = BACKEND_DIR / "config" / "sources.yaml"
    cors_origins: str = "http://localhost:3000"

    enable_scheduler: bool = True
    ingest_interval_minutes: int = 60
    ingest_token: str | None = None
    request_timeout_seconds: float = 15.0

    sentiment_backend: str = "auto"
    sentiment_model: str = "savasy/bert-base-turkish-sentiment-cased"

    anthropic_api_key: str | None = None
    llm_model: str = "claude-opus-5-5"

    history_days: int = 30

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @property
    def llm_enabled(self) -> bool:
        return bool(self.anthropic_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
