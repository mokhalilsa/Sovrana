from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    service_name: str = "execution"
    database_url: str = "postgresql+asyncpg://sovrana:sovrana_secret@localhost:5432/sovrana"
    redis_url: str = "redis://:redis_secret@localhost:6379/0"

    # Polymarket CLOB endpoint
    clob_api_base: str = "https://clob.polymarket.com"
    polymarket_chain_id: int = 137  # Polygon mainnet

    # Secret manager backend: env or vault
    secret_manager_backend: str = "env"
    vault_addr: Optional[str] = None
    vault_token: Optional[str] = None

    # Global kill switch override
    global_kill_switch: bool = False

    # Auth for internal API calls from UI
    execution_api_key: str = "changeme_internal_key"

    # Position reconciliation interval in seconds
    reconcile_interval: int = 300

    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
