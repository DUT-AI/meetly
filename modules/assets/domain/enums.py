from enum import StrEnum
from pathlib import Path


class EntityType(StrEnum):
    """Polymorphic entity types that can have assets attached."""

    TASK = "TASK"
    TASK_COMMENT = "TASK_COMMENT"
    PROJECT = "PROJECT"
    WORKSPACE = "WORKSPACE"
    MEETING = "MEETING"
    TRANSCRIPTION_SESSION = "TRANSCRIPTION_SESSION"


class AssetCategory(StrEnum):
    """Broad category for display and preview behaviors."""

    IMAGE = "IMAGE"
    DOCUMENT = "DOCUMENT"
    ARCHIVE = "ARCHIVE"
    VIDEO = "VIDEO"
    AUDIO = "AUDIO"
    CODE = "CODE"
    OTHER = "OTHER"


IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif", "svg", "bmp", "ico", "tiff"}

DOCUMENT_EXTENSIONS = {
    "pdf",
    "doc",
    "docx",
    "xls",
    "xlsx",
    "ppt",
    "pptx",
    "odt",
    "ods",
    "odp",
    "rtf",
}

ARCHIVE_EXTENSIONS = {"zip", "rar", "7z", "tar", "gz", "bz2", "xz"}

VIDEO_EXTENSIONS = {"mp4", "webm", "mov", "mkv", "avi", "wmv", "flv"}

AUDIO_EXTENSIONS = {"mp3", "wav", "m4a", "ogg", "flac", "aac", "wma"}

CODE_EXTENSIONS = {
    "txt",
    "md",
    "json",
    "csv",
    "log",
    "sql",
    "ts",
    "tsx",
    "js",
    "jsx",
    "py",
    "html",
    "css",
    "xml",
    "yml",
    "yaml",
    "sh",
    "env",
}


def detect_category(
    file_name: str, mime_type: str | None = None
) -> tuple[str, AssetCategory]:
    """Extract lowercase extension and determine the appropriate AssetCategory."""
    ext = Path(file_name).suffix.lstrip(".").lower()
    mime = (mime_type or "").lower()

    if ext in IMAGE_EXTENSIONS or mime.startswith("image/"):
        return ext, AssetCategory.IMAGE
    if (
        ext in DOCUMENT_EXTENSIONS
        or "pdf" in mime
        or "officedocument" in mime
        or "msword" in mime
    ):
        return ext, AssetCategory.DOCUMENT
    if (
        ext in ARCHIVE_EXTENSIONS
        or "zip" in mime
        or "compressed" in mime
        or "tar" in mime
    ):
        return ext, AssetCategory.ARCHIVE
    if ext in VIDEO_EXTENSIONS or mime.startswith("video/"):
        return ext, AssetCategory.VIDEO
    if ext in AUDIO_EXTENSIONS or mime.startswith("audio/"):
        return ext, AssetCategory.AUDIO
    if (
        ext in CODE_EXTENSIONS
        or mime.startswith("text/")
        or "json" in mime
        or "csv" in mime
    ):
        return ext, AssetCategory.CODE

    return ext, AssetCategory.OTHER
