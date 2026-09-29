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
    # Decoded size cap: a small compressed file can expand to a huge bitmap.
    # 50 MP is above any phone camera's default photo size.
    max_image_pixels: int = 50_000_000

    license_validity_years: int = 5

    face_template_db_path: str = "face_templates.db"
    # Local time zone for day-based figures (e.g. an officer's "today").
    # Timestamps are stored as naive UTC.
    app_timezone: str = "Asia/Colombo"
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
    # REQ-5: CLAHE contrast enhancement before face detection. Off since
    # 2026-09-29: the LFW ablation (docs/evaluation/results/clahe_ablation.md)
    # found it more than doubles FRR at 0.42 (2.95% vs 1.37%) with no FAR or
    # EER benefit -- ArcFace was trained on unprocessed photos. After changing
    # this, run `python -m app.scripts.reembed_templates` so stored templates
    # match the new pipeline.
    face_clahe_enabled: bool = False
    # Enrollment-photo quality gate thresholds (REQ-2 AC2). Commonly-cited
    # starting points (detection score, blur/brightness heuristics), NOT
    # independently validated on iPermit's own data -- same honesty
    # pattern as face_match_threshold above; revisit once Task 9.1 has
    # real data to test against.
    face_min_detection_score: float = 0.7
    face_min_face_size_px: int = 80
    # Laplacian variance of the face resized to 112x112 (see
    # face_preprocessing.SHARPNESS_CROP_SIZE). Calibrated 2026-09-29: sharp LFW
    # faces p5 = 43, real phone selfies ~550; Gaussian blur at 2% of face width
    # p75 = 22, at 4% ~7. Still not validated on Sri Lankan driver photos.
    face_min_sharpness: float = 30.0
    face_min_brightness: int = 30
    face_max_brightness: int = 220

    # REQ-13 AC4: how long a reported road incident stays ACTIVE before
    # lazily expiring on next read (no scheduler infra exists in this
    # project). A flat window, not sourced from any traffic-authority
    # guidance -- REQ-13 doesn't specify a duration.
    road_incident_expiry_hours: int = 4
    # REQ-13 AC2: default search radius for "nearby" active incidents.
    road_incident_default_radius_km: float = 5.0

    # Default search radius for "nearby" active danger zones -- same
    # convention as road_incident_default_radius_km above, no
    # traffic-authority-sourced value to derive this from.
    danger_zone_default_radius_km: float = 5.0


settings = Settings()
