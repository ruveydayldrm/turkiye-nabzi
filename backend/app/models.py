from datetime import datetime

from sqlalchemy import DateTime, Float, Index, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Article(Base):
    __tablename__ = "articles"

    id: Mapped[int] = mapped_column(primary_key=True)
    url: Mapped[str] = mapped_column(String(1024), unique=True)
    title: Mapped[str] = mapped_column(String(512))
    title_key: Mapped[str] = mapped_column(String(512), index=True)
    summary: Mapped[str] = mapped_column(Text, default="")
    source: Mapped[str] = mapped_column(String(128))
    published_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    province_plate: Mapped[str | None] = mapped_column(String(2), index=True)
    category: Mapped[str | None] = mapped_column(String(32))
    sentiment: Mapped[float | None] = mapped_column(Float)

    __table_args__ = (Index("ix_articles_plate_published", "province_plate", "published_at"),)


class ProvinceHighlight(Base):
    __tablename__ = "province_highlights"

    id: Mapped[int] = mapped_column(primary_key=True)
    plate: Mapped[str] = mapped_column(String(2))
    day: Mapped[str] = mapped_column(String(10))
    text: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    __table_args__ = (UniqueConstraint("plate", "day"),)
