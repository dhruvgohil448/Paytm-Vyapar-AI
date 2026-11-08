from collections.abc import Generator
from contextlib import contextmanager

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.errors import DomainError


@contextmanager
def session_scope() -> Generator[Session, None, None]:
    """Open, commit, and close a session on the calling thread.

    Sync FastAPI dependencies can resume on a different threadpool worker.
    A loan row lock must be released by the same thread that acquired it,
    before that worker is returned to the pool.
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def raise_domain(exc: DomainError) -> None:
    raise HTTPException(status_code=exc.status_code, detail=exc.detail) from exc
