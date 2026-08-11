from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "CRMFinance - KIM API"
    app_env: str = "development"
    api_v1_prefix: str = "/api/v1"
    debug: bool = False

    database_url: str = "sqlite:///./dev.db"

    secret_key: str = "change-me-in-production-use-a-random-64-char-string"
    algorithm: str = "HS256"
    access_token_minutes: int = 15
    refresh_token_days: int = 7

    access_token_cookie_secure: bool = False
    refresh_token_cookie_name: str = "refresh_token"
    enable_ssl: bool = False

    cors_origins: str = "http://localhost:5173,http://localhost"

    seed_default_password: str = "Kim@2025"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
