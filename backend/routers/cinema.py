import os
import uuid
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session

from services import fal_client as fal
from models import User
from routers.auth import get_current_user, spend_credits, CREDIT_COSTS
from database import get_session

router = APIRouter(prefix="/cinema", tags=["cinema"])

OUTPUT_DIR = os.getenv("OUTPUT_PATH", "./outputs")

# In-memory job store
cinema_jobs: dict = {}


class CinemaGenerateRequest(BaseModel):
    prompt: str                 # already augmented client-side via buildCinemaPrompt()
    aspect_ratio: str = "16:9"
    resolution: str = "2K"      # 1K | 2K | 4K


async def run_cinema_job(job_id: str):
    job = cinema_jobs[job_id]
    job["status"] = "running"

    try:
        job_out = os.path.join(OUTPUT_DIR, "cinema", job_id)
        os.makedirs(job_out, exist_ok=True)
        out_path = os.path.join(job_out, "shot.png")

        await fal.generate_cinema_image(
            prompt=job["prompt"],
            aspect_ratio=job["aspect_ratio"],
            resolution=job["resolution"],
            output_path=out_path,
        )

        job["assets"].append({
            "id": str(uuid.uuid4()),
            "url": f"/files/cinema/{job_id}/{os.path.basename(out_path)}",
        })
        job["done"] = 1
        job["status"] = "done"
    except Exception as e:
        print(f"[cinema] Job {job_id} failed: {e}")
        job["errors"].append(str(e))
        job["status"] = "failed"


@router.post("/generate")
async def generate_cinema(
    req: CinemaGenerateRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User | None = Depends(get_current_user),
):
    if not req.prompt or not req.prompt.strip():
        raise HTTPException(400, "Prompt is required")

    if user:
        cost = CREDIT_COSTS.get("cinema", 2)
        spend_credits(user, cost, "Cinema shot generation", session)

    job_id = str(uuid.uuid4())
    cinema_jobs[job_id] = {
        "id": job_id,
        "prompt": req.prompt,
        "aspect_ratio": req.aspect_ratio,
        "resolution": req.resolution,
        "status": "pending",
        "total": 1,
        "done": 0,
        "assets": [],
        "errors": [],
    }

    background_tasks.add_task(run_cinema_job, job_id)
    return {"job_id": job_id, "status": "pending"}


@router.get("/status/{job_id}")
def get_cinema_status(job_id: str):
    job = cinema_jobs.get(job_id)
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
