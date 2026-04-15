import os
import uuid
import asyncio
import base64
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from sqlmodel import Session

import fal_client as fal_sdk
import edge_tts

from models import User
from database import get_session
from routers.auth import get_current_user, spend_credits, CREDIT_COSTS
from services import fal_client as fal

router = APIRouter(prefix="/avatar", tags=["avatar"])

OUTPUT_DIR = os.getenv("OUTPUT_PATH", "./outputs")
UPLOAD_DIR = os.getenv("STORAGE_PATH", "./uploads")

# In-memory job tracking
avatar_jobs: dict = {}

AVATAR_PRESETS = {
    "ages": ["Young (20s)", "Adult (30s)", "Middle-aged (40s)", "Mature (50s+)"],
    "genders": ["Male", "Female"],
    "styles": [
        {"id": "professional", "label": "Professional", "prompt": "professional business attire, office setting, confident posture"},
        {"id": "casual", "label": "Casual", "prompt": "casual modern clothing, relaxed natural setting, friendly expression"},
        {"id": "influencer", "label": "Influencer", "prompt": "trendy influencer style, aesthetic background, engaging smile"},
        {"id": "expert", "label": "Expert / Doctor", "prompt": "lab coat or professional expert attire, clean clinical setting, trustworthy expression"},
        {"id": "fitness", "label": "Fitness", "prompt": "athletic wear, gym or outdoor fitness setting, energetic pose"},
        {"id": "luxury", "label": "Luxury", "prompt": "elegant luxury attire, upscale interior, sophisticated and refined"},
    ],
    "settings": [
        {"id": "studio", "label": "Studio", "prompt": "clean white studio background, professional lighting"},
        {"id": "office", "label": "Office", "prompt": "modern office background, natural light, professional"},
        {"id": "outdoor", "label": "Outdoor", "prompt": "outdoor natural setting, golden hour lighting"},
        {"id": "home", "label": "Home / Lifestyle", "prompt": "cozy modern home interior, warm ambient lighting"},
        {"id": "store", "label": "Store / Retail", "prompt": "retail store background, product shelves, commercial setting"},
    ],
    "interactions": [
        {"id": "talking", "label": "Talking to Camera", "prompt": "looking directly at camera, speaking naturally, engaging expression"},
        {"id": "holding", "label": "Holding Product", "prompt": "holding product with both hands, showing it to camera, enthusiastic"},
        {"id": "pointing", "label": "Pointing / Presenting", "prompt": "pointing to the side as if presenting something, presenter pose"},
        {"id": "unboxing", "label": "Unboxing", "prompt": "opening a package excitedly, unboxing reveal moment"},
        {"id": "using", "label": "Using Product", "prompt": "actively using and demonstrating a product, natural demonstration"},
    ],
}

VOICE_PRESETS = [
    {"id": "pt-PT-DuarteNeural", "name": "Duarte", "lang": "PT-PT", "gender": "Male"},
    {"id": "pt-PT-RaquelNeural", "name": "Raquel", "lang": "PT-PT", "gender": "Female"},
    {"id": "pt-BR-AntonioNeural", "name": "António", "lang": "PT-BR", "gender": "Male"},
    {"id": "pt-BR-FranciscaNeural", "name": "Francisca", "lang": "PT-BR", "gender": "Female"},
    {"id": "en-US-AriaNeural", "name": "Aria", "lang": "EN-US", "gender": "Female"},
    {"id": "en-US-GuyNeural", "name": "Guy", "lang": "EN-US", "gender": "Male"},
    {"id": "en-GB-SoniaNeural", "name": "Sonia", "lang": "EN-UK", "gender": "Female"},
    {"id": "es-ES-ElviraNeural", "name": "Elvira", "lang": "ES", "gender": "Female"},
    {"id": "fr-FR-DeniseNeural", "name": "Denise", "lang": "FR", "gender": "Female"},
    {"id": "de-DE-KatjaNeural", "name": "Katja", "lang": "DE", "gender": "Female"},
]


class AvatarGenerateRequest(BaseModel):
    # Avatar config
    age: str = "Adult (30s)"
    gender: str = "Female"
    style: str = "professional"
    setting: str = "studio"
    interaction: str = "talking"
    custom_description: str = ""
    # Voice
    script: str = ""
    voice_id: str = "en-US-AriaNeural"
    voice_rate: str = "+0%"
    # Generation
    model: str = "flux-dev"
    video_model: str = "seedance-2"
    generate_video: bool = True
    # If using own photo
    photo_image_id: Optional[str] = None


@router.get("/presets")
async def get_presets():
    return {**AVATAR_PRESETS, "voices": VOICE_PRESETS}


@router.post("/generate")
async def generate_avatar(
    req: AvatarGenerateRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User | None = Depends(get_current_user),
):
    """Generate AI avatar image + optional video + voice."""
    job_id = str(uuid.uuid4())

    # Calculate credits: 1 for image + 3 for video (if enabled)
    cost = CREDIT_COSTS["image"]
    if req.generate_video:
        cost += CREDIT_COSTS["video"]
    if user:
        spend_credits(user, cost, f"Avatar: image{' + video' if req.generate_video else ''}", session)

    avatar_jobs[job_id] = {
        "id": job_id,
        "status": "running",
        "step": "generating avatar image",
        "avatar_url": None,
        "voice_url": None,
        "video_url": None,
    }

    background_tasks.add_task(_run_avatar_pipeline, job_id, req)
    return {"job_id": job_id, "status": "running"}


async def _run_avatar_pipeline(job_id: str, req: AvatarGenerateRequest):
    job_dir = os.path.join(OUTPUT_DIR, f"avatar_{job_id}")
    os.makedirs(job_dir, exist_ok=True)

    try:
        # Step 1: Generate or use avatar image
        avatar_path = os.path.join(job_dir, "avatar.png")

        if req.photo_image_id:
            # Use uploaded photo as reference
            ref_path = None
            for ext in ("png", "jpg", "jpeg", "webp"):
                p = os.path.join(UPLOAD_DIR, f"{req.photo_image_id}.{ext}")
                if os.path.exists(p):
                    ref_path = p
                    break
            if not ref_path:
                avatar_jobs[job_id]["status"] = "failed"
                avatar_jobs[job_id]["step"] = "Photo not found"
                return

            # Generate variation of the uploaded photo in the desired setting
            style_info = next((s for s in AVATAR_PRESETS["styles"] if s["id"] == req.style), AVATAR_PRESETS["styles"][0])
            setting_info = next((s for s in AVATAR_PRESETS["settings"] if s["id"] == req.setting), AVATAR_PRESETS["settings"][0])
            interaction_info = next((s for s in AVATAR_PRESETS["interactions"] if s["id"] == req.interaction), AVATAR_PRESETS["interactions"][0])

            prompt = f"Portrait photo of the same person, {style_info['prompt']}, {setting_info['prompt']}, {interaction_info['prompt']}, photorealistic, high quality"
            if req.custom_description:
                prompt = f"{req.custom_description}, {prompt}"

            await fal.generate_image(ref_path, prompt, "1:1", 42, avatar_path, req.model)
        else:
            # Generate from scratch using description
            style_info = next((s for s in AVATAR_PRESETS["styles"] if s["id"] == req.style), AVATAR_PRESETS["styles"][0])
            setting_info = next((s for s in AVATAR_PRESETS["settings"] if s["id"] == req.setting), AVATAR_PRESETS["settings"][0])
            interaction_info = next((s for s in AVATAR_PRESETS["interactions"] if s["id"] == req.interaction), AVATAR_PRESETS["interactions"][0])

            prompt = (
                f"Photorealistic portrait of a {req.age.lower()} {req.gender.lower()}, "
                f"{style_info['prompt']}, {setting_info['prompt']}, {interaction_info['prompt']}, "
                f"natural skin texture, detailed face, looking at camera, "
                f"professional photography, 8k, high quality"
            )
            if req.custom_description:
                prompt = f"{req.custom_description}, {prompt}"

            # Use fal text-to-image for avatar from scratch
            image_uri = None  # No reference image for from-scratch
            result = await asyncio.to_thread(
                fal_sdk.run,
                "fal-ai/flux/dev",
                arguments={
                    "prompt": prompt,
                    "image_size": {"width": 1024, "height": 1024},
                    "num_images": 1,
                    "num_inference_steps": 28,
                },
            )
            img_url = result["images"][0]["url"]
            import httpx
            async with httpx.AsyncClient(timeout=120) as client:
                r = await client.get(img_url)
                with open(avatar_path, "wb") as f:
                    f.write(r.content)

        avatar_jobs[job_id]["avatar_url"] = f"/files/avatar_{job_id}/avatar.png"
        avatar_jobs[job_id]["step"] = "avatar image done"

        # Step 2: Generate voice (if script provided)
        if req.script.strip():
            avatar_jobs[job_id]["step"] = "generating voice"
            voice_path = os.path.join(job_dir, "voice.mp3")

            communicate = edge_tts.Communicate(
                text=req.script,
                voice=req.voice_id,
                rate=req.voice_rate,
            )
            await communicate.save(voice_path)
            avatar_jobs[job_id]["voice_url"] = f"/files/avatar_{job_id}/voice.mp3"
            avatar_jobs[job_id]["step"] = "voice done"

        # Step 3: Generate video (if enabled)
        if req.generate_video:
            avatar_jobs[job_id]["step"] = "generating video"
            video_path = os.path.join(job_dir, "video.mp4")

            video_prompt = "person talking naturally to camera, subtle head movements, blinking, natural expressions, smooth cinematic motion"
            if req.script.strip():
                video_prompt = f"person speaking: '{req.script[:100]}', {video_prompt}"

            await fal.generate_video_from_image(
                avatar_path,
                video_prompt,
                req.video_model,
                video_path,
                resolution="720p",
                duration="5",
                aspect_ratio="1:1",
            )
            avatar_jobs[job_id]["video_url"] = f"/files/avatar_{job_id}/video.mp4"
            avatar_jobs[job_id]["step"] = "video done"

        avatar_jobs[job_id]["status"] = "done"

    except Exception as e:
        print(f"Avatar pipeline failed: {e}")
        avatar_jobs[job_id]["status"] = "failed"
        avatar_jobs[job_id]["step"] = str(e)


@router.get("/status/{job_id}")
async def get_status(job_id: str):
    job = avatar_jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job
