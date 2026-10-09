"""Bring stored face templates up to envelope encryption.

New templates are always saved with envelope encryption; this converts the ones
already in face_templates.db (plaintext, or encrypted directly with the master
key). Needs FACE_TEMPLATE_KEY and AUDIT_SIGNING_KEY. Safe to run again: it only
touches templates that are not yet in the envelope format.

Usage (inside the backend container):
    python -m app.scripts.encrypt_templates
"""

from app.core import face_audit, face_template_store


def main() -> None:
    face_audit.ensure_ready()
    converted = face_template_store.encrypt_existing()
    if converted:
        face_audit.record(
            face_audit.UPGRADE,
            actor_id="system:encrypt_templates",
            detail=f"converted={converted}",
        )
    print(f"Converted {converted} template(s) to envelope encryption.")


if __name__ == "__main__":
    main()
