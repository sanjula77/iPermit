from datetime import UTC, datetime
from typing import Annotated

from pydantic import PlainSerializer


def _to_utc_iso(value: datetime) -> str:
    # Stored timestamps are naive UTC (datetime.utcnow); mark them as UTC so
    # clients don't parse them as local time. Aware values are normalised.
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat()


# Use for every datetime in a response schema: serializes as ISO 8601 with an
# explicit +00:00 offset.
UtcDateTime = Annotated[
    datetime, PlainSerializer(_to_utc_iso, return_type=str, when_used="json")
]
