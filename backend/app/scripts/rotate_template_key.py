"""Rotate the master key that wraps the face templates' data keys.

Steps:
  1. Generate a new key (see .env.example).
  2. Set FACE_TEMPLATE_KEY_PREVIOUS to the old key and FACE_TEMPLATE_KEY to the
     new one, then run this script (inside the backend container).
  3. Remove FACE_TEMPLATE_KEY_PREVIOUS afterwards.
Only the small wrapped data keys are rewritten; the encrypted embeddings are not
touched. Safe to run again if it was interrupted.

Usage:
    python -m app.scripts.rotate_template_key
"""

from app.core import face_audit, face_template_store


def main() -> None:
    face_audit.ensure_ready()
    rotated = face_template_store.rotate_master_key()
    face_audit.record(
        face_audit.KEY_ROTATE,
        actor_id="system:rotate_template_key",
        detail=f"rewrapped={rotated}",
    )
    print(f"Re-wrapped {rotated} template key(s) under the new master key.")


if __name__ == "__main__":
    main()
