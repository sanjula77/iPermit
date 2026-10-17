"""Check the biometric audit log has not been altered.

Walks the whole signed, hash-chained log and reports the first problem, if any.
Prints the head hash: keep a copy outside the database, because deleting the
newest entries is only detectable by comparing against an earlier head.

Usage (inside the backend container):
    python -m app.scripts.verify_face_audit [PUBLIC_KEY_BASE64]
Without an argument it uses the public key derived from AUDIT_SIGNING_KEY.
"""

import sys

from app.core import face_audit


def main() -> None:
    public_key = sys.argv[1] if len(sys.argv) > 1 else None
    result = face_audit.verify(public_key)
    if result.ok:
        print(f"OK: {result.entries} entries, chain and signatures valid.")
    else:
        print(f"TAMPERING DETECTED at entry {result.first_bad_seq}: {result.reason}")
    print(f"Head hash: {result.head_hash}")
    sys.exit(0 if result.ok else 1)


if __name__ == "__main__":
    main()
