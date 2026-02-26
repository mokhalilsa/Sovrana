"""
Wallet Manager: Loads private keys from environment variables or Vault.
Private keys are NEVER stored in the database.
Each agent references a wallet_profile which contains a secret_ref (env var name or vault path).
The wallet manager resolves the key at runtime.
"""

import os
from typing import Optional

from eth_account import Account
from eth_account.signers.local import LocalAccount
from loguru import logger

from app.config import settings


class WalletManager:
    """
    Resolves signing keys from the configured secret backend.
    Supports:
      - env: reads from environment variable named by secret_ref
      - vault: reads from HashiCorp Vault using the path in secret_ref
    """

    def __init__(self):
        self._cache: dict[str, LocalAccount] = {}

    async def load_account(self, secret_ref: str, backend: str = "env") -> Optional[LocalAccount]:
        """
        Load and cache an eth_account for the given secret reference.
        secret_ref is an environment variable name (env backend) or Vault path (vault backend).
        """
        cache_key = f"{backend}:{secret_ref}"
        if cache_key in self._cache:
            return self._cache[cache_key]

        private_key = await self._resolve_key(secret_ref, backend)
        if not private_key:
            logger.error(f"Could not resolve private key for secret_ref={secret_ref}")
            return None

        try:
            account = Account.from_key(private_key)
            self._cache[cache_key] = account
            logger.info(f"Loaded wallet {account.address} from {backend}:{secret_ref}")
            return account
        except Exception as exc:
            logger.error(f"Invalid private key for {secret_ref}: {exc}")
            return None

    async def _resolve_key(self, secret_ref: str, backend: str) -> Optional[str]:
        if backend == "env":
            key = os.environ.get(secret_ref)
            if not key:
                logger.warning(f"Env var {secret_ref} not set")
            return key

        elif backend == "vault":
            return await self._load_from_vault(secret_ref)

        else:
            logger.error(f"Unknown secret backend: {backend}")
            return None

    async def _load_from_vault(self, path: str) -> Optional[str]:
        """Fetch secret from HashiCorp Vault KV v2."""
        if not settings.vault_addr or not settings.vault_token:
            logger.error("Vault not configured: VAULT_ADDR and VAULT_TOKEN must be set")
            return None

        import httpx
        try:
            url = f"{settings.vault_addr}/v1/{path}"
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    url,
                    headers={"X-Vault-Token": settings.vault_token},
                    timeout=10.0,
                )
                resp.raise_for_status()
                data = resp.json()
                return data.get("data", {}).get("data", {}).get("private_key")
        except Exception as exc:
            logger.error(f"Vault fetch failed for {path}: {exc}")
            return None

    def sign_message(self, account: LocalAccount, message_hash: bytes) -> bytes:
        """Sign a raw message hash with the account key."""
        sig = account.signHash(message_hash)
        return sig.signature

    def get_address(self, account: LocalAccount) -> str:
        return account.address


wallet_manager = WalletManager()
