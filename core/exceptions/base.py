class DomainException(Exception):
    """Base exception for all domain business errors."""

    def __init__(self, message: str, status_code: int = 400) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class NotFoundException(DomainException):
    """Resource not found (HTTP 404)."""

    def __init__(self, message: str = "Resource not found") -> None:
        super().__init__(message, status_code=404)


class BadRequestException(DomainException):
    """Invalid input or failed domain rule check (HTTP 400)."""

    def __init__(self, message: str = "Bad request") -> None:
        super().__init__(message, status_code=400)


class ConflictException(DomainException):
    """Resource duplicate or concurrency conflict (HTTP 409)."""

    def __init__(self, message: str = "Resource conflict") -> None:
        super().__init__(message, status_code=409)


class UnauthorizedException(DomainException):
    """Authentication required or failed (HTTP 401)."""

    def __init__(self, message: str = "Unauthorized") -> None:
        super().__init__(message, status_code=401)


class ForbiddenException(DomainException):
    """Permission denied (HTTP 403)."""

    def __init__(self, message: str = "Permission denied") -> None:
        super().__init__(message, status_code=403)
