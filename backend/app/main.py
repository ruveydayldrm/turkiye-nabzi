import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import router
from app.config import get_settings
from app.db import init_db
from app.scheduler import start_scheduler

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    settings = get_settings()
    init_db()
    scheduler = start_scheduler(settings.ingest_interval_minutes) if settings.enable_scheduler else None
    yield
    if scheduler:
        scheduler.shutdown(wait=False)


app = FastAPI(
    title="Türkiye Nabzı API",
    description="İllere göre haber duygu analizi: RSS toplama, konum çıkarma, duygu skoru ve özetler.",
    version="1.0.0",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
app.include_router(router)
