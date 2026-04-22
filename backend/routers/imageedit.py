import os
import uuid
import asyncio
import base64
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlmodel import Session
from PIL import Image, ImageFilter, ImageEnhance

import fal_client as fal_sdk

from models import User
from database import get_session
from routers.auth import get_current_user, spend_credits, CREDIT_COSTS

router = APIRouter(prefix="/image-edit", tags=["image-edit"])

OUTPUT_DIR = os.getenv("OUTPUT_PATH", "./outputs")
UPLOAD_DIR = os.getenv("STORAGE_PATH", "./uploads")


def _image_to_data_uri(path: str) -> str:
    with open(path, "rb") as f:
        data = base64.b64encode(f.read()).decode()
    ext = Path(path).suffix.lstrip(".").lower()
    mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
    return f"data:{mime};base64,{data}"


async def _download_file(url: str, dest: str):
    import httpx
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.get(url)
        r.raise_for_status()
        with open(dest, "wb") as f:
            f.write(r.content)


@router.post("/inpaint")
async def inpaint(
    image: UploadFile = File(...),
    mask: UploadFile = File(...),
    prompt: str = Form(""),
    session: Session = Depends(get_session),
    user: User | None = Depends(get_current_user),
):
    """AI inpainting — paint over an area and describe what to fill in."""
    if user:
        spend_credits(user, CREDIT_COSTS["image"], "Image inpainting", session)

    edit_id = str(uuid.uuid4())
    edit_dir = os.path.join(OUTPUT_DIR, f"edit_{edit_id}")
    os.makedirs(edit_dir, exist_ok=True)

    # Save image and mask
    img_path = os.path.join(edit_dir, "input.png")
    mask_path = os.path.join(edit_dir, "mask.png")
    out_path = os.path.join(edit_dir, "result.png")

    with open(img_path, "wb") as f:
        f.write(await image.read())
    with open(mask_path, "wb") as f:
        f.write(await mask.read())

    # Data URIs work for small/medium images but fal's inpainting endpoints
    # choke above ~2MB base64. Upload through their client instead so we get
    # a public URL back — same path everyone else on fal uses.
    try:
        image_url_public = await asyncio.to_thread(fal_sdk.upload_file, img_path)
        mask_url_public = await asyncio.to_thread(fal_sdk.upload_file, mask_path)
    except Exception as e:
        raise HTTPException(500, f"Could not upload to fal: {e}")

    # fal-ai/flux-lora/inpainting is the currently-maintained Flux inpainting
    # endpoint — `fal-ai/flux/dev/inpainting` was the legacy path and is
    # flaky / removed. Keep the model pinned via env var so we can swap
    # without a code change if fal renames things again.
    endpoint = os.getenv("FAL_INPAINT_MODEL", "fal-ai/flux-lora/inpainting")

    try:
        result = await asyncio.to_thread(
            fal_sdk.run,
            endpoint,
            arguments={
                "image_url": image_url_public,
                "mask_url": mask_url_public,
                "prompt": prompt or "seamless natural fill, photorealistic",
                "num_images": 1,
                "num_inference_steps": 28,
                "guidance_scale": 3.5,
            },
        )
    except Exception as e:
        # Bubble up the actual fal error so the user sees it instead of a
        # generic 500. Almost all fal exceptions include the response body.
        msg = str(e)
        raise HTTPException(500, f"Inpainting failed ({endpoint}): {msg[:400]}")

    images = (result or {}).get("images") or []
    if not images:
        raise HTTPException(500, f"Inpainting returned no images. Raw: {str(result)[:300]}")
    img_url = images[0].get("url") if isinstance(images[0], dict) else None
    if not img_url:
        raise HTTPException(500, f"Inpainting response missing url. Raw: {str(result)[:300]}")

    try:
        await _download_file(img_url, out_path)
    except Exception as e:
        raise HTTPException(500, f"Failed to fetch inpainted image: {e}")

    return {
        "id": edit_id,
        "url": f"/files/edit_{edit_id}/result.png",
    }


@router.post("/remove-bg")
async def remove_bg(
    image: UploadFile = File(...),
):
    """One-click background removal (local, free)."""
    from rembg import remove as rembg_remove

    edit_id = str(uuid.uuid4())
    edit_dir = os.path.join(OUTPUT_DIR, f"edit_{edit_id}")
    os.makedirs(edit_dir, exist_ok=True)

    img_path = os.path.join(edit_dir, "input.png")
    out_path = os.path.join(edit_dir, "nobg.png")

    with open(img_path, "wb") as f:
        f.write(await image.read())

    try:
        img = Image.open(img_path)
        result = await asyncio.to_thread(rembg_remove, img)
        result.save(out_path, "PNG")
    except Exception as e:
        raise HTTPException(500, f"Background removal failed: {e}")

    return {
        "id": edit_id,
        "url": f"/files/edit_{edit_id}/nobg.png",
    }


@router.post("/enhance")
async def enhance_image(
    image: UploadFile = File(...),
    brightness: float = Form(1.0),
    contrast: float = Form(1.0),
    sharpness: float = Form(1.0),
    saturation: float = Form(1.0),
):
    """Enhance image with adjustable parameters (local, free)."""
    edit_id = str(uuid.uuid4())
    edit_dir = os.path.join(OUTPUT_DIR, f"edit_{edit_id}")
    os.makedirs(edit_dir, exist_ok=True)

    img_path = os.path.join(edit_dir, "input.png")
    out_path = os.path.join(edit_dir, "enhanced.png")

    with open(img_path, "wb") as f:
        f.write(await image.read())

    try:
        img = Image.open(img_path).convert("RGB")
        if brightness != 1.0:
            img = ImageEnhance.Brightness(img).enhance(brightness)
        if contrast != 1.0:
            img = ImageEnhance.Contrast(img).enhance(contrast)
        if sharpness != 1.0:
            img = ImageEnhance.Sharpness(img).enhance(sharpness)
        if saturation != 1.0:
            img = ImageEnhance.Color(img).enhance(saturation)
        img.save(out_path, "PNG", quality=95)
    except Exception as e:
        raise HTTPException(500, f"Enhancement failed: {e}")

    return {
        "id": edit_id,
        "url": f"/files/edit_{edit_id}/enhanced.png",
    }


@router.post("/resize")
async def resize_image(
    image: UploadFile = File(...),
    width: int = Form(1080),
    height: int = Form(1080),
):
    """Resize image to specific dimensions (local, free)."""
    edit_id = str(uuid.uuid4())
    edit_dir = os.path.join(OUTPUT_DIR, f"edit_{edit_id}")
    os.makedirs(edit_dir, exist_ok=True)

    img_path = os.path.join(edit_dir, "input.png")
    out_path = os.path.join(edit_dir, "resized.png")

    with open(img_path, "wb") as f:
        f.write(await image.read())

    try:
        img = Image.open(img_path).convert("RGB")
        img = img.resize((width, height), Image.LANCZOS)
        img.save(out_path, "PNG", quality=95)
    except Exception as e:
        raise HTTPException(500, f"Resize failed: {e}")

    return {
        "id": edit_id,
        "url": f"/files/edit_{edit_id}/resized.png",
    }
