import os
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse, urlunparse

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Database
    database_url: str

    # JWT
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60

    # AI
    groq_api_key: str = ""
    ai_assignment_confidence_threshold: float = 0.75

    # Email (SMTP)
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    email_from: str = ""
    email_from_name: str = "TrackTicket Support"

    # App
    frontend_origin: str = "http://localhost:3000"
    app_name: str = "TrackTicket"

    # OTP
    otp_expire_minutes: int = 10

    _backend_env = str(Path(__file__).resolve().parents[1] / ".env")
    _root_env = str(Path(__file__).resolve().parents[2] / ".env")

    model_config = SettingsConfigDict(
        # Root .env fallback first, backend/.env overrides it.
        env_file=(_root_env, _backend_env),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def normalized_groq_api_key(self) -> str:
        return self.groq_api_key.strip().strip('"').strip("'")

    @property
    def runtime_database_url(self) -> str:
        """Use localhost for local runs when .env is docker-oriented (host=db)."""
        if os.path.exists("/.dockerenv"):
            return self.database_url

        parsed = urlparse(self.database_url)
        if parsed.hostname != "db":
            return self.database_url

        host = "localhost"
        netloc = parsed.netloc
        if "@" in netloc:
            creds, _ = netloc.rsplit("@", 1)
            if parsed.port:
                netloc = f"{creds}@{host}:{parsed.port}"
            else:
                netloc = f"{creds}@{host}"
        else:
            if parsed.port:
                netloc = f"{host}:{parsed.port}"
            else:
                netloc = host

        return urlunparse((parsed.scheme, netloc, parsed.path, parsed.params, parsed.query, parsed.fragment))


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
