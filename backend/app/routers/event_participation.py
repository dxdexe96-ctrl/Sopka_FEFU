from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api import commit_session
from app.database import get_session
from app.models.event import Event
from app.models.event_participation import EventParticipation
from app.schemas.event_participation import (EventParticipationCreate,
                                             EventParticipationRead,
                                             EventParticipationUpdate ) #слишком длинные названия


# Вложенные операции внутри мероприятия: /events/{event_id}/participants
nested = APIRouter(prefix="/events/{event_id}/participants", tags=["event-participation"])

# Корневые операции с участием по ID: /participants/{participation_id}
root = APIRouter(prefix="/participants", tags=["event-participation"])


async def _get_event_or_404(session: AsyncSession, event_id: int) -> Event:
    event = await session.get(Event, event_id)
    if event is None:
        raise HTTPException(status_code=404, detail="Мероприятие не найдено.")
    return event


# эндпоинты связаны с конкретным мероприятием
@nested.post("", response_model=EventParticipationRead, status_code=201)
async def add_participant(
    event_id: int,
    body: EventParticipationCreate,
    session: AsyncSession = Depends(get_session),
) -> EventParticipation:
    await _get_event_or_404(session, event_id)

    participation = EventParticipation(event_id=event_id, **body.model_dump())
    session.add(participation)

    try:
        await commit_session(session)
    except HTTPException:
        raise
    except Exception as exc:
        await session.rollback()
        # проверка уникальности(студент + мероприятие + роль)
        # нужно делать проверку типа студент и разные роли?
        # если студент уже есть как организатор добавить его уже нельзя?
        if hasattr(exc, "orig") and "uq_event_participation" in str(exc.orig).lower():
            raise HTTPException(
                status_code=409,
                detail="Участник с такой ролью уже добавлен.",
            ) from exc
        raise HTTPException(status_code=500, detail="Ошибка при добавлении участника.")

    await session.refresh(participation)
    return participation


@nested.get("", response_model=list[EventParticipationRead])
async def list_participants(
    event_id: int,
    session: AsyncSession = Depends(get_session),
) -> list[EventParticipation]:
    await _get_event_or_404(session, event_id)

    stmt = (
        select(EventParticipation)
        .where(EventParticipation.event_id == event_id)
        .order_by(EventParticipation.participation_id)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


@nested.patch("/{participation_id}", response_model=EventParticipationRead)
async def update_participation_in_event(
    event_id: int,
    participation_id: int,
    body: EventParticipationUpdate,
    session: AsyncSession = Depends(get_session),
) -> EventParticipation:
    await _get_event_or_404(session, event_id)

    participation = await session.get(EventParticipation, participation_id)
    if participation is None or participation.event_id != event_id:
        raise HTTPException(status_code=404, detail="Запись участия не найдена.")

    data = body.model_dump(exclude_unset=True)
    if not data:
        return participation

    for key, value in data.items():
        setattr(participation, key, value)

    session.add(participation)
    await commit_session(session)
    await session.refresh(participation)
    return participation


@nested.delete("/{participation_id}", status_code=204)
async def delete_participation_from_event(
    event_id: int,
    participation_id: int,
    session: AsyncSession = Depends(get_session),
) -> None:
    await _get_event_or_404(session, event_id)

    participation = await session.get(EventParticipation, participation_id)
    if participation is None or participation.event_id != event_id:
        raise HTTPException(status_code=404, detail="Запись участия не найдена.")

    await session.delete(participation)
    await commit_session(session)
    return None


# --------------------------------------------------------------------------- #
# Корневые эндпоинты (работа с участием по его ID, без привязки к мероприятию)
# --------------------------------------------------------------------------- #

@root.get("/{participation_id}", response_model=EventParticipationRead)
async def get_participation(
    participation_id: int,
    session: AsyncSession = Depends(get_session),
) -> EventParticipation:
    participation = await session.get(EventParticipation, participation_id)
    if participation is None:
        raise HTTPException(status_code=404, detail="Запись участия не найдена.")
    return participation


@root.patch("/{participation_id}", response_model=EventParticipationRead)
async def update_participation(
    participation_id: int,
    body: EventParticipationUpdate,
    session: AsyncSession = Depends(get_session),
) -> EventParticipation:
    participation = await session.get(EventParticipation, participation_id)
    if participation is None:
        raise HTTPException(status_code=404, detail="Запись участия не найдена.")

    data = body.model_dump(exclude_unset=True)
    if not data:
        return participation

    for key, value in data.items():
        setattr(participation, key, value)

    session.add(participation)
    await commit_session(session)
    await session.refresh(participation)
    return participation


@root.delete("/{participation_id}", status_code=204)
async def delete_participation(
    participation_id: int,
    session: AsyncSession = Depends(get_session),
) -> None:
    participation = await session.get(EventParticipation, participation_id)
    if participation is None:
        raise HTTPException(status_code=404, detail="Запись участия не найдена.")

    await session.delete(participation)
    await commit_session(session)
    return None


router = APIRouter()
router.include_router(nested)
router.include_router(root)