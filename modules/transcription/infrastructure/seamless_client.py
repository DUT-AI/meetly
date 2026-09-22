import httpx
from loguru import logger

from core.config.translation import translation_settings


class SeamlessTranslationClient:
    """Asynchronous HTTP/WebSocket client communicating with the SeamlessStreaming microservice."""

    def __init__(
        self,
        base_url: str | None = None,
        timeout: float | None = None,
    ) -> None:
        self.base_url = (
            base_url or translation_settings.translation_service_url
        ).rstrip("/")
        self.timeout = timeout or translation_settings.translation_timeout_s
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=self.base_url,
                timeout=httpx.Timeout(self.timeout, connect=2.0),
            )
        return self._client

    async def translate(
        self,
        text: str,
        src_lang: str = "vie",
        tgt_lang: str = "eng",
    ) -> str | None:
        """
        Translate text from src_lang to tgt_lang via SeamlessStreaming service.
        Returns translated text string, or None if service is unavailable or disabled.
        """
        if not translation_settings.translation_enabled:
            return None

        clean_text = text.strip()
        if not clean_text:
            return None

        client = self._get_client()
        try:
            res = await client.post(
                "/api/v1/translate",
                json={
                    "text": clean_text,
                    "src_lang": src_lang,
                    "tgt_lang": tgt_lang,
                },
            )
            if res.status_code == 200:
                data = res.json()
                return data.get("translation")
            else:
                logger.debug(
                    f"[TranslationClient] Service responded with HTTP {res.status_code}: {res.text}"
                )
                return None
        except httpx.ConnectError:
            logger.debug(
                f"[TranslationClient] Cannot connect to translation service at {self.base_url}"
            )
            return None
        except httpx.TimeoutException:
            logger.debug(
                f"[TranslationClient] Translation timed out after {self.timeout}s for text: {clean_text[:20]}..."
            )
            return None
        except Exception as e:
            logger.debug(f"[TranslationClient] Unexpected translation error: {e}")
            return None

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()


# Global singleton instance
seamless_client = SeamlessTranslationClient()
