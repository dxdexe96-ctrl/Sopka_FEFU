from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import commit_session
from app.database import get_session
from app.models.event import Event
from app.models.event_type import EventType
from app.schemas.event import EventCreate, EventDayScheduleRow, EventRead, EventUpdate

router = APIRouter(prefix="/events", tags=["events"])


def _schedule_for_db(rows: list[EventDayScheduleRow] | None) -> list[dict] | None:
    if not rows:
        return None
    return [row.model_dump(mode="json") for row in rows]


async def _event_to_read(session: AsyncSession, event_id: int) -> EventRead:
    stmt = (
        select(Event, EventType.event_type_name)
        .outerjoin(EventType, Event.event_type_id == EventType.event_type_id)
        .where(Event.event_id == event_id)
    )
    row = await session.execute(stmt)
    found = row.one_or_none()
    if found is None:
        raise HTTPException(status_code=404, detail="Мероприятие не найдено.")
    event, event_type_name = found
    base = EventRead.model_validate(event)
    return base.model_copy(update={"event_type_name": event_type_name})


@router.post("", response_model=EventRead, status_code=201)
async def create_event(body: EventCreate, session: AsyncSession = Depends(get_session)) -> EventRead:
    data = body.model_dump()
    data["event_daily_schedule"] = _schedule_for_db(body.event_daily_schedule)
    event = Event(**data)
    session.add(event)
    await commit_session(session)
    await session.refresh(event)
    return await _event_to_read(session, event.event_id)


@router.get("", response_model=list[EventRead])
async def list_events(
    session: AsyncSession = Depends(get_session),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
) -> list[EventRead]:
    stmt = (
        select(Event, EventType.event_type_name)
        .outerjoin(EventType, Event.event_type_id == EventType.event_type_id)
        .order_by(Event.event_id.desc())
        .offset(skip)
        .limit(limit)
    )
    result = await session.execute(stmt)
    rows: list[EventRead] = []
    for event, event_type_name in result.all():
        base = EventRead.model_validate(event)
        rows.append(base.model_copy(update={"event_type_name": event_type_name}))
    return rows


@router.get("/{event_id}", response_model=EventRead)
async def get_event(event_id: int, session: AsyncSession = Depends(get_session)) -> EventRead:
    return await _event_to_read(session, event_id)


@router.patch("/{event_id}", response_model=EventRead)
async def update_event(event_id: int, body: EventUpdate, session: AsyncSession = Depends(get_session)) -> EventRead:
    event = await session.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Мероприятие не найдено.")
    data = body.model_dump(exclude_unset=True)
    if "event_daily_schedule" in data:
        data["event_daily_schedule"] = _schedule_for_db(body.event_daily_schedule)
    if not data:
        return await _event_to_read(session, event_id)
    for key, value in data.items():
        setattr(event, key, value)
    session.add(event)
    await commit_session(session)
    await session.refresh(event)
    return await _event_to_read(session, event_id)


@router.delete("/{event_id}", status_code=204)
async def delete_event(event_id: int, session: AsyncSession = Depends(get_session)) -> None:
    event = await session.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Мероприятие не найдено.")
    await session.delete(event)
    await commit_session(session)
    return None

