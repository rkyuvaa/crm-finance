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
        import app.models  # Ensures all SQLAlchemy models register on Base.metadata
        from sqlalchemy import inspect, text
        from app.db.base import Base
        from app.db.session import engine

        # 1. Create missing tables
        Base.metadata.create_all(bind=engine)

        # 2. Inspect database and auto-add missing columns to existing tables
        inspector = inspect(engine)
        existing_tables = set(inspector.get_table_names())

        with engine.begin() as conn:
            for table_name, table_obj in Base.metadata.tables.items():
                if table_name not in existing_tables:
                    continue

                db_cols = {c["name"] for c in inspector.get_columns(table_name)}
                for col in table_obj.columns:
                    if col.name not in db_cols:
                        col_name = col.name
                        # Determine column type DDL
                        try:
                            if hasattr(col.type, "name") and col.type.name:
                                enum_name = col.type.name
                                try:
                                    enum_vals = "', '".join([str(getattr(e, 'value', e)) for e in col.type.enums])
                                    conn.execute(text(f"CREATE TYPE {enum_name} AS ENUM ('{enum_vals}')"))
                                except Exception:
                                    pass
                                col_type_sql = enum_name
                            else:
                                col_type_sql = str(col.type.compile(engine.dialect))
                        except Exception:
                            col_type_sql = "VARCHAR(255)"

                        # Build default SQL if present
                        default_sql = ""
                        if col.server_default is not None and hasattr(col.server_default, "arg"):
                            default_sql = f" DEFAULT {col.server_default.arg}"
                        elif col.default is not None and not callable(getattr(col.default, 'arg', None)):
                            default_sql = f" DEFAULT '{col.default.arg}'"

                        try:
                            conn.execute(
                                text(
                                    f'ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS "{col_name}" {col_type_sql}{default_sql}'
                                )
                            )
                        except Exception:
                            try:
                                conn.execute(
                                    text(
                                        f'ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS "{col_name}" VARCHAR(255)'
                                    )
                                )
                            except Exception as col_err:
                                import logging
                                logging.error(f"Failed to auto-add column {table_name}.{col_name}: {col_err}")

        # 3. Seed default task statuses if empty
        if "task_statuses" in existing_tables:
            with engine.begin() as conn:
                res = conn.execute(text("SELECT COUNT(*) FROM task_statuses")).scalar()
                if res == 0:
                    conn.execute(
                        text(
                            "INSERT INTO task_statuses (id, name, color, display_order, is_terminal, category, is_active) VALUES "
                            "(1, 'To Do', '#64748B', 1, false, 'ACTIVE', true), "
                            "(2, 'In Progress', '#2563EB', 2, false, 'ACTIVE', true), "
                            "(3, 'In Review', '#D97706', 3, false, 'ACTIVE', true), "
                            "(4, 'Done', '#16A34A', 4, true, 'ACTIVE', true), "
                            "(5, 'Blocked', '#DC2626', 5, false, 'ACTIVE', true)"
                        )
                    )
                    try:
                        conn.execute(text("SELECT setval(pg_get_serial_sequence('task_statuses', 'id'), 5)"))
                    except Exception:
                        pass
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
