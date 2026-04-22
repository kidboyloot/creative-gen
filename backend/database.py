from sqlmodel import SQLModel, create_engine, Session
from sqlalchemy import text, inspect
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./db.sqlite")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


# SQLite-friendly poor-man's migrations. `create_all` only creates missing
# tables — it never adds columns to existing ones. For each (table, column,
# SQL type) below we check if the column exists and ADD it if not. Safe to
# run on every boot: it's idempotent and only takes action on outdated rows.
_COLUMN_ADDITIONS: list[tuple[str, str, str]] = [
    ("shopifyconnection", "auth_mode", "VARCHAR DEFAULT 'static'"),
    ("shopifyconnection", "client_id", "VARCHAR"),
    ("shopifyconnection", "client_secret", "VARCHAR"),
    ("shopifyconnection", "access_token_expires_at", "DATETIME"),
    ("generatedasset", "shopify_item_id", "VARCHAR"),
]


def _apply_column_additions() -> None:
    insp = inspect(engine)
    with engine.begin() as conn:
        for table, column, sql_type in _COLUMN_ADDITIONS:
            if not insp.has_table(table):
                continue
            cols = {c["name"] for c in insp.get_columns(table)}
            if column in cols:
                continue
            conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {column} {sql_type}'))


def init_db():
    SQLModel.metadata.create_all(engine)
    _apply_column_additions()


def get_session():
    with Session(engine) as session:
        yield session
