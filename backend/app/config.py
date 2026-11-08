from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://vyapar:vyapar@localhost:5432/vyapar"
    redis_url: str = "redis://localhost:6379/0"
    paytm_link_secret: str = "dev-secret-change-me"
    link_ttl_seconds: int = 120
    gemini_api_key: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
