from app.routers.bank_details import router as bank_details_router
from app.routers.events import router as events_router
from app.routers.event_types import router as event_types_router
from app.routers.students import router as students_router

__all__ = ["students_router", "bank_details_router", "events_router", "event_types_router"]
