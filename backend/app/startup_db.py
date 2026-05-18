"""Лёгкие идемпотентные правки схемы при старте (без отдельного шага миграции вручную)."""

from sqlalchemy import text

from app.database import engine


async def apply_startup_schema_patches() -> None:
    """Добавляет колонки, которых может не быть в старых БД. Безопасно вызывать многократно."""
    async with engine.begin() as conn:
        await conn.execute(
            text("alter table events add column if not exists event_daily_schedule jsonb"),
        )
