def build_storage_public_url(
    uri_or_path: str,
    base_endpoint: str,
    bucket: str | None = None,
) -> str:
    """Build a full public direct GET URL from a relative object path.

    Format: {base_endpoint}/{bucket}/{key}
    """
    if not uri_or_path:
        return ""

    if uri_or_path.startswith(("http://", "https://")):
        return uri_or_path

    clean_path = uri_or_path.strip()
    clean_path = clean_path.removeprefix("s3://")
    clean_path = clean_path.lstrip("/")

    if bucket and not clean_path.startswith(f"{bucket}/"):
        full_path = f"{bucket}/{clean_path}"
    else:
        full_path = clean_path

    base = base_endpoint.rstrip("/")
    return f"{base}/{full_path}"


def parse_storage_uri(
    uri_or_path: str,
    default_bucket: str = "meetly-uploads",
) -> tuple[str, str]:
    """Parse a stored URI or relative path into (bucket, key)."""
    if not uri_or_path:
        return default_bucket, ""

    clean_path = uri_or_path.strip()
    clean_path = clean_path.removeprefix("s3://")
    clean_path = clean_path.lstrip("/")

    parts = clean_path.split("/", 1)
    if len(parts) == 2:
        return parts[0], parts[1]
    return default_bucket, clean_path
