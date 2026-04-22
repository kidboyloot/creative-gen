from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text, inspect
from sqlalchemy.engine.url import make_url
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./db.sqlite")
_url = make_url(DATABASE_URL)
_IS_SQLITE = _url.drivername.startswith("sqlite")
_IS_POSTGRES = _url.drivername.startswith("postgres")

if _IS_SQLITE:
    # FastAPI handles requests across threads; SQLite default rejects that.
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
else:
    # pool_pre_ping = resurrect connections dropped by the provider (Supabase
    # recycles idle connections aggressively on the free tier).
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )


# `create_all` only creates missing tables — it never adds columns to existing
# ones. For each (table, column, SQL type) below we check if the column exists
# and ADD it if not. Safe to run on every boot.
_COLUMN_ADDITIONS: list[tuple[str, str, str]] = [
    ("shopifyconnection", "auth_mode", "VARCHAR DEFAULT 'static'"),
    ("shopifyconnection", "client_id", "VARCHAR"),
    ("shopifyconnection", "client_secret", "VARCHAR"),
    ("shopifyconnection", "access_token_expires_at", "DATETIME"),
    ("generatedasset", "shopify_item_id", "VARCHAR"),
]


def _normalize_ddl_type(sql_type: str) -> str:
    # Postgres doesn't understand SQLite's DATETIME — swap it for TIMESTAMP.
    if _IS_POSTGRES:
        return sql_type.replace("DATETIME", "TIMESTAMP WITHOUT TIME ZONE")
    return sql_type


def _apply_column_additions() -> None:
    insp = inspect(engine)
    with engine.begin() as conn:
        for table, column, sql_type in _COLUMN_ADDITIONS:
            if not insp.has_table(table):
                continue
            cols = {c["name"] for c in insp.get_columns(table)}
            if column in cols:
                continue
            conn.execute(
                text(f'ALTER TABLE {table} ADD COLUMN {column} {_normalize_ddl_type(sql_type)}')
            )


def init_db():
    SQLModel.metadata.create_all(engine)
    _apply_column_additions()


def get_session():
    with Session(engine) as session:
        yield session
