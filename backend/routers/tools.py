import os
import uuid
import asyncio
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from typing import Optional
from sqlmodel import Session

from models import User
from database import get_session
from routers.auth import get_current_user

router = APIRouter(prefix="/tools", tags=["tools"])


def _remove_bg_local(input_path: str, output_path: str):
    """Remove background using rembg — runs 100% locally, no API costs."""
    from rembg import remove
    from PIL import Image

    img = Image.open(input_path)
    result = remove(img)
    result.save(output_path, "PNG")

UPLOAD_DIR = os.getenv("STORAGE_PATH", "./uploads")
OUTPUT_DIR = os.getenv("OUTPUT_PATH", "./outputs")


@router.post("/remove-bg")
async def remove_background(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    user: User | None = Depends(get_current_user),
):
    """Remove background from an uploaded image. Runs locally — zero API cost."""
    ext = file.filename.split(".")[-1] if file.filename else "png"
    file_id = str(uuid.uuid4())
    input_path = os.path.join(UPLOAD_DIR, f"{file_id}.{ext}")
    output_path = os.path.join(OUTPUT_DIR, f"{file_id}_nobg.png")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    with open(input_path, "wb") as f:
        content = await file.read()
        f.write(content)

    try:
        await asyncio.to_thread(_remove_bg_local, input_path, output_path)
    except Exception as e:
        raise HTTPException(500, f"Background removal failed: {e}")

    return {
        "id": file_id,
        "url": f"/files/tools/{file_id}_nobg.png",
        "filename": f"{file_id}_nobg.png",
    }


@router.post("/collage")
async def create_collage(
    layout: str = "auto",
    fmt: str = "1:1",
    hero_index: int = 0,
    gap: int = 4,
    files: list[UploadFile] = File(...),
):
    """Create a collage from uploaded images."""
    from services.collage import make_collage

    collage_id = str(uuid.uuid4())
    temp_dir = os.path.join(OUTPUT_DIR, f"collage_{collage_id}")
    os.makedirs(temp_dir, exist_ok=True)

    # Save uploaded files
    image_paths = []
    for i, file in enumerate(files):
        ext = file.filename.split(".")[-1] if file.filename else "png"
        path = os.path.join(temp_dir, f"img_{i}.{ext}")
        with open(path, "wb") as f:
            content = await file.read()
            f.write(content)
        image_paths.append(path)

    if len(image_paths) < 2:
        raise HTTPException(400, "At least 2 images required for a collage")

    output_path = os.path.join(temp_dir, "collage.png")
    try:
        make_collage(image_paths, fmt, output_path, layout=layout, hero_index=hero_index, gap=gap)
    except Exception as e:
        raise HTTPException(500, f"Collage creation failed: {e}")

    return {
        "id": collage_id,
        "url": f"/files/collage_{collage_id}/collage.png",
    }
