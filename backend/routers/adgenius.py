import os
import uuid
import json
import asyncio
import base64
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, List
from sqlmodel import Session

import fal_client as fal_sdk
import httpx

# Ensure FAL_KEY is set
if not os.environ.get("FAL_KEY"):
    from dotenv import load_dotenv
    load_dotenv()

from models import User
from database import get_session
from routers.auth import get_current_user, spend_credits, CREDIT_COSTS
from services import fal_client as fal

router = APIRouter(prefix="/adgenius", tags=["adgenius"])

OUTPUT_DIR = os.getenv("OUTPUT_PATH", "./outputs")
UPLOAD_DIR = os.getenv("STORAGE_PATH", "./uploads")
META_ACCESS_TOKEN = os.getenv("META_ACCESS_TOKEN", "")

# In-memory job tracking
adgenius_jobs: dict = {}


def _image_to_data_uri(path: str) -> str:
    with open(path, "rb") as f:
        data = base64.b64encode(f.read()).decode()
    ext = Path(path).suffix.lstrip(".").lower()
    mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
    return f"data:{mime};base64,{data}"


# ── Schemas ──

class AnalyzeRequest(BaseModel):
    niche: str = ""
    target_audience: str = ""


class GenerateVariationsRequest(BaseModel):
    analysis: str
    product_image_id: str
    niche: str = ""
    target_audience: str = ""
    brand_colors: Optional[str] = ""
    count: int = 4
    model: str = "flux-dev"
    formats: List[str] = ["1:1"]


class GenerateCopyRequest(BaseModel):
    analysis: dict
    brand_name: str = ""
    product: str = ""
    target_audience: str = ""
    tone: str = "aggressive"


class SearchAdsRequest(BaseModel):
    query: str
    country: str = "ALL"
    limit: int = 20


# ── Meta Ad Library API ──

@router.post("/search")
async def search_ads(req: SearchAdsRequest):
    """Search real ads from Meta Ad Library API."""
    if not META_ACCESS_TOKEN:
        raise HTTPException(
            400,
            "META_ACCESS_TOKEN not configured. Add it to .env to search real ads. "
            "Get one from https://developers.facebook.com/tools/explorer/"
        )

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            params = {
                "access_token": META_ACCESS_TOKEN,
                "search_terms": req.query,
                "ad_type": "ALL",
                "ad_reached_countries": [req.country] if req.country != "ALL" else ["US"],
                "fields": "id,ad_creative_bodies,ad_creative_link_titles,ad_creative_link_captions,ad_delivery_start_time,ad_delivery_stop_time,page_name,page_id,publisher_platforms,estimated_audience_size,ad_snapshot_url",
                "limit": req.limit,
                "ad_active_status": "ACTIVE",
            }
            resp = await client.get(
                "https://graph.facebook.com/v21.0/ads_archive",
                params=params,
            )

            if resp.status_code != 200:
                error_data = resp.json()
                error_msg = error_data.get("error", {}).get("message", "Unknown error")
                raise HTTPException(resp.status_code, f"Meta API error: {error_msg}")

            data = resp.json()
            ads = data.get("data", [])

            results = []
            for ad in ads:
                bodies = ad.get("ad_creative_bodies", [])
                titles = ad.get("ad_creative_link_titles", [])
                platforms = ad.get("publisher_platforms", [])

                results.append({
                    "id": ad.get("id", str(uuid.uuid4())),
                    "brand": ad.get("page_name", "Unknown"),
                    "page_id": ad.get("page_id", ""),
                    "headline": titles[0] if titles else "",
                    "body": bodies[0] if bodies else "",
                    "platforms": platforms,
                    "start_date": ad.get("ad_delivery_start_time", ""),
                    "end_date": ad.get("ad_delivery_stop_time", ""),
                    "snapshot_url": ad.get("ad_snapshot_url", ""),
                    "audience_size": ad.get("estimated_audience_size", {}),
                    "is_active": not ad.get("ad_delivery_stop_time"),
                })

            return {
                "ads": results,
                "total": len(results),
                "has_more": "paging" in data,
            }

    except httpx.HTTPError as e:
        raise HTTPException(500, f"Failed to fetch ads: {e}")


@router.get("/search/status")
async def search_status():
    """Check if Meta API is configured."""
    return {
        "configured": bool(META_ACCESS_TOKEN),
        "message": "Meta Ad Library API is ready" if META_ACCESS_TOKEN else "Add META_ACCESS_TOKEN to .env",
    }


# ── Ad Analysis ──

@router.post("/analyze")
async def analyze_ad(
    file: UploadFile = File(...),
    niche: str = "",
    target_audience: str = "",
):
    """Analyze a competitor ad image using AI vision."""
    file_id = str(uuid.uuid4())
    ext = file.filename.split(".")[-1] if file.filename else "png"
    input_path = os.path.join(UPLOAD_DIR, f"{file_id}.{ext}")
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    with open(input_path, "wb") as f:
        content = await file.read()
        f.write(content)

    image_uri = _image_to_data_uri(input_path)

    context = ""
    if niche:
        context += f" The ad is in the {niche} niche."
    if target_audience:
        context += f" Target audience: {target_audience}."

    try:
        result = await asyncio.to_thread(
            fal_sdk.run,
            "fal-ai/any-llm",
            arguments={
                "model": "google/gemini-2.5-flash",
                "prompt": (
                    f"You are an expert direct-response ad analyst.{context} "
                    f"Analyze this advertisement image and return a JSON with these exact fields:\n"
                    f'{{"hook": "the opening hook/headline visible in the ad", '
                    f'"painPoint": "what pain or problem it addresses", '
                    f'"emotionalTrigger": "fear/desire/curiosity/urgency/etc", '
                    f'"ctaType": "offer/discount/urgency/social proof/etc", '
                    f'"targetAudience": "who this ad targets", '
                    f'"visualStyle": "describe the visual style", '
                    f'"colorPalette": "main colors used", '
                    f'"whyItWorks": "2-3 sentences on why this ad is effective", '
                    f'"weaknesses": "1-2 sentences on potential weaknesses", '
                    f'"adCopy": "the text/copy visible in the ad"}}\n\n'
                    f"Return ONLY valid JSON, no markdown, no explanation."
                ),
                "image_url": image_uri,
            },
        )
        raw = result.get("output", "{}")
        try:
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start >= 0 and end > start:
                analysis = json.loads(raw[start:end])
            else:
                analysis = {"hook": raw, "visualStyle": "unknown"}
        except json.JSONDecodeError:
            analysis = {"hook": raw, "visualStyle": "unknown"}

    except Exception as e:
        raise HTTPException(500, f"Ad analysis failed: {e}")

    return {
        "id": file_id,
        "image_url": f"/files/tools/{file_id}.{ext}",
        "analysis": analysis,
    }


# ── Copy Generation ──

@router.post("/generate-copy")
async def generate_copy(req: GenerateCopyRequest):
    """Generate ad copy variations based on competitor analysis."""
    analysis_str = json.dumps(req.analysis, indent=2)

    tone_desc = {
        "aggressive": "aggressive, urgent, FOMO-inducing, direct-response style",
        "soft": "soft, empathetic, trust-building, lifestyle-focused",
        "humorous": "funny, witty, meme-worthy, attention-grabbing with humor",
        "educational": "informative, educational, authority-building, data-driven",
    }.get(req.tone, "professional")

    try:
        result = await asyncio.to_thread(
            fal_sdk.run,
            "fal-ai/any-llm",
            arguments={
                "model": "google/gemini-2.5-flash",
                "prompt": (
                    f"You are an expert direct-response copywriter. Based on this competitor ad analysis:\n\n"
                    f"{analysis_str}\n\n"
                    f"Generate 3 ad copy variations for:\n"
                    f"- Brand: {req.brand_name or 'a similar brand'}\n"
                    f"- Product/Niche: {req.product or 'same niche'}\n"
                    f"- Target Audience: {req.target_audience or 'same audience'}\n"
                    f"- Tone: {tone_desc}\n\n"
                    f"Return ONLY valid JSON array with 3 objects, each having:\n"
                    f'[{{"headline": "...", "body": "...", "cta": "..."}}]\n\n'
                    f"Make each variation distinctly different. Return ONLY the JSON array."
                ),
            },
        )
        raw = result.get("output", "[]")
        try:
            start = raw.find("[")
            end = raw.rfind("]") + 1
            if start >= 0 and end > start:
                copies = json.loads(raw[start:end])
            else:
                copies = []
        except json.JSONDecodeError:
            copies = []

    except Exception as e:
        raise HTTPException(500, f"Copy generation failed: {e}")

    return {"variations": copies}


# ── Image Variation Generation ──

@router.post("/generate")
async def generate_variations(
    req: GenerateVariationsRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User | None = Depends(get_current_user),
):
    job_id = str(uuid.uuid4())
    total_images = req.count * len(req.formats)
    if user and total_images > 0:
        spend_credits(user, total_images * CREDIT_COSTS["image"], f"Ad Genius: {total_images} variations", session)

    adgenius_jobs[job_id] = {"id": job_id, "status": "running", "total": total_images, "done": 0, "assets": []}
    background_tasks.add_task(_run_generation, job_id, req)
    return {"job_id": job_id, "status": "running"}


async def _run_generation(job_id: str, req: GenerateVariationsRequest):
    job_out = os.path.join(OUTPUT_DIR, f"adgenius_{job_id}")
    os.makedirs(job_out, exist_ok=True)

    ref_path = None
    for ext in ("png", "jpg", "jpeg", "webp"):
        p = os.path.join(UPLOAD_DIR, f"{req.product_image_id}.{ext}")
        if os.path.exists(p):
            ref_path = p
            break

    if not ref_path:
        adgenius_jobs[job_id]["status"] = "failed"
        return

    base_prompt = req.analysis
    context_parts = []
    if req.niche:
        context_parts.append(f"{req.niche} advertisement")
    if req.target_audience:
        context_parts.append(f"targeting {req.target_audience}")
    if req.brand_colors:
        context_parts.append(f"using brand colors {req.brand_colors}")
    context_parts.append("professional advertising, commercial photography, high quality")

    variations = [
        f"{base_prompt}, {', '.join(context_parts)}, fresh creative angle",
        f"{base_prompt}, {', '.join(context_parts)}, bold eye-catching version",
        f"{base_prompt}, {', '.join(context_parts)}, minimal clean version",
        f"{base_prompt}, {', '.join(context_parts)}, premium luxury feel",
        f"{base_prompt}, {', '.join(context_parts)}, vibrant energetic version",
        f"{base_prompt}, {', '.join(context_parts)}, emotional storytelling version",
    ]

    try:
        for fmt in req.formats:
            fmt_slug = fmt.replace(":", "x")
            for i in range(req.count):
                prompt = variations[i % len(variations)]
                seed = (i + 1) * 1000 + hash(prompt) % 10000
                img_path = os.path.join(job_out, f"ad_{i+1:02d}_{fmt_slug}.png")
                try:
                    await fal.generate_image(ref_path, prompt, fmt, seed, img_path, req.model)
                    adgenius_jobs[job_id]["assets"].append({
                        "url": f"/files/adgenius_{job_id}/ad_{i+1:02d}_{fmt_slug}.png",
                        "format": fmt, "variant": i + 1,
                    })
                except Exception as e:
                    print(f"Ad Genius variant {i+1} failed: {e}")
                adgenius_jobs[job_id]["done"] += 1
        adgenius_jobs[job_id]["status"] = "done"
    except Exception as e:
        adgenius_jobs[job_id]["status"] = "failed"


@router.get("/status/{job_id}")
async def get_status(job_id: str):
    job = adgenius_jobs.get(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job
