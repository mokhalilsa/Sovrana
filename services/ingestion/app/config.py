from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    service_name: str = "ingestion"
    database_url: str = "postgresql+asyncpg://sovrana:sovrana_secret@localhost:5432/sovrana"
    redis_url: str = "redis://:redis_secret@localhost:6379/0"

    # Polymarket API bases
    gamma_api_base: str = "https://gamma-api.polymarket.com"
    data_api_base: str = "https://data-api.polymarket.com"
    clob_api_base: str = "https://clob.polymarket.com"

    # Polling intervals in seconds
    market_poll_interval: int = 60
    orderbook_poll_interval: int = 10
    position_poll_interval: int = 30

    # Max markets to track per poll
    max_markets: int = 200

    # Auth for Polymarket (optional for public read endpoints)
    polymarket_api_key: Optional[str] = None
    polymarket_api_secret: Optional[str] = None
    polymarket_api_passphrase: Optional[str] = None

    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
