from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    service_name: str = "brain"
    database_url: str = "postgresql+asyncpg://sovrana:sovrana_secret@localhost:5432/sovrana"
    redis_url: str = "redis://:redis_secret@localhost:6379/0"
    ingestion_url: str = "http://ingestion:8001"

    # Strategy evaluation interval in seconds
    strategy_eval_interval: int = 30

    # Signal confidence minimum threshold (overridable per agent strategy config)
    default_confidence_threshold: float = 0.6

    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
