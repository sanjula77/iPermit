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


settings = Settings()
