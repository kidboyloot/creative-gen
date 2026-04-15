import os
import uuid
from fastapi import APIRouter
from pydantic import BaseModel

from services import fal_client as fal

router = APIRouter(prefix="/spaces", tags=["spaces"])

OUTPUT_DIR = os.getenv("OUTPUT_PATH", "./outputs")
UPLOAD_DIR = os.getenv("STORAGE_PATH", "./uploads")


class UpscaleRequest(BaseModel):
    image_url: str  # /files/{job_id}/{filename} or remote URL


class EnhanceRequest(BaseModel):
    prompt: str


@router.post("/upscale")
async def upscale(req: UpscaleRequest):
    url = req.image_url

    # Resolve local /files/ paths to disk paths
    if url.startswith("/files/"):
        parts = url.strip("/").split("/")  # ["files", job_id, filename]
        if len(parts) == 3:
            local_path = os.path.join(OUTPUT_DIR, parts[1], parts[2])
        else:
            return {"error": "Invalid file path"}, 400
    else:
        # Remote URL: download first
        import httpx, tempfile
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.get(url)
            r.raise_for_status()
        suffix = ".jpg" if "jpeg" in r.headers.get("content-type", "") else ".png"
        local_path = os.path.join(UPLOAD_DIR, f"tmp_{uuid.uuid4()}{suffix}")
        with open(local_path, "wb") as f:
            f.write(r.content)

    out_dir = os.path.join(OUTPUT_DIR, "upscaled")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, f"upscaled_{uuid.uuid4()}.png")

    try:
        await fal.upscale_image(local_path, out_path)
    except Exception as e:
        return {"error": str(e)}

    # Return as a serveable path
    rel = f"/files/upscaled/{os.path.basename(out_path)}"
    return {"url": rel}


@router.post("/enhance")
async def enhance(req: EnhanceRequest):
    if not req.prompt.strip():
        return {"enhanced": req.prompt}
    try:
        enhanced = await fal.enhance_prompt(req.prompt)
        return {"enhanced": enhanced}
    except Exception as e:
        # Fallback: return original prompt with quality suffix
        fallback = f"{req.prompt}, highly detailed, professional photography, 4K, sharp focus, cinematic lighting"
        return {"enhanced": fallback}
