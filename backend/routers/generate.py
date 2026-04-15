import os
import json
import asyncio
from fastapi import APIRouter, BackgroundTasks, HTTPException, Depends
from sqlmodel import Session, select
from pydantic import BaseModel
from typing import List, Optional

from database import get_session
from models import GenerationJob, GeneratedAsset, User
from services import fal_client as fal
from services.collage import make_collage
from services.zip_builder import build_zip
from routers.auth import get_current_user, spend_credits, CREDIT_COSTS

router = APIRouter(prefix="/generate", tags=["generate"])

OUTPUT_DIR = os.getenv("OUTPUT_PATH", "./outputs")
UPLOAD_DIR = os.getenv("STORAGE_PATH", "./uploads")


class GenerateRequest(BaseModel):
    image_id: Optional[str] = None
    prompt: Optional[str] = ""
    prompts: Optional[List[str]] = None   # multiple prompts — cycles across variants
    formats: List[str] = ["1:1", "9:16"]
    types: List[str] = ["image", "video", "collage"]
    count: int = 10
    model: str = "flux-dev"
    project_id: Optional[str] = None
    hero_index: int = 0           # which variant is the hero image in collages
    collage_layout: str = "auto"  # collage layout to use


def _find_reference(image_id: str) -> str:
    for ext in ("png", "jpg", "jpeg", "webp"):
        p = os.path.join(UPLOAD_DIR, f"{image_id}.{ext}")
        if os.path.exists(p):
            return p
    raise FileNotFoundError(f"Reference image not found: {image_id}")


async def run_generation(job_id: str):
    from database import engine
    from sqlmodel import Session

    with Session(engine) as session:
        job = session.get(GenerationJob, job_id)
        if not job:
            return

        job.status = "running"
        session.add(job)
        session.commit()

        formats = json.loads(job.formats)
        types = json.loads(job.types)
        # Build prompts list: use job.prompts if set, otherwise fall back to job.prompt
        prompts_list = json.loads(job.prompts) if job.prompts else [job.prompt]
        ref_path = None
        if job.image_id:
            try:
                ref_path = _find_reference(job.image_id)
            except FileNotFoundError:
                ref_path = None

        job_out = os.path.join(OUTPUT_DIR, job_id)
        os.makedirs(job_out, exist_ok=True)

        assets_created = []

        try:
            for fmt in formats:
                fmt_slug = fmt.replace(":", "x")

                for i in range(job.count):
                    # Cycle through prompts: variant 0→prompt[0], variant 1→prompt[1], etc.
                    variant_prompt = prompts_list[i % len(prompts_list)]
                    seed = (i + 1) * 1000 + hash(variant_prompt) % 10000

                    generated_image_path = None

                    # --- Static image ---
                    if "image" in types:
                        img_path = os.path.join(job_out, f"variant_{i+1:02d}_{fmt_slug}.png")
                        try:
                            if ref_path:
                                await fal.generate_image(ref_path, variant_prompt, fmt, seed, img_path, job.model)
                            else:
                                await fal.generate_image_from_text(variant_prompt, fmt, seed, img_path, job.model)
                            generated_image_path = img_path
                            asset = GeneratedAsset(
                                job_id=job_id,
                                variant_index=i + 1,
                                asset_type="image",
                                format=fmt,
                                file_path=img_path,
                            )
                            with Session(engine) as s2:
                                s2.add(asset)
                                s2.exec(
                                    select(GenerationJob).where(GenerationJob.id == job_id)
                                )
                                j = s2.get(GenerationJob, job_id)
                                j.done_assets += 1
                                s2.add(j)
                                s2.commit()
                        except Exception as e:
                            print(f"Image generation failed variant {i+1} {fmt}: {e}")

                    # --- Video (animate the generated image) ---
                    if "video" in types and generated_image_path:  # noqa
                        vid_path = os.path.join(job_out, f"variant_{i+1:02d}_{fmt_slug}.mp4")
                        try:
                            await fal.generate_video(generated_image_path, vid_path, fmt)
                            asset = GeneratedAsset(
                                job_id=job_id,
                                variant_index=i + 1,
                                asset_type="video",
                                format=fmt,
                                file_path=vid_path,
                            )
                            with Session(engine) as s2:
                                s2.add(asset)
                                j = s2.get(GenerationJob, job_id)
                                j.done_assets += 1
                                s2.add(j)
                                s2.commit()
                        except Exception as e:
                            print(f"Video generation failed variant {i+1} {fmt}: {e}")

                # --- Collages (one collage per format using all generated images) ---
                if "collage" in types:
                    fmt_slug = fmt.replace(":", "x")
                    img_files = [
                        os.path.join(job_out, f"variant_{i+1:02d}_{fmt_slug}.png")
                        for i in range(job.count)
                        if os.path.exists(os.path.join(job_out, f"variant_{i+1:02d}_{fmt_slug}.png"))
                    ]
                    if len(img_files) >= 2:
                        collage_path = os.path.join(job_out, f"collage_{fmt_slug}.png")
                        try:
                            make_collage(img_files, fmt, collage_path, layout="auto", hero_index=0)
                            asset = GeneratedAsset(
                                job_id=job_id,
                                variant_index=0,
                                asset_type="collage",
                                format=fmt,
                                file_path=collage_path,
                            )
                            with Session(engine) as s2:
                                s2.add(asset)
                                j = s2.get(GenerationJob, job_id)
                                j.done_assets += 1
                                s2.add(j)
                                s2.commit()
                        except Exception as e:
                            print(f"Collage failed {fmt}: {e}")

            # Build ZIP
            with Session(engine) as s2:
                assets_q = s2.exec(
                    select(GeneratedAsset).where(GeneratedAsset.job_id == job_id)
                ).all()
                file_paths = [a.file_path for a in assets_q]

            zip_path = os.path.join(job_out, "all_creatives.zip")
            build_zip(file_paths, zip_path)

            with Session(engine) as s2:
                j = s2.get(GenerationJob, job_id)
                j.status = "done"
                s2.add(j)
                s2.commit()

        except Exception as e:
            print(f"Job {job_id} failed: {e}")
            with Session(engine) as s2:
                j = s2.get(GenerationJob, job_id)
                j.status = "failed"
                s2.add(j)
                s2.commit()


@router.get("/models")
async def list_models():
    return fal.get_models()


@router.get("/collage-layouts")
async def list_collage_layouts():
    from services.collage import get_layouts
    return get_layouts()


@router.post("")
async def start_generation(
    req: GenerateRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User | None = Depends(get_current_user),
):
    # Resolve prompts: prefer prompts array, fall back to single prompt
    prompts_list = req.prompts if req.prompts else ([req.prompt] if req.prompt else [""])
    prompts_list = [p for p in prompts_list if p.strip()]  # drop empty
    if not prompts_list:
        prompts_list = [""]

    # Calculate and spend credits if user is authenticated
    if user:
        image_count = req.count * len(req.formats) if "image" in req.types else 0
        video_count = req.count * len(req.formats) if "video" in req.types else 0
        total_cost = (image_count * CREDIT_COSTS["image"]) + (video_count * CREDIT_COSTS["video"])
        if total_cost > 0:
            spend_credits(user, total_cost, f"Generation: {image_count} images, {video_count} videos", session)

    job = GenerationJob(
        image_id=req.image_id,
        user_id=user.id if user else None,
        prompt=prompts_list[0],         # first prompt for backwards compat
        prompts=json.dumps(prompts_list),
        formats=json.dumps(req.formats),
        types=json.dumps(req.types),
        count=req.count,
        model=req.model,
        project_id=req.project_id,
        status="pending",
        total_assets=req.count * len(req.formats) * len(req.types),
        done_assets=0,
    )
    session.add(job)
    session.commit()
    session.refresh(job)

    background_tasks.add_task(run_generation, job.id)

    return {"job_id": job.id, "status": "pending"}


@router.get("/status/{job_id}")
async def get_status(job_id: str, session: Session = Depends(get_session)):
    job = session.get(GenerationJob, job_id)
    if not job:
        raise HTTPException(404, "Job not found")

    assets = session.exec(
        select(GeneratedAsset).where(GeneratedAsset.job_id == job_id)
    ).all()

    return {
        "job_id": job.id,
        "status": job.status,
        "done": job.done_assets,
        "total": job.total_assets,
        "assets": [
            {
                "id": a.id,
                "type": a.asset_type,
                "format": a.format,
                "variant": a.variant_index,
                "url": f"/files/{job_id}/{os.path.basename(a.file_path)}",
            }
            for a in assets
        ],
    }
