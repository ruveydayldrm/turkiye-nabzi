from collections.abc import Iterator
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import get_settings


class Base(DeclarativeBase):
    pass


def make_engine(url: str) -> Engine:
    if url.startswith("sqlite:///"):
        Path(url.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)
        return create_engine(url, connect_args={"check_same_thread": False})
    return create_engine(url, pool_pre_ping=True)


engine = make_engine(get_settings().database_url)
SessionLocal = sessionmaker(engine, expire_on_commit=False)


def init_db(bind: Engine = engine) -> None:
    from app import models  # noqa: F401  registers tables

    Base.metadata.create_all(bind)


def get_session() -> Iterator[Session]:
    with SessionLocal() as session:
        yield session
