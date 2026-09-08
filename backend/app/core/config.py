from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "iPermit API"
    environment: str = "development"
    cors_origins: list[str] = [
        "http://localhost:8081",  # Expo web preview
        "http://localhost:19006",  # Expo web (legacy port)
        "http://localhost:3000",  # Next.js admin dashboard
    ]

    database_url: str = "postgresql+psycopg2://ipermit:ipermit@localhost:5432/ipermit"

    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30

    upload_dir: str = "uploads"
    max_upload_size_bytes: int = 10 * 1024 * 1024  # 10 MB per file

    license_validity_years: int = 5

    face_template_db_path: str = "face_templates.db"
    # Pairwise cosine similarity threshold for "same person" (used both for
    # enrollment consistency checks and future match lookups). This default
    # is a commonly-cited starting point for ArcFace, NOT independently
    # validated on our own data -- re-tune once real evaluation data exists.
    # See requirements.md "Benchmarks From Prior Research" for why this
    # matters: a prior attempt overfit badly on a 6-person dataset.
    face_match_threshold: float = 0.42
    # REQ-5 AC4: liveness/anti-spoofing is not implemented in this phase.
    # This flag exists so that disabled-state is an explicit, checkable
    # fact (see GET /face/status) rather than a silently skipped step.
    liveness_check_enabled: bool = False
    # REQ-5: CLAHE contrast enhancement before face detection, closing the
    # gap between design.md's documented pipeline and what Phase 4 actually
    # shipped. Toggle-able in case real evaluation data (Task 9.1) later
    # shows it hurts rather than helps accuracy.
    face_clahe_enabled: bool = True
    # Enrollment-photo quality gate thresholds (REQ-2 AC2). Commonly-cited
    # starting points (detection score, blur/brightness heuristics), NOT
    # independently validated on iPermit's own data -- same honesty
    # pattern as face_match_threshold above; revisit once Task 9.1 has
    # real data to test against.
    face_min_detection_score: float = 0.7
    face_min_face_size_px: int = 80
    face_min_sharpness: float = 100.0  # Laplacian variance
    face_min_brightness: int = 30
    face_max_brightness: int = 220

    # REQ-13 AC4: how long a reported road incident stays ACTIVE before
    # lazily expiring on next read (no scheduler infra exists in this
    # project). A flat window, not sourced from any traffic-authority
    # guidance -- REQ-13 doesn't specify a duration.
    road_incident_expiry_hours: int = 4
    # REQ-13 AC2: default search radius for "nearby" active incidents.
    road_incident_default_radius_km: float = 5.0


settings = Settings()
