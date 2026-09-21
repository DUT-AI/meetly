import secrets
import time
from typing import TypedDict


class TicketPayload(TypedDict):
    session_id: str
    user_id: str
    role: str  # "producer" or "subscriber"
    expires_at: float


class TicketStore:
    """In-memory ticket store for short-lived, one-time WebSocket authentication."""

    def __init__(self) -> None:
        self._tickets: dict[str, TicketPayload] = {}

    def create_ticket(
        self,
        session_id: str,
        user_id: str,
        role: str = "producer",
        ttl_seconds: int = 60,
    ) -> str:
        self._cleanup_expired()
        prefix = "tkt_prod_" if role == "producer" else "tkt_sub_"
        ticket = f"{prefix}{secrets.token_urlsafe(24)}"
        self._tickets[ticket] = {
            "session_id": session_id,
            "user_id": user_id,
            "role": role,
            "expires_at": time.time() + ttl_seconds,
        }
        return ticket

    def consume_ticket(self, ticket: str) -> TicketPayload | None:
        self._cleanup_expired()
        payload = self._tickets.pop(ticket, None)
        if not payload:
            return None
        if payload["expires_at"] < time.time():
            return None
        return payload

    def _cleanup_expired(self) -> None:
        now = time.time()
        expired = [k for k, v in self._tickets.items() if v["expires_at"] < now]
        for k in expired:
            self._tickets.pop(k, None)


# Global singleton instance for in-process token verification
ticket_store = TicketStore()
