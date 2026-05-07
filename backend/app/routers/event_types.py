from __future__ import annotations

import asyncpg.exceptions
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import commit_session
from app.database import get_session
from app.models.event_type import EventType
from app.schemas.event_type import EventTypeCreate, EventTypeRead

router = APIRouter(prefix="/event-types", tags=["event-types"])


@router.post("", response_model=EventTypeRead, status_code=201)
async def create_event_type(
    body: EventTypeCreate,
    session: AsyncSession = Depends(get_session),
) -> EventType:
    event_type = EventType(**body.model_dump())
    session.add(event_type)
    try:
        await commit_session(session)
    except HTTPException as exc:
        if exc.status_code == 409:
            raise HTTPException(status_code=409, detail="Тип мероприятия с таким названием уже существует.") from exc
        raise
    except IntegrityError as exc:
        await session.rollback()
        if isinstance(exc.orig, asyncpg.exceptions.UniqueViolationError):
            raise HTTPException(status_code=409, detail="Тип мероприятия с таким названием уже существует.") from exc
        raise
    await session.refresh(event_type)
    return event_type

