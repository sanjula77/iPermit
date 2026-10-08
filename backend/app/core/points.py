"""The demerit-points rule, kept free of the database so it can be tested with a
fixed date.

Points are not a balance that goes up and down. Each violation carries its points
for a fixed validity period (a rolling year by default) from the day it was
confirmed, then stops counting. Paying the fine does not change that; only a
successful appeal, which marks the violation as found wrong, removes its points.
"""

from collections.abc import Iterable
from datetime import datetime, timedelta

# REQ-8 AC2: a licence is suspended once its active points reach this.
SUSPENSION_POINTS_THRESHOLD = 10

# (points, confirmed_at, overturned_on_appeal)
Entry = tuple[int, datetime, bool]


def expires_at(confirmed_at: datetime, validity_days: int) -> datetime:
    return confirmed_at + timedelta(days=validity_days)


def _active(entries: Iterable[Entry], now: datetime, validity_days: int) -> list[Entry]:
    cutoff = now - timedelta(days=validity_days)
    return [e for e in entries if not e[2] and e[1] > cutoff]


def active_points(
    entries: Iterable[Entry], *, now: datetime, validity_days: int
) -> int:
    """The points that count today: not overturned, and confirmed within the
    validity period."""
    return sum(points for points, _, _ in _active(entries, now, validity_days))


def next_expiry(
    entries: Iterable[Entry], *, now: datetime, validity_days: int
) -> datetime | None:
    """When the earliest still-counting points drop off; None if none count."""
    counting = [e for e in _active(entries, now, validity_days) if e[0] > 0]
    if not counting:
        return None
    return expires_at(min(e[1] for e in counting), validity_days)
