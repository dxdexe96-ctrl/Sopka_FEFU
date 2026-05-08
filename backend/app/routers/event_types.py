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



@router.get("/{event_type_id}", response_model=EventTypeRead)
async def get_event_type(
    event_type_id: int,
    session: AsyncSession = Depends(get_session),
) -> EventType:
    event_type = await session.get(EventType, event_type_id)
    if event_type is None:
        raise HTTPException(status_code=404, detail="Тип мероприятия не найден.")
    return event_type


@router.patch("/{event_type_id}", response_model=EventTypeRead)
async def update_event_type(
    event_type_id: int,
    body: EventTypeUpdate,
    session: AsyncSession = Depends(get_session),
) -> EventType:

    event_type = await session.get(EventType, event_type_id)
    if event_type is None:
        raise HTTPException(status_code=404, detail="Тип мероприятия не найден.")

    # Обновление только тех полей которые переданы не нонэ
    update_data = body.model_dump(exclude_unset=True)  # исключаем поля, которые не были переданы
    for field, value in update_data.items():
        setattr(event_type, field, value)

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


@router.delete("/{event_type_id}", status_code=204)
async def delete_event_type(
        event_type_id: int,
        session: AsyncSession = Depends(get_session),) -> None:
    event_type = await session.get(EventType, event_type_id)
    if event_type is None:
        raise HTTPException(status_code=404, detail="Тип мероприятия не найден.")

    await session.delete(event_type)
    try:
        await commit_session(session)
    except HTTPException as exc:
        raise
    except Exception as exc:
        await session.rollback()
        raise HTTPException(status_code=500, detail="Ошибка при удалении типа мероприятия.")
    return None