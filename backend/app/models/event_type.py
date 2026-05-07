from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class EventType(Base):
    __tablename__ = "event_types"

    event_type_id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    event_type_name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=False), server_default=func.now())

