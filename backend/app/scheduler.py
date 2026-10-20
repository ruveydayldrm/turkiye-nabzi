import logging
from datetime import UTC, datetime, timedelta

from apscheduler.schedulers.background import BackgroundScheduler

from app import services
from app.db import SessionLocal

log = logging.getLogger(__name__)


def _ingest_job() -> None:
    try:
        with SessionLocal() as session:
            services.run_ingest(session)
    except Exception:
        log.exception("Scheduled ingest failed")


def start_scheduler(interval_minutes: int) -> BackgroundScheduler:
    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(
        _ingest_job,
        "interval",
        minutes=interval_minutes,
        next_run_time=datetime.now(UTC) + timedelta(seconds=5),
        max_instances=1,
        coalesce=True,
        id="ingest",
    )
    scheduler.start()
    log.info("Scheduler started: ingest every %d min", interval_minutes)
    return scheduler
