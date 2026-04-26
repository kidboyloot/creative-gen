import os
import uuid
import aiofiles
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlmodel import Session

from services import fal_client as fal
from models import User
from routers.auth import get_current_user, spend_credits, CREDIT_COSTS
from database import get_session

router = APIRouter(prefix="/lipsync", tags=["lipsync"])

OUTPUT_DIR = os.getenv("OUTPUT_PATH", "./outputs")
UPLOAD_DIR = os.getenv("STORAGE_PATH", "./uploads")

ALLOWED_AUDIO = {"audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/ogg", "audio/webm", "audio/mp4", "audio/aac"}
ALLOWED_VIDEO = {"video/mp4", "video/quicktime", "video/webm", "video/x-matroska"}

# In-memory job store (same pattern as video.py)
lipsync_jobs: dict = {}


class LipSyncGenerateRequest(BaseModel):
    media_id: str          # image_id (image mode) or video_id (video mode)
    audio_id: str
    input_mode: str = "image"   # 'image' or 'video'
    model: str = "sync-1.6"
    resolution: str = "720p"


def _find_file(file_id: str, exts: tuple[str, ...]) -> str:
    for ext in exts:
        p = os.path.join(UPLOAD_DIR, f"{file_id}.{ext}")
        if os.path.exists(p):
            return p
    raise FileNotFoundError(f"File not found: {file_id}")


@router.get("/models")
def list_lipsync_models(input_mode: str = "image"):
    return fal.get_lipsync_models(input_mode)


@router.post("/upload-audio")
async def upload_audio(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_AUDIO:
        raise HTTPException(400, f"Unsupported audio type: {file.content_type}")
    ext = (file.filename or "audio").rsplit(".", 1)[-1].lower() or "mp3"
    audio_id = str(uuid.uuid4())
    dest = os.path.join(UPLOAD_DIR, f"{audio_id}.{ext}")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    async with aiofiles.open(dest, "wb") as f:
        await f.write(await file.read())
    return {"audio_id": audio_id, "filename": file.filename}


@router.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED_VIDEO:
        raise HTTPException(400, f"Unsupported video type: {file.content_type}")
    ext = (file.filename or "video").rsplit(".", 1)[-1].lower() or "mp4"
    video_id = str(uuid.uuid4())
    dest = os.path.join(UPLOAD_DIR, f"{video_id}.{ext}")
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    async with aiofiles.open(dest, "wb") as f:
        await f.write(await file.read())
    return {"video_id": video_id, "filename": file.filename}


async def run_lipsync_job(job_id: str):
    job = lipsync_jobs[job_id]
    job["status"] = "running"

    try:
        if job["input_mode"] == "video":
            media_path = _find_file(job["media_id"], ("mp4", "mov", "webm", "mkv"))
        else:
            media_path = _find_file(job["media_id"], ("png", "jpg", "jpeg", "webp"))

        audio_path = _find_file(job["audio_id"], ("mp3", "wav", "ogg", "webm", "m4a", "aac"))

        job_out = os.path.join(OUTPUT_DIR, "lipsync", job_id)
        os.makedirs(job_out, exist_ok=True)
        out_path = os.path.join(job_out, "lipsync.mp4")

        await fal.generate_lipsync(
            media_path=media_path,
            audio_path=audio_path,
            output_path=out_path,
            model_id=job["model"],
            input_mode=job["input_mode"],
            resolution=job.get("resolution", "720p"),
        )

        job["assets"].append({
            "id": str(uuid.uuid4()),
            "url": f"/files/lipsync/{job_id}/{os.path.basename(out_path)}",
        })
        job["done"] = 1
        job["status"] = "done"
    except Exception as e:
        print(f"[lipsync] Job {job_id} failed: {e}")
        job["errors"].append(str(e))
        job["status"] = "failed"


@router.post("/generate")
async def generate_lipsync(
    req: LipSyncGenerateRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User | None = Depends(get_current_user),
):
    if user:
        cost = CREDIT_COSTS.get("lipsync", 3)
        spend_credits(user, cost, "Lip sync generation", session)

    job_id = str(uuid.uuid4())
    lipsync_jobs[job_id] = {
        "id": job_id,
        "media_id": req.media_id,
        "audio_id": req.audio_id,
        "input_mode": req.input_mode,
        "model": req.model,
        "resolution": req.resolution,
        "status": "pending",
        "total": 1,
        "done": 0,
        "assets": [],
        "errors": [],
    }

    background_tasks.add_task(run_lipsync_job, job_id)
    return {"job_id": job_id, "status": "pending"}


@router.get("/status/{job_id}")
def get_lipsync_status(job_id: str):
    job = lipsync_jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return {
        "job_id": job["id"],
        "status": job["status"],
        "done": job["done"],
        "total": job["total"],
        "assets": job["assets"],
        "errors": job.get("errors", []),
    }
