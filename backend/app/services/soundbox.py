import json
from datetime import datetime, timezone

from redis import Redis
from sqlalchemy.orm import Session

from app.errors import DomainError
from app.models import SoundboxDevice
from app.schemas import SoundboxState

STATE_TTL_SECONDS = 3600


def state_key(device_id: str) -> str:
    return f"soundbox:{device_id}:state"


def announce_channel(device_id: str) -> str:
    return f"soundbox/{device_id}/announce"


def topic_for(device_id: str) -> str:
    return f"soundbox/{device_id}/state"


def publish(db: Session, redis: Redis, device_id: str, announcement: str, now: datetime | None = None) -> SoundboxState:
    device = db.get(SoundboxDevice, device_id)
    if device is None:
        raise DomainError(404, "Soundbox not found")
    moment = now or datetime.now(timezone.utc)
    device.last_announcement = announcement
    device.updated_at = moment
    db.commit()
    payload = {
        "device_id": device.device_id,
        "online": True,
        "topic": topic_for(device.device_id),
        "last_announcement": announcement,
        "updated_at": moment.astimezone(timezone.utc).isoformat(),
    }
    encoded = json.dumps(payload)
    try:
        redis.set(state_key(device.device_id), encoded, ex=STATE_TTL_SECONDS)
        redis.publish(announce_channel(device.device_id), encoded)
    except Exception:
        return SoundboxState(
            device_id=device.device_id,
            online=True,
            topic=payload["topic"],
            last_announcement=announcement,
            updated_at=moment,
        )
    return SoundboxState(
        device_id=device.device_id,
        online=True,
        topic=payload["topic"],
        last_announcement=announcement,
        updated_at=moment,
    )


def read_state(db: Session, redis: Redis, device_id: str) -> SoundboxState:
    cached = redis.get(state_key(device_id))
    if cached:
        payload = json.loads(cached)
        return SoundboxState(
            device_id=payload["device_id"],
            online=bool(payload["online"]),
            topic=payload["topic"],
            last_announcement=payload["last_announcement"],
            updated_at=datetime.fromisoformat(payload["updated_at"]),
        )
    device = db.get(SoundboxDevice, device_id)
    if device is None:
        raise DomainError(404, "Soundbox not found")
    return publish(db, redis, device.device_id, device.last_announcement or "", device.updated_at)
