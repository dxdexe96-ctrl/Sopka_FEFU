from __future__ import annotations

from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_session
from app.models.event import Event
from app.models.event_participation import EventParticipation
from app.models.event_participation_time_slot import EventParticipationTimeSlot
from app.models.event_type import EventType
from app.models.student import Student
from app.schemas.reports import (
    ParticipantSummaryCell,
    ParticipantSummaryEvent,
    ParticipantSummaryRow,
    ParticipantsSummaryReport,
)

router = APIRouter(prefix="/reports", tags=["reports"])


def _student_full_name(last_name: str, first_name: str, middle_name: str | None) -> str:
    return " ".join(part for part in (last_name, first_name, middle_name) if part)


@router.get("/participants-summary", response_model=ParticipantsSummaryReport)
async def get_participants_summary(
    session: AsyncSession = Depends(get_session),
    search: str | None = Query(None, max_length=200),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    event_level: str | None = Query(None, max_length=50),
    event_type_id: int | None = Query(None, ge=1),
    event_limit: int = Query(200, ge=1, le=500),
) -> ParticipantsSummaryReport:
    if date_from and date_to and date_from > date_to:
        raise HTTPException(status_code=422, detail="Дата начала периода не может быть позже даты окончания.")

    event_filters = []
    if search and search.strip():
        event_filters.append(Event.event_name.ilike(f"%{search.strip()}%"))
    if date_from:
        event_filters.append(func.coalesce(Event.end_date, Event.start_date) >= date_from)
    if date_to:
        event_filters.append(Event.start_date <= date_to)
    if event_level:
        event_filters.append(Event.event_level == event_level)
    if event_type_id:
        event_filters.append(Event.event_type_id == event_type_id)

    events_stmt = (
        select(Event, EventType.event_type_name)
        .outerjoin(EventType, Event.event_type_id == EventType.event_type_id)
        .where(*event_filters)
        .order_by(Event.start_date, Event.event_name, Event.event_id)
        .limit(event_limit)
    )
    event_result = await session.execute(events_stmt)

    events = [
        ParticipantSummaryEvent(
            event_id=event.event_id,
            event_name=event.event_name,
            event_level=event.event_level,
            event_type_id=event.event_type_id,
            event_type_name=event_type_name,
            start_date=event.start_date,
            end_date=event.end_date,
        )
        for event, event_type_name in event_result.all()
    ]

    if not events:
        return ParticipantsSummaryReport(participant_count=0, event_count=0, events=[], rows=[])

    event_ids = [event.event_id for event in events]

    slot_filters = []
    if date_from:
        slot_filters.append(EventParticipationTimeSlot.participation_date >= date_from)
    if date_to:
        slot_filters.append(EventParticipationTimeSlot.participation_date <= date_to)

    slot_hours = func.coalesce(EventParticipationTimeSlot.participation_hours, 0)
    if slot_filters:
        slot_match = and_(*slot_filters)
        hours_expr = case((slot_match, slot_hours), else_=0)
        slot_count_expr = func.count(case((slot_match, EventParticipationTimeSlot.participation_time_slot_id)))
    else:
        hours_expr = slot_hours
        slot_count_expr = func.count(EventParticipationTimeSlot.participation_time_slot_id)

    participation_stmt = (
        select(
            Student.student_id,
            Student.last_name,
            Student.first_name,
            Student.middle_name,
            Student.phone,
            EventParticipation.event_id,
            func.coalesce(func.sum(hours_expr), 0).label("hours"),
            slot_count_expr.label("time_slots_count"),
        )
        .select_from(EventParticipation)
        .join(Student, Student.student_id == EventParticipation.student_id)
        .outerjoin(
            EventParticipationTimeSlot,
            EventParticipationTimeSlot.participation_id == EventParticipation.participation_id,
        )
        .where(EventParticipation.event_id.in_(event_ids))
        .group_by(
            Student.student_id,
            Student.last_name,
            Student.first_name,
            Student.middle_name,
            Student.phone,
            EventParticipation.event_id,
        )
        .order_by(Student.last_name, Student.first_name, Student.middle_name, Student.student_id)
    )
    participation_result = await session.execute(participation_stmt)

    rows_by_student: dict[int, dict] = {}
    for row in participation_result.all():
        total_hours = Decimal(str(row.hours or 0))
        student_row = rows_by_student.setdefault(
            row.student_id,
            {
                "student_id": row.student_id,
                "full_name": _student_full_name(row.last_name, row.first_name, row.middle_name),
                "phone": row.phone,
                "total_hours": Decimal("0"),
                "cells": {},
            },
        )
        student_row["total_hours"] += total_hours
        student_row["cells"][row.event_id] = ParticipantSummaryCell(
            event_id=row.event_id,
            hours=total_hours,
            time_slots_count=int(row.time_slots_count or 0),
        )

    report_rows = []
    for row in rows_by_student.values():
        report_rows.append(
            ParticipantSummaryRow(
                student_id=row["student_id"],
                full_name=row["full_name"],
                phone=row["phone"],
                total_hours=row["total_hours"],
                events=[
                    row["cells"].get(
                        event.event_id,
                        ParticipantSummaryCell(
                            event_id=event.event_id,
                            hours=Decimal("0"),
                            time_slots_count=0,
                        ),
                    )
                    for event in events
                ],
            )
        )

    return ParticipantsSummaryReport(
        participant_count=len(report_rows),
        event_count=len(events),
        events=events,
        rows=report_rows,
    )
