from ulid import ULID


def generate_ulid() -> str:
    """Generate a standard 26-character sortable ULID string."""
    return str(ULID())
