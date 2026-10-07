import math
import uuid
from collections import defaultdict
from dataclasses import asdict
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.core.behaviour import (
    HIGH_POINTS_RATIO,
    RISK_ORDER,
    WINDOW_DAYS,
    BehaviourAnalysis,
    RiskLevel,
    Trend,
    ViolationFact,
    analyse,
)
from app.models.fine import FineStatus
from app.models.license import License, LicenseStatus
from app.models.notification import NotificationType
from app.models.violation import Violation
from app.repositories import (
    license_repository,
    notification_repository,
    violation_repository,
)
from app.services.violation_service import SUSPENSION_POINTS_THRESHOLD

_TIMELINE_LIMIT = 10
_MONTHS_SHOWN = 12


class NotFoundError(Exception):
    pass


def _countable(
    rows: list[tuple[Violation, FineStatus | None]],
) -> list[tuple[Violation, FineStatus | None]]:
    """A violation whose fine was reversed on appeal was found wrong, so it is
    not part of the driver's behaviour."""
    return [(v, status) for v, status in rows if status != FineStatus.REVERSED]


def _analyse_driver(
    license_: License,
    rows: list[tuple[Violation, FineStatus | None]],
    *,
    prior_suspensions: int,
    now: datetime,
) -> BehaviourAnalysis:
    countable = _countable(rows)
    facts = [
        ViolationFact(
            type=v.type, points=v.points_deducted, confirmed_at=v.confirmed_at
        )
        for v, _ in countable
    ]
    return analyse(
        facts,
        current_points=license_.points,
        suspension_threshold=SUSPENSION_POINTS_THRESHOLD,
        license_suspended=license_.status == LicenseStatus.SUSPENDED,
        prior_suspensions=prior_suspensions,
        unpaid_fines=sum(1 for _, status in countable if status == FineStatus.UNPAID),
        now=now,
    )


def get_behaviour_for_driver(
    db: Session, driver_id: uuid.UUID, *, now: datetime | None = None
) -> dict:
    now = now or datetime.utcnow()
    license_ = license_repository.get_latest_for_driver(db, driver_id)
    if license_ is None:
        raise NotFoundError("This driver has no issued license")

    rows = violation_repository.list_with_fine_status_for_driver(db, driver_id)
    prior_suspensions = notification_repository.count_for_user_by_type(
        db, driver_id, NotificationType.LICENSE_SUSPENDED
    )
    analysis = _analyse_driver(
        license_, rows, prior_suspensions=prior_suspensions, now=now
    )
    timeline = [
        {
            "type": v.type,
            "points": v.points_deducted,
            "confirmed_at": v.confirmed_at,
            "fine_status": status,
        }
        for v, status in _countable(rows)[:_TIMELINE_LIMIT]
    ]
    return {**asdict(analysis), "timeline": timeline}


def _month_keys(now: datetime) -> list[str]:
    keys: list[str] = []
    year, month = now.year, now.month
    for _ in range(_MONTHS_SHOWN):
        keys.append(f"{year:04d}-{month:02d}")
        month -= 1
        if month == 0:
            year, month = year - 1, 12
    return list(reversed(keys))


def get_admin_overview(db: Session, *, now: datetime | None = None) -> dict:
    """REQ-11/REQ-14: every licensed driver's behaviour outlook, riskiest
    first, plus fleet-wide monthly and per-type counts for the dashboard."""
    now = now or datetime.utcnow()
    licenses = license_repository.list_all(db)
    all_rows = violation_repository.list_with_fine_status_all(db)
    suspensions = notification_repository.count_per_user_by_type(
        db, NotificationType.LICENSE_SUSPENDED
    )

    rows_by_driver: dict[uuid.UUID, list[tuple[Violation, FineStatus | None]]] = (
        defaultdict(list)
    )
    for violation, status in all_rows:
        rows_by_driver[violation.driver_id].append((violation, status))

    drivers = []
    for license_ in licenses:
        analysis = _analyse_driver(
            license_,
            rows_by_driver.get(license_.driver_id, []),
            prior_suspensions=suspensions.get(license_.driver_id, 0),
            now=now,
        )
        drivers.append({**asdict(analysis), "driver": license_.driver})

    drivers.sort(
        key=lambda d: (
            RISK_ORDER[d["risk_level"]],
            (
                d["projected_days_to_suspension"]
                if d["projected_days_to_suspension"] is not None
                else math.inf
            ),
            -d["window_points"],
        )
    )

    high_points = math.ceil(HIGH_POINTS_RATIO * SUSPENSION_POINTS_THRESHOLD)
    summary = {
        "high": sum(1 for d in drivers if d["risk_level"] == RiskLevel.HIGH),
        "medium": sum(1 for d in drivers if d["risk_level"] == RiskLevel.MEDIUM),
        "low": sum(1 for d in drivers if d["risk_level"] == RiskLevel.LOW),
        "worsening": sum(1 for d in drivers if d["trend"] == Trend.WORSENING),
        "near_threshold": sum(1 for d in drivers if d["current_points"] >= high_points),
    }

    monthly = {key: {"month": key, "count": 0, "points": 0} for key in _month_keys(now)}
    by_type: dict[str, int] = {}
    window_start = now - timedelta(days=WINDOW_DAYS)
    for violation, _status in _countable(all_rows):
        key = violation.confirmed_at.strftime("%Y-%m")
        if key in monthly:
            monthly[key]["count"] += 1
            monthly[key]["points"] += violation.points_deducted
        if violation.confirmed_at > window_start:
            by_type[violation.type.value] = by_type.get(violation.type.value, 0) + 1

    return {
        "summary": summary,
        "drivers": drivers,
        "monthly": list(monthly.values()),
        "by_type": by_type,
    }
