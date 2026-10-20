from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ProvinceSeries(BaseModel):
    s: list[float]
    n: list[int]


class NationalSeries(BaseModel):
    raw: list[float]
    n: list[int]


class Dataset(CamelModel):
    generated_at: str
    is_demo: bool
    days: list[str]
    window_days: int
    min_articles: int
    national: dict[str, NationalSeries]
    provinces: dict[str, dict[str, ProvinceSeries]]


class Headline(CamelModel):
    title: str
    url: str
    source: str
    category: str
    sentiment: float
    published_at: str


class Keyword(BaseModel):
    text: str
    weight: int


class ProvinceDetail(CamelModel):
    plate: str
    generated_at: str
    headlines: list[Headline]
    keywords: list[Keyword]
    highlights: str | None


class IngestResult(BaseModel):
    fetched: int
    stored: int
    duplicates: int
    located: int
    too_old: int


class Health(CamelModel):
    status: str
    articles: int
    sentiment_backend: str
    llm_enabled: bool
