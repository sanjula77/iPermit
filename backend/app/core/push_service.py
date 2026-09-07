"""Expo push notification sending, per REQ-12 AC1. Best-effort: any
failure here (network, invalid token, Expo API error) is caught and
logged, never propagated -- notification_service.notify has already
committed the in-app notification (the source of truth for AC2's history)
before calling this, so a push failure must not undo that.

NOT verified against a real device in this environment -- there is no
physical device or Expo Go client reachable from this sandbox. Only the
plumbing (HTTP call shape, error handling) is tested, with the Expo
endpoint itself mocked; see docs/tasks.md Phase 8 for this known gap.
"""

import logging

import requests

logger = logging.getLogger(__name__)

_EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"
_REQUEST_TIMEOUT_SECONDS = 5


def send_push_notification(push_token: str, *, title: str, body: str) -> None:
    try:
        response = requests.post(
            _EXPO_PUSH_URL,
            json={"to": push_token, "title": title, "body": body},
            headers={"Content-Type": "application/json"},
            timeout=_REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except requests.RequestException:
        logger.warning(
            "Expo push notification failed for token %s", push_token, exc_info=True
        )
