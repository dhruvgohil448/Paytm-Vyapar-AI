import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
os.chdir(ROOT)
os.environ["DATABASE_URL"] = os.environ.get(
    "DATABASE_URL", "postgresql+psycopg://vyapar:vyapar@localhost:5432/vyapar"
)
os.environ["REDIS_URL"] = os.environ.get("REDIS_URL", "redis://localhost:6379/0")
os.environ["PAYTM_LINK_SECRET"] = "test-secret"
os.environ["LINK_TTL_SECONDS"] = "120"
os.environ["GEMINI_API_KEY"] = ""

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db import SessionLocal
from app.main import app
from app.redis_client import redis_client
from app.seed import seed

TRUNCATE = """
TRUNCATE TABLE
    settlement_entries,
    broadcasts,
    localized_campaigns,
    merchant_loans,
    merchant_inventory,
    customers,
    soundbox_devices,
    merchants,
    distributors
RESTART IDENTITY CASCADE
"""


@pytest.fixture(scope="session", autouse=True)
def migrated() -> None:
    command.upgrade(Config(str(ROOT / "alembic.ini")), "head")


@pytest.fixture
def client():
    db = SessionLocal()
    db.execute(text(TRUNCATE))
    db.commit()
    redis_client.flushdb()
    seed(db)
    db.close()
    with TestClient(app) as test_client:
        yield test_client
