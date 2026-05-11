from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field

class EventParticipationCreate(BaseModel):
    student_id: int
    role_name: str = Field(..., min_length=1, max_length=100)
    participation_status: str | None = Field(None, max_length=50)
    notes: str | None = None

class EventParticipationUpdate(BaseModel):
    role_name: str | None = Field(None, min_length=1, max_length=100)
    participation_status: str | None = Field(None, max_length=50)
    notes: str | None = None

class EventParticipationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    participation_id: int
    student_id: int
    event_id: int
    role_name: str
    participation_status: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime