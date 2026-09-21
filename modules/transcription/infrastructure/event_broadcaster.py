from collections import defaultdict
from fastapi import WebSocket
from loguru import logger


class EventBroadcaster:
    """In-process connection manager broadcasting real-time events to session subscribers."""

    def __init__(self) -> None:
        self._subscribers: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, session_id: str, websocket: WebSocket) -> None:
        self._subscribers[session_id].add(websocket)
        logger.debug(f"[Broadcaster] Subscriber joined session {session_id}. Total: {len(self._subscribers[session_id])}")

    async def disconnect(self, session_id: str, websocket: WebSocket) -> None:
        self._subscribers[session_id].discard(websocket)
        if not self._subscribers[session_id]:
            self._subscribers.pop(session_id, None)
        logger.debug(f"[Broadcaster] Subscriber left session {session_id}")

    async def broadcast(self, session_id: str, event_data: dict) -> None:
        subscribers = list(self._subscribers.get(session_id, []))
        if not subscribers:
            return

        dead_sockets = []
        for ws in subscribers:
            try:
                await ws.send_json(event_data)
            except Exception as e:
                logger.debug(f"[Broadcaster] Failed to send event to subscriber ({e}); marking dead.")
                dead_sockets.append(ws)

        for ws in dead_sockets:
            await self.disconnect(session_id, ws)


# Global singleton instance for in-process broadcast
event_broadcaster = EventBroadcaster()
