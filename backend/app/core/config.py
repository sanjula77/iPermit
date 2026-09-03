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


settings = Settings()
