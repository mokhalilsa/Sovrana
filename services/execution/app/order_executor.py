"""
Order Executor: Signs and submits orders to the Polymarket CLOB API.
Only this module ever touches private keys (via wallet_manager).
All actions are fully audited.
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Dict, Optional

import httpx
from eth_account import Account
from loguru import logger
from sqlalchemy import text

from app.config import settings
from app.database import AsyncSessionLocal
from app.risk_engine import OrderRequest, RiskDecision
from app.wallet_manager import wallet_manager


class OrderExecutor:
    def __init__(self):
        self._http = httpx.AsyncClient(timeout=30.0)

    async def execute(self, request: OrderRequest, risk_decision: RiskDecision) -> Dict:
        """
        Place an order after risk approval.
        Returns a dict with order_id, status, and any polymarket response.
        """
        order_id = str(uuid.uuid4())

        # Load agent wallet
        wallet_info = await self._get_agent_wallet(request.agent_id)
        if not wallet_info:
            await self._write_order(order_id, request, "blocked", "No wallet configured")
            return {"order_id": order_id, "status": "blocked", "reason": "No wallet configured"}

        account = await wallet_manager.load_account(
            wallet_info["secret_ref"], wallet_info["secret_backend"]
        )
        if not account:
            await self._write_order(order_id, request, "blocked", "Could not load wallet")
            return {"order_id": order_id, "status": "blocked", "reason": "Could not load wallet"}

        # Check simulate mode
        is_simulate = await self._is_simulate(request.agent_id)

        # Adjust size to risk-approved size
        final_size = risk_decision.adjusted_size or request.size_usdc

        if is_simulate:
            logger.info(f"[SIMULATE] Order {order_id}: {request.side} {final_size} USDC on {request.condition_id}")
            polymarket_order_id = f"sim_{order_id}"
            await self._write_order(order_id, request, "placed", None, polymarket_order_id, final_size)
            await self._audit("order_placed", request.agent_id, order_id,
                              f"[SIMULATE] Order placed: {request.side} {final_size} USDC",
                              {"simulate": True})
            return {
                "order_id": order_id,
                "polymarket_order_id": polymarket_order_id,
                "status": "placed",
                "simulate": True,
            }

        # Build and sign the CLOB order
        try:
            signed_order = await self._build_signed_order(account, request, final_size)
            response = await self._submit_to_clob(signed_order)

            poly_order_id = response.get("orderID", "")
            status = "placed" if response.get("success") or poly_order_id else "rejected"

            await self._write_order(
                order_id, request, status, None, poly_order_id, final_size, response
            )
            await self._audit(
                "order_placed" if status == "placed" else "order_blocked",
                request.agent_id, order_id,
                f"Order {status}: {request.side} {final_size} USDC on {request.condition_id}",
                response,
            )

            return {
                "order_id": order_id,
                "polymarket_order_id": poly_order_id,
                "status": status,
                "response": response,
            }

        except Exception as exc:
            logger.error(f"Order execution failed: {exc}")
            await self._write_order(order_id, request, "rejected", str(exc), None, final_size)
            await self._audit(
                "error", request.agent_id, order_id,
                f"Order execution error: {exc}", {"error": str(exc)}
            )
            return {"order_id": order_id, "status": "rejected", "reason": str(exc)}

    async def cancel(self, agent_id: str, order_id: str, polymarket_order_id: str) -> Dict:
        """Cancel an open order on Polymarket."""
        wallet_info = await self._get_agent_wallet(agent_id)
        if not wallet_info:
            return {"status": "error", "reason": "No wallet configured"}

        account = await wallet_manager.load_account(
            wallet_info["secret_ref"], wallet_info["secret_backend"]
        )
        if not account:
            return {"status": "error", "reason": "Could not load wallet"}

        try:
            timestamp = str(int(datetime.now(timezone.utc).timestamp()))
            message = f"cancel_{polymarket_order_id}_{timestamp}"
            msg_hash = Account._hash_eip191_message(message.encode())
            signature = account.sign_message(msg_hash).signature.hex()

            headers = {
                "POLY-ADDRESS": account.address,
                "POLY-SIGNATURE": signature,
                "POLY-TIMESTAMP": timestamp,
                "POLY-NONCE": timestamp,
            }

            resp = await self._http.delete(
                f"{settings.clob_api_base}/orders/{polymarket_order_id}",
                headers=headers,
            )
            resp.raise_for_status()

            async with AsyncSessionLocal() as db:
                await db.execute(
                    text("""
                        UPDATE orders SET status = 'cancelled', cancelled_at = NOW(), updated_at = NOW()
                        WHERE id = :id
                    """),
                    {"id": order_id},
                )
                await db.commit()

            await self._audit("order_cancelled", agent_id, order_id,
                              f"Order {polymarket_order_id} cancelled", {})
            return {"status": "cancelled", "order_id": order_id}

        except Exception as exc:
            logger.error(f"Cancel failed: {exc}")
            return {"status": "error", "reason": str(exc)}

    # ------------------------------------------------------------------
    # CLOB signing and submission
    # ------------------------------------------------------------------

    async def _build_signed_order(self, account, request: OrderRequest, size: float) -> Dict:
        """
        Build a signed order payload for Polymarket CLOB.
        Uses EIP-712 signing as required by the CLOB contract.
        For production use the official py-clob-client library.
        """
        import time

        # Using py-clob-client pattern
        try:
            from py_clob_client.clob_types import OrderArgs, OrderType, PartialCreateOrderOptions
            from py_clob_client.client import ClobClient

            client = ClobClient(
                host=settings.clob_api_base,
                key=account.key.hex(),
                chain_id=settings.polymarket_chain_id,
            )

            order_args = OrderArgs(
                token_id=request.token_id,
                price=request.price,
                size=size,
                side=request.side.upper(),
            )
            order = client.create_order(order_args)
            return order

        except ImportError:
            # Fallback: manual EIP-712 structure
            return {
                "maker": account.address,
                "tokenId": request.token_id,
                "side": request.side.upper(),
                "price": str(int(request.price * 1e6)),
                "size": str(int(size * 1e6)),
                "nonce": str(int(datetime.now(timezone.utc).timestamp())),
                "expiration": "0",
                "feeRateBps": "0",
                "signatureType": 0,
            }

    async def _submit_to_clob(self, signed_order: Dict) -> Dict:
        """Submit signed order to Polymarket CLOB."""
        resp = await self._http.post(
            f"{settings.clob_api_base}/order",
            json=signed_order,
            headers={"Content-Type": "application/json"},
        )
        resp.raise_for_status()
        return resp.json()

    # ------------------------------------------------------------------
    # DB helpers
    # ------------------------------------------------------------------

    async def _get_agent_wallet(self, agent_id: str) -> Optional[Dict]:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("""
                    SELECT wp.secret_ref, wp.secret_backend, wp.evm_address
                    FROM agents a
                    JOIN wallet_profiles wp ON wp.id = a.wallet_profile_id
                    WHERE a.id = :agent_id
                """),
                {"agent_id": agent_id},
            )
            row = result.fetchone()
            return dict(row._mapping) if row else None

    async def _is_simulate(self, agent_id: str) -> bool:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                text("SELECT is_simulate FROM agents WHERE id = :id"),
                {"id": agent_id},
            )
            row = result.fetchone()
            return bool(row[0]) if row else True

    async def _write_order(
        self,
        order_id: str,
        request: OrderRequest,
        status: str,
        block_reason: Optional[str],
        polymarket_order_id: Optional[str] = None,
        final_size: Optional[float] = None,
        raw_response: Optional[Dict] = None,
    ):
        async with AsyncSessionLocal() as db:
            await db.execute(
                text("""
                    INSERT INTO orders
                        (id, agent_id, signal_id, polymarket_order_id, condition_id, token_id,
                         side, order_type, price, size_usdc, status, block_reason,
                         raw_response, placed_at, created_at, updated_at)
                    VALUES
                        (:id, :agent_id, :signal_id, :poly_id, :cid, :tid,
                         :side, :otype, :price, :size, :status, :block_reason,
                         :raw, NOW(), NOW(), NOW())
                """),
                {
                    "id": order_id,
                    "agent_id": request.agent_id,
                    "signal_id": request.signal_id,
                    "poly_id": polymarket_order_id,
                    "cid": request.condition_id,
                    "tid": request.token_id,
                    "side": request.side,
                    "otype": request.order_type,
                    "price": request.price,
                    "size": final_size or request.size_usdc,
                    "status": status,
                    "block_reason": block_reason,
                    "raw": json.dumps(raw_response or {}),
                },
            )
            await db.commit()

    async def _audit(self, event_type: str, agent_id: str, order_id: str, msg: str, meta: Dict):
        async with AsyncSessionLocal() as db:
            await db.execute(
                text("""
                    INSERT INTO audit_logs
                        (event_type, agent_id, entity_type, entity_id, message, metadata, severity)
                    VALUES
                        (:event, :agent_id, 'order', :entity_id, :msg, :meta, 'info')
                """),
                {
                    "event": event_type,
                    "agent_id": agent_id,
                    "entity_id": order_id,
                    "msg": msg,
                    "meta": json.dumps(meta),
                },
            )
            await db.commit()

    async def close(self):
        await self._http.aclose()
