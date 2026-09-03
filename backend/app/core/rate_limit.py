from slowapi import Limiter
from slowapi.util import get_remote_address

# Per-IP for now; per-user limiting (via the auth dependency) is a documented
# follow-up in backend-standards for endpoints where IP-based limiting alone
# is insufficient (e.g. a compromised token behind a shared/NAT'd IP).
limiter = Limiter(key_func=get_remote_address)
