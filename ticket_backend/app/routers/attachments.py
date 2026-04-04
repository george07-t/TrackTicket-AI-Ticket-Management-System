import logging
import re
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/attachments", tags=["attachments"])
logger = logging.getLogger(__name__)

# Same directory used by main.py's StaticFiles mount.
UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
EXT_MAP = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
}


def _slugify(text: str) -> str:
    """Convert a string to a URL-safe slug (lowercase, hyphens, no special chars)."""
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = text.strip("-")
    return text[:60] or "file"


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Upload an image attachment. Returns { url, name } for the saved file."""

    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only image files are allowed (jpeg, png, gif, webp).",
        )

    data = await file.read()

    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File exceeds the 5 MB size limit.",
        )

    ext = EXT_MAP.get(file.content_type or "", ".jpg")

    # Build a slugified name from the original filename so the URL is human-readable.
    # Format: {slug}-{8-char uuid}.{ext}  e.g. "my-screenshot-a3f9c12b.png"
    original_stem = Path(file.filename or "file").stem
    slug = _slugify(original_stem)
    uid = uuid.uuid4().hex[:8]
    filename = f"{slug}-{uid}{ext}"

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    (UPLOAD_DIR / filename).write_bytes(data)

    logger.info(
        "Attachment saved: %s (uploaded by user %s)",
        filename,
        getattr(current_user, "id", "?"),
    )
    return {"url": f"/uploads/{filename}", "name": filename}
