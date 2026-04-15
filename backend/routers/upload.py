import os
import uuid
import aiofiles
from fastapi import APIRouter, UploadFile, File, HTTPException

router = APIRouter(prefix="/upload", tags=["upload"])

UPLOAD_DIR = os.getenv("STORAGE_PATH", "./uploads")
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}


@router.post("")
async def upload_image(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(400, "Only JPEG, PNG, and WebP images are supported.")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    image_id = str(uuid.uuid4())
    dest = os.path.join(UPLOAD_DIR, f"{image_id}.{ext}")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    async with aiofiles.open(dest, "wb") as f:
        content = await file.read()
        await f.write(content)

    return {"image_id": image_id, "filename": file.filename, "path": dest}
