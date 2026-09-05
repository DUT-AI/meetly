from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from core.exceptions.base import DomainException


def setup_exception_handlers(app: FastAPI) -> None:
    """Register custom exception handlers on FastAPI instance."""

    @app.exception_handler(DomainException)
    async def domain_exception_handler(
        request: Request, exc: DomainException
    ) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.__class__.__name__,
                    "message": exc.message,
                }
            },
        )
