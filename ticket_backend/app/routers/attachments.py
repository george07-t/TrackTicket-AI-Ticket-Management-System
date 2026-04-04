import logging
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter(prefix="/attachments", tags=["attachments"])
logger = logging.getLogger(__name__)

# Resolved at import time — safe for all OS paths.
UPLOAD_DIR = Path(__file__).parent.parent.parent / "uploads"

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
EXT_MAP = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
}


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_attachment(
    file: UploadFile = File(...),
    _: User = Depends(get_current_user),
) -> dict:
    """Upload an image attachment. Returns { url } pointing to the saved file."""

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
    filename = f"{uuid.uuid4().hex}{ext}"

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    (UPLOAD_DIR / filename).write_bytes(data)

    logger.info("Attachment saved: %s (uploaded by user %s)", filename, _.id if hasattr(_, "id") else "?")
    return {"url": f"/uploads/{filename}"}
