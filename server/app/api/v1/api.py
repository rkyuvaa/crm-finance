from fastapi import APIRouter

from app.api.v1 import (
    applications,
    auth,
    dashboard,
    final_submission,
    masters,
    notifications,
    planned_activities,
    public_financier,
    smtp,
    stubs,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(dashboard.router)
api_router.include_router(applications.router)
api_router.include_router(final_submission.router)
api_router.include_router(public_financier.router)
api_router.include_router(smtp.router)
api_router.include_router(planned_activities.router)
api_router.include_router(notifications.router)
api_router.include_router(masters.router)
api_router.include_router(stubs.router)
