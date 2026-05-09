from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EventTypeCreate(BaseModel):
    event_type_name: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    is_active: bool = True


class EventTypeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_type_id: int
    event_type_name: str
    description: str | None
    is_active: bool
    created_at: datetime

class EventTypeUpdate(BaseModel):
    event_type_name: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    is_active: bool | None = None

EventTypeCreate.model_rebuild()
EventTypeRead.model_rebuild()
EventTypeUpdate.model_rebuild()
