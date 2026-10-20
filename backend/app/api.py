from dataclasses import asdict
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Path
from sqlalchemy.orm import Session

from app import services
from app.config import get_settings
from app.db import get_session
from app.schemas import Dataset, Health, IngestResult, ProvinceDetail

router = APIRouter(prefix="/api")
SessionDep = Annotated[Session, Depends(get_session)]


@router.get("/health", response_model=Health, tags=["meta"])
def health(session: SessionDep) -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "articles": services.article_count(session),
        "sentimentBackend": settings.sentiment_backend,
        "llmEnabled": settings.llm_enabled,
    }


@router.get("/dataset", response_model=Dataset, tags=["data"], summary="30-day sentiment series for all provinces")
def dataset(session: SessionDep) -> dict:
    return services.cached_dataset(session)


@router.get("/provinces/{plate}", response_model=ProvinceDetail, tags=["data"], summary="Headlines, keywords and highlights")
def province(session: SessionDep, plate: Annotated[str, Path(pattern=r"^\d{2}$")]) -> dict:
    if plate not in services.NAMES:
        raise HTTPException(status_code=404, detail="Unknown plate code")
    return services.province_detail(session, plate)


@router.post("/ingest", response_model=IngestResult, tags=["pipeline"], summary="Fetch RSS feeds now")
def ingest(session: SessionDep, x_ingest_token: Annotated[str | None, Header()] = None) -> dict:
    token = get_settings().ingest_token
    if token and x_ingest_token != token:
        raise HTTPException(status_code=401, detail="Invalid ingest token")
    return asdict(services.run_ingest(session))
