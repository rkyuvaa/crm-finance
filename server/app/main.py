import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.api import api_router
from app.core.config import settings
from app.core.logging import get_logger, setup_logging

def _ensure_schema_migrations():
    try:
        from app.db.base import Base
        from app.db.session import engine

        # Ensure all tables (e.g. application_sequences) exist
        Base.metadata.create_all(bind=engine)

        from sqlalchemy import inspect, text
        inspector = inspect(engine)
        if "pipeline_stages" in inspector.get_table_names():
            cols = [c["name"] for c in inspector.get_columns("pipeline_stages")]
            if "color" not in cols:
                with engine.begin() as conn:
                    conn.execute(text("ALTER TABLE pipeline_stages ADD COLUMN color VARCHAR(30)"))
    except Exception as err:
        import logging
        logging.error(f"Migration check error: {err}")


setup_logging()
logger = get_logger("app")
_ensure_schema_migrations()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging(request: Request, call_next):
    request_id = str(uuid.uuid4())
    start = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        logger.exception(
            "request_failed",
            extra={"request_id": request_id, "path": request.url.path},
        )
        return JSONResponse(status_code=500, content={"detail": "Internal server error"})
    duration_ms = round((time.perf_counter() - start) * 1000, 2)
    logger.info(
        "request",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status": response.status_code,
            "duration_ms": duration_ms,
        },
    )
    response.headers["X-Request-Id"] = request_id
    return response


app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/health")
def health():
    return {"status": "ok", "app": settings.app_name}
