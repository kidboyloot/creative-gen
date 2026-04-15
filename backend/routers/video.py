import os
import uuid
import asyncio
from fastapi import APIRouter, BackgroundTasks, Depends
from pydantic import BaseModel
from typing import List, Optional

from services import fal_client as fal
from models import User
from routers.auth import get_current_user, spend_credits, CREDIT_COSTS
from database import get_session
from sqlmodel import Session

router = APIRouter(prefix="/video", tags=["video"])

OUTPUT_DIR = os.getenv("OUTPUT_PATH", "./outputs")
UPLOAD_DIR = os.getenv("STORAGE_PATH", "./uploads")

# In-memory job store (no extra DB migration needed)
video_jobs: dict = {}


class VideoGenerateRequest(BaseModel):
    image_id: str
    prompt: str = ""
    model: str = "seedance-2"
    resolution: str = "720p"
    duration: str = "auto"
    aspect_ratio: str = "9:16"
    generate_audio: bool = True
    count: int = 1


def _find_reference(image_id: str) -> str:
    for ext in ("png", "jpg", "jpeg", "webp"):
        p = os.path.join(UPLOAD_DIR, f"{image_id}.{ext}")
        if os.path.exists(p):
            return p
    raise FileNotFoundError(f"Reference image not found: {image_id}")


async def run_video_generation(job_id: str):
    job = video_jobs[job_id]
    job["status"] = "running"
    job["errors"] = []

    ref_path = _find_reference(job["image_id"])
    job_out = os.path.join(OUTPUT_DIR, "video", job_id)
    os.makedirs(job_out, exist_ok=True)

    job["total"] = job["count"]
    job["done"] = 0

    try:
        for i in range(job["count"]):
            out_path = os.path.join(job_out, f"video_{i+1:02d}.mp4")
            try:
                await fal.generate_video_from_image(
                    reference_path=ref_path,
                    prompt=job["prompt"],
                    model_id=job["model"],
                    output_path=out_path,
                    resolution=job.get("resolution", "720p"),
                    duration=job.get("duration", "auto"),
                    aspect_ratio=job.get("aspect_ratio", "9:16"),
                    generate_audio=job.get("generate_audio", True),
                )
                job["assets"].append({
                    "id": str(uuid.uuid4()),
                    "variant": i + 1,
                    "format": job.get("aspect_ratio", "9:16"),
                    "url": f"/files/video/{job_id}/{os.path.basename(out_path)}",
                })
            except Exception as e:
                err = f"Variant {i+1}: {e}"
                print(f"[video] {err}")
                job["errors"].append(err)
            finally:
                job["done"] += 1

        if job["assets"]:
            job["status"] = "done"
        else:
            job["status"] = "failed"

    except Exception as e:
        print(f"[video] Job {job_id} failed: {e}")
        job["errors"].append(str(e))
        job["status"] = "failed"


@router.get("/models")
def list_video_models():
    return fal.get_video_models()


@router.post("/generate")
async def generate_video(
    req: VideoGenerateRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User | None = Depends(get_current_user),
):
    # Spend credits if authenticated
    if user:
        cost = req.count * CREDIT_COSTS["video"]
        spend_credits(user, cost, f"Video generation: {req.count} video(s)", session)

    job_id = str(uuid.uuid4())

    video_jobs[job_id] = {
        "id": job_id,
        "image_id": req.image_id,
        "prompt": req.prompt,
        "model": req.model,
        "resolution": req.resolution,
        "duration": req.duration,
        "aspect_ratio": req.aspect_ratio,
        "generate_audio": req.generate_audio,
        "count": req.count,
        "status": "pending",
        "total": req.count,
        "done": 0,
        "assets": [],
        "errors": [],
    }

    background_tasks.add_task(run_video_generation, job_id)
    return {"job_id": job_id, "status": "pending"}


@router.get("/status/{job_id}")
def get_video_status(job_id: str):
    job = video_jobs.get(job_id)
    if not job:
        return {"error": "Job not found"}, 404
    return {
        "job_id": job["id"],
        "status": job["status"],
        "done": job["done"],
        "total": job["total"],
        "assets": job["assets"],
        "errors": job.get("errors", []),
    }
