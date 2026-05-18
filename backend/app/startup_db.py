"""Лёгкие идемпотентные правки схемы при старте (без отдельного шага миграции вручную)."""

from sqlalchemy import text

from app.database import engine

EVENT_TYPE_SEED = (
    "Олимпиада",
    "Конференция",
    "Семинар",
    "Мастер-класс",
    "Спортивное соревнование",
    "Выездное мероприятие",
    "Волонтёрский проект",
    "Профориентация",
    "Культурное мероприятие",
    "Научная школа",
    "Хакатон",
    "Форум",
)


async def apply_startup_schema_patches() -> None:
    """Добавляет колонки, которых может не быть в старых БД. Безопасно вызывать многократно."""
    async with engine.begin() as conn:
        await conn.execute(
            text("alter table events add column if not exists event_daily_schedule jsonb"),
        )
        for name in EVENT_TYPE_SEED:
            await conn.execute(
                text(
                    "insert into event_types (event_type_name, description, is_active) "
                    "values (:name, null, true) "
                    "on conflict (event_type_name) do nothing"
                ),
                {"name": name},
            )
