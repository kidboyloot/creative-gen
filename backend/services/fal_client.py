import os
import fal_client
import asyncio
import base64
from pathlib import Path

FAL_KEY = os.getenv("FAL_KEY", "")

DIMENSIONS = {
    "1:1":  (1080, 1080),
    "9:16": (1080, 1920),
    "16:9": (1920, 1080),
    "4:3":  (1440, 1080),
    "3:4":  (1080, 1440),
    "21:9": (2520, 1080),
    "9:21": (1080, 2520),
    "2:3":  (1080, 1620),
    "3:2":  (1620, 1080),
    "5:4":  (1350, 1080),
    "4:5":  (1080, 1350),
    "5:6":  (1080, 1296),
    "6:5":  (1296, 1080),
    "1:2":  (1080, 2160),
    "2:1":  (2160, 1080),
}

# Model registry: id → fal endpoint + default args builder
MODELS = {
    "flux-dev": {
        "label": "Flux Dev",
        "endpoint": "fal-ai/flux/dev/image-to-image",
        "description": "High quality, slower. Best for final creatives.",
    },
    "flux-schnell": {
        "label": "Flux Schnell",
        "endpoint": "fal-ai/flux/schnell/image-to-image",
        "description": "Fast & cheap. Great for previews and iteration.",
    },
    "flux-pro": {
        "label": "Flux Pro",
        "endpoint": "fal-ai/flux-pro/v1.1/redux",
        "description": "Highest quality. Best prompt adherence, premium cost.",
    },
    "sd3": {
        "label": "Stable Diffusion 3",
        "endpoint": "fal-ai/stable-diffusion-v3-medium/image-to-image",
        "description": "SD3 Medium img2img. Strong creative style transfer.",
    },
    "nano-banana": {
        "label": "Nano Banana Pro",
        "endpoint": "fal-ai/nano-banana-pro/edit",
        "description": "Nano Banana Pro edit — great for precise image editing with a prompt.",
    },
    "flux-realism": {
        "label": "Flux Realism",
        "endpoint": "fal-ai/flux-realism",
        "description": "Photorealistic images. Best for product photography & lifestyle shots.",
    },
    "recraft-v3": {
        "label": "Recraft V3",
        "endpoint": "fal-ai/recraft-v3",
        "description": "Excellent for branding, logos, and product design with clean aesthetics.",
    },
    "ideogram": {
        "label": "Ideogram V2",
        "endpoint": "fal-ai/ideogram/v2/turbo",
        "description": "Great at rendering text in images — perfect for ad creatives & banners.",
    },
    "flux-jewellery": {
        "label": "Jewellery",
        "endpoint": "fal-ai/flux/dev/image-to-image",
        "description": "Optimized for jewellery — rings, necklaces, bracelets with studio lighting.",
    },
    "flux-pro-ultra": {
        "label": "Flux Pro 1.1 Ultra",
        "endpoint": "fal-ai/flux-pro/v1.1-ultra",
        "description": "Highest fidelity Flux Pro Ultra — top-tier quality for hero shots.",
    },
    "flux-lora": {
        "label": "Flux Dev LoRA",
        "endpoint": "fal-ai/flux-lora",
        "description": "Flux Dev with custom LoRA support — great for stylized branded looks.",
    },
    "fast-sdxl": {
        "label": "Fast SDXL",
        "endpoint": "fal-ai/fast-sdxl",
        "description": "Quick SDXL generation — versatile, low-cost iteration.",
    },
    "aura-flow": {
        "label": "AuraFlow",
        "endpoint": "fal-ai/aura-flow",
        "description": "Open-source flow-based model — strong on creative compositions.",
    },
    "stable-cascade": {
        "label": "Stable Cascade",
        "endpoint": "fal-ai/stable-cascade",
        "description": "Stable Cascade — great prompt adherence at high resolution.",
    },
    "nano-banana": {
        "label": "Nano Banana",
        "endpoint": "fal-ai/nano-banana/edit",
        "description": "Lightweight image editor — fast precise edits with a prompt.",
    },
    "flux-pulid": {
        "label": "Flux PuLID",
        "endpoint": "fal-ai/flux-pulid",
        "description": "Identity-preserving Flux — keep faces consistent across generations.",
    },
    "hidream-i1-fast": {
        "label": "HiDream i1 Fast",
        "endpoint": "fal-ai/hidream-i1-fast",
        "description": "Fast HiDream variant — quick concept iteration.",
    },
    "hidream-i1-dev": {
        "label": "HiDream i1 Dev",
        "endpoint": "fal-ai/hidream-i1-dev",
        "description": "Balanced HiDream — open-source competitor to Flux Dev.",
    },
    "hidream-i1-full": {
        "label": "HiDream i1 Full",
        "endpoint": "fal-ai/hidream-i1-full",
        "description": "Full HiDream — highest quality of the HiDream family.",
    },
    "qwen-image": {
        "label": "Qwen Image",
        "endpoint": "fal-ai/qwen-image",
        "description": "Alibaba Qwen — strong text rendering and Asian aesthetics.",
    },
    "imagen4": {
        "label": "Google Imagen 4",
        "endpoint": "fal-ai/imagen4/preview",
        "description": "Google Imagen 4 — top-tier photoreal quality.",
    },
    "imagen4-fast": {
        "label": "Imagen 4 Fast",
        "endpoint": "fal-ai/imagen4/preview/fast",
        "description": "Fast Imagen 4 — quicker iterations at slightly lower fidelity.",
    },
    "imagen4-ultra": {
        "label": "Imagen 4 Ultra",
        "endpoint": "fal-ai/imagen4/preview/ultra",
        "description": "Imagen 4 Ultra — premium tier of Google's Imagen line.",
    },
    "seedream-v3": {
        "label": "ByteDance Seedream v3",
        "endpoint": "fal-ai/bytedance/seedream/v3/text-to-image",
        "description": "ByteDance Seedream v3 — strong style adherence and detail.",
    },
    "seedream-v4": {
        "label": "ByteDance Seedream v4",
        "endpoint": "fal-ai/bytedance/seedream/v4/text-to-image",
        "description": "ByteDance Seedream v4 — latest from the Seedream family.",
    },
    "kontext-pro": {
        "label": "Flux Kontext Pro",
        "endpoint": "fal-ai/flux-pro/kontext",
        "description": "Flux Kontext Pro — context-aware multi-image generation.",
    },
    "kontext-max": {
        "label": "Flux Kontext Max",
        "endpoint": "fal-ai/flux-pro/kontext/max",
        "description": "Flux Kontext Max — maximum quality tier of the Kontext line.",
    },
    "minimax-image": {
        "label": "MiniMax Image 01",
        "endpoint": "fal-ai/minimax/image-01",
        "description": "MiniMax Image 01 — vivid colors, great for editorial shots.",
    },
}


def get_models():
    """Return all t2i + i2i models from the catalog, augmented with fal.ai readiness."""
    from services.model_catalog import MODEL_CATALOG
    from services.muapi_client import is_muapi_configured

    fal_t2i_ids = set(MODELS.keys())
    out = []

    # First: prefer the curated MODELS dict (these have fal.ai endpoints + descriptions)
    seen = set()
    for k, v in MODELS.items():
        out.append({
            "id": k,
            "label": v["label"],
            "description": v["description"],
            "aspect_ratios": [],
            "resolutions": [],
            "ready": True,
            "provider": "fal.ai",
        })
        seen.add(k)

    # Then: augment with the rest of the catalog (t2i + i2i)
    muapi_ready = is_muapi_configured()
    for cat in ("t2i", "i2i"):
        for m in MODEL_CATALOG.get(cat, []):
            if m["id"] in seen:
                continue
            ready = muapi_ready  # only "ready" if muapi is configured
            out.append({
                "id": m["id"],
                "label": m["label"],
                "description": "" if ready else "Requires muapi.ai integration",
                "aspect_ratios": m.get("aspect_ratios", []),
                "resolutions": m.get("resolutions", []),
                "ready": ready,
                "provider": "muapi.ai" if ready else "muapi.ai (configure MUAPI_KEY)",
            })
            seen.add(m["id"])

    return out


def _image_to_data_uri(image_path: str) -> str:
    with open(image_path, "rb") as f:
        data = base64.b64encode(f.read()).decode()
    ext = Path(image_path).suffix.lstrip(".").lower()
    mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
    return f"data:{mime};base64,{data}"


def _build_args(model_id: str, image_uri: str, prompt: str, seed: int, w: int, h: int) -> dict:
    if model_id == "flux-pro":
        return {
            "image_url": image_uri,
            "prompt": prompt,
            "seed": seed,
            "image_size": {"width": w, "height": h},
            "num_images": 1,
        }
    elif model_id == "flux-schnell":
        return {
            "image_url": image_uri,
            "prompt": prompt,
            "seed": seed,
            "num_inference_steps": 4,
            "strength": 0.85,
            "image_size": {"width": w, "height": h},
            "num_images": 1,
        }
    elif model_id == "sd3":
        return {
            "image_url": image_uri,
            "prompt": prompt,
            "seed": seed,
            "num_inference_steps": 28,
            "strength": 0.75,
            "image_size": {"width": w, "height": h},
            "num_images": 1,
        }
    elif model_id == "flux-realism":
        return {
            "image_url": image_uri,
            "prompt": prompt,
            "seed": seed,
            "num_inference_steps": 28,
            "strength": 0.75,
            "image_size": {"width": w, "height": h},
            "num_images": 1,
            "enable_safety_checker": False,
        }
    elif model_id == "recraft-v3":
        return {
            "image_url": image_uri,
            "prompt": prompt,
            "seed": seed,
            "image_size": {"width": w, "height": h},
            "num_images": 1,
        }
    elif model_id == "ideogram":
        return {
            "image_url": image_uri,
            "prompt": prompt,
            "seed": seed,
            "image_size": {"width": w, "height": h},
            "num_images": 1,
        }
    elif model_id == "flux-jewellery":
        jewellery_boost = ", professional jewellery photography, studio lighting, macro lens, clean white background, luxury product shot, sharp details, reflective surfaces, elegant"
        return {
            "image_url": image_uri,
            "prompt": prompt + jewellery_boost,
            "seed": seed,
            "num_inference_steps": 32,
            "strength": 0.70,
            "image_size": {"width": w, "height": h},
            "num_images": 1,
        }
    else:  # flux-dev (default)
        return {
            "image_url": image_uri,
            "prompt": prompt,
            "seed": seed,
            "num_inference_steps": 28,
            "strength": 0.75,
            "image_size": {"width": w, "height": h},
            "num_images": 1,
        }


async def generate_image(
    reference_path: str,
    prompt: str,
    fmt: str,
    seed: int,
    output_path: str,
    model_id: str = "flux-dev",
) -> str:
    w, h = DIMENSIONS[fmt]
    endpoint = MODELS.get(model_id, MODELS["flux-dev"])["endpoint"]

    if model_id == "nano-banana":
        # nano-banana takes image_urls (array) and needs a real hosted URL
        hosted_url = await asyncio.to_thread(fal_client.upload_file, reference_path)
        args = {
            "prompt": prompt,
            "image_urls": [hosted_url],
        }
    else:
        image_uri = _image_to_data_uri(reference_path)
        args = _build_args(model_id, image_uri, prompt, seed, w, h)

    result = await asyncio.to_thread(fal_client.run, endpoint, arguments=args)

    img_url = result["images"][0]["url"]
    await _download_file(img_url, output_path)
    return output_path


async def generate_image_from_text(
    prompt: str,
    fmt: str,
    seed: int,
    output_path: str,
    model_id: str = "flux-dev",
) -> str:
    """Generate image from text only (no reference image)."""
    w, h = DIMENSIONS.get(fmt, (1080, 1080))

    # Text-to-image endpoints (not img2img)
    txt2img_endpoints = {
        "flux-dev": "fal-ai/flux/dev",
        "flux-schnell": "fal-ai/flux/schnell",
        "flux-pro": "fal-ai/flux-pro/v1.1",
        "flux-pro-ultra": "fal-ai/flux-pro/v1.1-ultra",
        "flux-lora": "fal-ai/flux-lora",
        "flux-realism": "fal-ai/flux-realism",
        "recraft-v3": "fal-ai/recraft-v3",
        "ideogram": "fal-ai/ideogram/v2/turbo",
        "fast-sdxl": "fal-ai/fast-sdxl",
        "aura-flow": "fal-ai/aura-flow",
        "stable-cascade": "fal-ai/stable-cascade",
        "sd3": "fal-ai/stable-diffusion-v3-medium",
        "flux-pulid": "fal-ai/flux-pulid",
        "hidream-i1-fast": "fal-ai/hidream-i1-fast",
        "hidream-i1-dev": "fal-ai/hidream-i1-dev",
        "hidream-i1-full": "fal-ai/hidream-i1-full",
        "qwen-image": "fal-ai/qwen-image",
        "imagen4": "fal-ai/imagen4/preview",
        "imagen4-fast": "fal-ai/imagen4/preview/fast",
        "imagen4-ultra": "fal-ai/imagen4/preview/ultra",
        "seedream-v3": "fal-ai/bytedance/seedream/v3/text-to-image",
        "seedream-v4": "fal-ai/bytedance/seedream/v4/text-to-image",
        "kontext-pro": "fal-ai/flux-pro/kontext/text-to-image",
        "kontext-max": "fal-ai/flux-pro/kontext/max/text-to-image",
        "minimax-image": "fal-ai/minimax/image-01",
        "nano-banana": "fal-ai/nano-banana",
    }
    endpoint = txt2img_endpoints.get(model_id)

    args = {
        "prompt": prompt,
        "seed": seed,
        "image_size": {"width": w, "height": h},
        "num_images": 1,
    }

    if model_id == "flux-dev":
        args["num_inference_steps"] = 28
    elif model_id == "flux-schnell":
        args["num_inference_steps"] = 4

    if endpoint:
        # Direct fal.ai call
        result = await asyncio.to_thread(fal_client.run, endpoint, arguments=args)
        img_url = result["images"][0]["url"]
    else:
        # Catalog model — route via muapi.ai
        from services.muapi_client import muapi_run, extract_url, is_muapi_configured
        from services.model_catalog import MODEL_CATALOG
        if not is_muapi_configured():
            raise RuntimeError(
                f"Model '{model_id}' has no fal.ai endpoint. Set MUAPI_KEY in backend/.env to use muapi.ai models."
            )
        catalog_entry = next(
            (m for cat in ("t2i", "i2i") for m in MODEL_CATALOG.get(cat, []) if m["id"] == model_id),
            None,
        )
        if not catalog_entry:
            raise RuntimeError(f"Unknown model: {model_id}")
        muapi_payload = {"prompt": prompt}
        if catalog_entry.get("aspect_ratios") and fmt in catalog_entry["aspect_ratios"]:
            muapi_payload["aspect_ratio"] = fmt
        if catalog_entry.get("resolutions"):
            muapi_payload["resolution"] = catalog_entry["resolution_default"] or catalog_entry["resolutions"][0]
        result = await muapi_run(catalog_entry["endpoint"], muapi_payload)
        img_url = extract_url(result)
        if not img_url:
            raise RuntimeError(f"muapi response missing image URL: {result}")

    await _download_file(img_url, output_path)
    return output_path


VIDEO_MODELS = {
    "kling-v1.6": {
        "label": "Kling v1.6",
        "endpoint": "fal-ai/kling-video/v1.6/standard/image-to-video",
        "description": "High quality cinematic motion. Best overall.",
        "supports_prompt": True,
    },
    "kling-v3": {
        "label": "Kling 3.0",
        "endpoint": "fal-ai/kling-video/v3.0/standard/image-to-video",
        "description": "Latest Kling — sharper motion, better prompt adherence.",
        "supports_prompt": True,
    },
    "sora": {
        "label": "Sora",
        "endpoint": "fal-ai/sora",
        "description": "OpenAI Sora — highly realistic, fluid video generation.",
        "supports_prompt": True,
    },
    "sora-2": {
        "label": "Sora 2",
        "endpoint": "fal-ai/sora-v2",
        "description": "OpenAI Sora 2 — improved realism, longer clips, better physics.",
        "supports_prompt": True,
    },
    "veo3": {
        "label": "Veo 3.1",
        "endpoint": "fal-ai/google/veo3",
        "description": "Google Veo 3.1 — state-of-the-art cinematic video quality.",
        "supports_prompt": True,
    },
    "seedance-2": {
        "label": "Seedance 2.0",
        "endpoint": "bytedance/seedance-2.0/image-to-video",
        "description": "ByteDance Seedance 2.0 — fast, high-quality image-to-video.",
        "supports_prompt": True,
    },
    "svd": {
        "label": "Stable Video Diffusion",
        "endpoint": "fal-ai/stable-video-diffusion",
        "description": "Smooth natural animation from any image.",
        "supports_prompt": False,
    },
    "minimax": {
        "label": "MiniMax Video",
        "endpoint": "fal-ai/minimax-video/image-to-video",
        "description": "Creative motion with strong prompt following.",
        "supports_prompt": True,
    },
    "luma": {
        "label": "Luma Dream Machine",
        "endpoint": "fal-ai/luma-dream-machine/image-to-video",
        "description": "Cinematic, photorealistic video generation.",
        "supports_prompt": True,
    },
    "hunyuan-video": {
        "label": "Hunyuan Video",
        "endpoint": "fal-ai/hunyuan-video",
        "description": "Tencent Hunyuan — strong motion realism with prompt control.",
        "supports_prompt": True,
    },
    "pika": {
        "label": "Pika 1.5",
        "endpoint": "fal-ai/pika/v1.5/pikascenes",
        "description": "Pika v1.5 — creative scene-driven video clips.",
        "supports_prompt": True,
    },
    "wan-t2v": {
        "label": "Wan 2.1 T2V",
        "endpoint": "fal-ai/wan-t2v",
        "description": "Wan 2.1 — text-to-video with strong character consistency.",
        "supports_prompt": True,
    },
    "cogvideox-5b": {
        "label": "CogVideoX 5B",
        "endpoint": "fal-ai/cogvideox-5b",
        "description": "Open-source CogVideoX 5B — fast iteration, decent quality.",
        "supports_prompt": True,
    },
    "kling-v2.1-master": {
        "label": "Kling 2.1 Master",
        "endpoint": "fal-ai/kling-video/v2.1/master/image-to-video",
        "description": "Kling 2.1 Master — top-quality cinematic motion.",
        "supports_prompt": True,
    },
    "kling-v2.1-pro": {
        "label": "Kling 2.1 Pro",
        "endpoint": "fal-ai/kling-video/v2.1/pro/image-to-video",
        "description": "Kling 2.1 Pro — premium tier, faster than master.",
        "supports_prompt": True,
    },
    "kling-v2.1-standard": {
        "label": "Kling 2.1 Standard",
        "endpoint": "fal-ai/kling-video/v2.1/standard/image-to-video",
        "description": "Kling 2.1 Standard — solid quality, balanced cost.",
        "supports_prompt": True,
    },
    "kling-v2.5-turbo-pro": {
        "label": "Kling 2.5 Turbo Pro",
        "endpoint": "fal-ai/kling-video/v2.5-turbo/pro/image-to-video",
        "description": "Kling 2.5 Turbo Pro — newer, faster pro tier.",
        "supports_prompt": True,
    },
    "veo3-fast": {
        "label": "Veo 3 Fast",
        "endpoint": "fal-ai/veo3/fast/image-to-video",
        "description": "Google Veo 3 Fast — quicker iteration of Veo 3.",
        "supports_prompt": True,
    },
    "wan-i2v": {
        "label": "Wan 2.1 i2v",
        "endpoint": "fal-ai/wan-i2v",
        "description": "Wan 2.1 image-to-video — strong character consistency.",
        "supports_prompt": True,
    },
    "pixverse-v5": {
        "label": "Pixverse v5",
        "endpoint": "fal-ai/pixverse/v5/image-to-video",
        "description": "Pixverse v5 — creative motion templates and effects.",
        "supports_prompt": True,
    },
    "minimax-hailuo-02-pro": {
        "label": "MiniMax Hailuo 02 Pro",
        "endpoint": "fal-ai/minimax/hailuo-02/pro/image-to-video",
        "description": "MiniMax Hailuo 02 Pro — strong physics and realism.",
        "supports_prompt": True,
    },
    "ltx-2-pro": {
        "label": "LTX 2 Pro",
        "endpoint": "fal-ai/ltx-video-2/pro/image-to-video",
        "description": "LTX 2 Pro — fast video gen with prompt control.",
        "supports_prompt": True,
    },
    "vidu-q1": {
        "label": "Vidu Q1",
        "endpoint": "fal-ai/vidu/q1/image-to-video",
        "description": "Vidu Q1 — cinematic clips with reference image support.",
        "supports_prompt": True,
    },
}


def get_video_models():
    """Return the curated fal.ai video list + the rest of the catalog (t2v + i2v)."""
    from services.model_catalog import MODEL_CATALOG
    from services.muapi_client import is_muapi_configured

    out = []
    seen = set()
    for k, v in VIDEO_MODELS.items():
        out.append({
            "id": k,
            "label": v["label"],
            "description": v["description"],
            "supports_prompt": v["supports_prompt"],
            "aspect_ratios": [],
            "resolutions": [],
            "durations": [],
            "ready": True,
            "provider": "fal.ai",
        })
        seen.add(k)

    muapi_ready = is_muapi_configured()
    for cat in ("t2v", "i2v"):
        for m in MODEL_CATALOG.get(cat, []):
            if m["id"] in seen:
                continue
            out.append({
                "id": m["id"],
                "label": m["label"],
                "description": "" if muapi_ready else "Requires muapi.ai integration",
                "supports_prompt": True,
                "aspect_ratios": m.get("aspect_ratios", []),
                "resolutions": m.get("resolutions", []),
                "durations": m.get("durations", []),
                "ready": muapi_ready,
                "provider": "muapi.ai" if muapi_ready else "muapi.ai (configure MUAPI_KEY)",
            })
            seen.add(m["id"])

    return out


async def generate_video_from_image(
    reference_path: str,
    prompt: str,
    model_id: str,
    output_path: str,
    resolution: str = "720p",
    duration: str = "auto",
    aspect_ratio: str = "9:16",
    generate_audio: bool = True,
) -> str:
    """Generate a video directly from a reference image."""
    model = VIDEO_MODELS.get(model_id)
    if not model:
        # Catalog-only model — route via muapi.ai
        from services.muapi_client import muapi_run, muapi_upload, extract_url, is_muapi_configured
        from services.model_catalog import MODEL_CATALOG
        if not is_muapi_configured():
            raise RuntimeError(
                f"Video model '{model_id}' has no fal.ai endpoint. Set MUAPI_KEY in backend/.env to use muapi.ai models."
            )
        catalog_entry = next(
            (m for cat in ("t2v", "i2v") for m in MODEL_CATALOG.get(cat, []) if m["id"] == model_id),
            None,
        )
        if not catalog_entry:
            raise RuntimeError(f"Unknown video model: {model_id}")
        image_url = await muapi_upload(reference_path)
        muapi_payload = {
            "image_url": image_url,
            "prompt": prompt or "smooth cinematic motion",
        }
        if catalog_entry.get("aspect_ratios") and aspect_ratio in catalog_entry["aspect_ratios"]:
            muapi_payload["aspect_ratio"] = aspect_ratio
        if catalog_entry.get("resolutions") and resolution in catalog_entry["resolutions"]:
            muapi_payload["resolution"] = resolution
        if duration and duration != "auto":
            muapi_payload["duration"] = duration
        result = await muapi_run(catalog_entry["endpoint"], muapi_payload)
        video_url = extract_url(result)
        if not video_url:
            raise RuntimeError(f"muapi response missing video URL: {result}")
        await _download_file(video_url, output_path)
        return output_path

    endpoint = model["endpoint"]
    image_uri = _image_to_data_uri(reference_path)

    if model_id == "svd":
        args = {"image_url": image_uri, "motion_bucket_id": 127, "cond_aug": 0.02, "fps": 24, "num_frames": 25}
    elif model_id in ("kling-v1.6", "kling-v3"):
        dur = duration if duration != "auto" else "5"
        args = {"image_url": image_uri, "prompt": prompt or "smooth cinematic motion", "duration": dur}
    elif model_id == "seedance-2":
        args = {
            "image_url": image_uri,
            "prompt": prompt or "smooth cinematic motion",
            "resolution": resolution,
            "aspect_ratio": aspect_ratio,
            "generate_audio": generate_audio,
        }
        if duration != "auto":
            args["duration"] = int(duration)
    elif model_id in ("sora", "sora-2"):
        args = {"image_url": image_uri, "prompt": prompt or "smooth cinematic motion"}
    elif model_id == "veo3":
        args = {"image_url": image_uri, "prompt": prompt or "cinematic motion"}
    elif model_id == "minimax":
        args = {"image_url": image_uri, "prompt": prompt or "smooth motion"}
    elif model_id == "luma":
        args = {"image_url": image_uri, "prompt": prompt or "cinematic motion"}
    elif model_id.startswith("kling-v2") or model_id.startswith("kling-v3"):
        dur = duration if duration != "auto" else "5"
        args = {"image_url": image_uri, "prompt": prompt or "smooth cinematic motion", "duration": dur}
    elif model_id == "veo3-fast":
        args = {"image_url": image_uri, "prompt": prompt or "cinematic motion"}
    elif model_id == "wan-i2v":
        args = {"image_url": image_uri, "prompt": prompt or "smooth motion", "resolution": resolution}
    elif model_id.startswith("pixverse"):
        args = {"image_url": image_uri, "prompt": prompt or "smooth motion", "resolution": resolution, "aspect_ratio": aspect_ratio}
    elif model_id.startswith("minimax-hailuo"):
        args = {"image_url": image_uri, "prompt": prompt or "smooth motion"}
    elif model_id.startswith("ltx-2"):
        args = {"image_url": image_uri, "prompt": prompt or "smooth motion"}
    elif model_id.startswith("vidu"):
        args = {"image_url": image_uri, "prompt": prompt or "smooth motion"}
    elif model_id == "hunyuan-video":
        args = {"image_url": image_uri, "prompt": prompt or "smooth motion"}
    elif model_id == "pika":
        args = {"image_url": image_uri, "prompt_text": prompt or "smooth motion"}
    elif model_id == "wan-t2v":
        args = {"image_url": image_uri, "prompt": prompt or "smooth motion"}
    elif model_id == "cogvideox-5b":
        args = {"image_url": image_uri, "prompt": prompt or "smooth motion"}
    else:
        args = {"image_url": image_uri, "prompt": prompt or "smooth motion"}

    result = await asyncio.to_thread(fal_client.run, endpoint, arguments=args)

    # Different models return the video URL under different keys
    if "video" in result:
        video_url = result["video"]["url"] if isinstance(result["video"], dict) else result["video"]
    elif "video_url" in result:
        video_url = result["video_url"]
    elif "output" in result:
        video_url = result["output"] if isinstance(result["output"], str) else result["output"][0]
    else:
        raise ValueError(f"Cannot find video URL in result keys: {list(result.keys())}")

    await _download_file(video_url, output_path)
    return output_path


async def upscale_image(image_path: str, output_path: str) -> str:
    """Upscale an image 4× using AuraSR."""
    image_uri = _image_to_data_uri(image_path)
    result = await asyncio.to_thread(
        fal_client.run,
        "fal-ai/aura-sr",
        arguments={"image_url": image_uri, "upscaling_factor": 4},
    )
    img_url = result["image"]["url"]
    await _download_file(img_url, output_path)
    return output_path


async def enhance_prompt(prompt: str) -> str:
    """Expand and improve a prompt using an LLM."""
    result = await asyncio.to_thread(
        fal_client.run,
        "fal-ai/any-llm",
        arguments={
            "model": "google/gemini-2.5-flash",
            "prompt": (
                f"You are a creative AI image prompt specialist. "
                f"Improve this prompt to be more vivid, detailed, and effective for AI image generation. "
                f"Return ONLY the improved prompt, no explanations.\n\nPrompt: {prompt}"
            ),
        },
    )
    return result.get("output", prompt)


async def generate_video(
    image_path: str,
    output_path: str,
    fmt: str,
) -> str:
    image_uri = _image_to_data_uri(image_path)

    result = await asyncio.to_thread(
        fal_client.run,
        "fal-ai/stable-video-diffusion",
        arguments={
            "image_url": image_uri,
            "motion_bucket_id": 127,
            "cond_aug": 0.02,
            "fps": 24,
            "num_frames": 25,
        },
    )

    video_url = result["video"]["url"]
    await _download_file(video_url, output_path)
    return output_path


LIPSYNC_MODELS = {
    "sync-1.6": {
        "label": "Sync Labs 1.6",
        "endpoint": "fal-ai/sync-lipsync",
        "description": "High-quality lip sync. Works on portraits and videos.",
        "supports": ["image", "video"],
        "resolutions": ["480p", "720p"],
    },
    "sync-2.0": {
        "label": "Sync Labs 2.0",
        "endpoint": "fal-ai/sync-lipsync/v2",
        "description": "Latest sync model — better mouth shape & expression matching.",
        "supports": ["image", "video"],
        "resolutions": ["480p", "720p", "1080p"],
    },
    "kling-lipsync": {
        "label": "Kling Lip Sync",
        "endpoint": "fal-ai/kling-video/lipsync",
        "description": "Kling-powered lip sync — animates a still portrait into a talking video.",
        "supports": ["image"],
        "resolutions": ["720p"],
    },
}


def get_lipsync_models(input_mode: str = "image"):
    from services.model_catalog import MODEL_CATALOG
    from services.muapi_client import is_muapi_configured

    out = []
    seen = set()
    for k, v in LIPSYNC_MODELS.items():
        if input_mode not in v["supports"]:
            continue
        out.append({
            "id": k,
            "label": v["label"],
            "description": v["description"],
            "supports": v["supports"],
            "resolutions": v.get("resolutions", ["720p"]),
            "ready": True,
            "provider": "fal.ai",
        })
        seen.add(k)

    muapi_ready = is_muapi_configured()
    for m in MODEL_CATALOG.get("lipsync", []):
        if m["id"] in seen:
            continue
        # Heuristic: id contains 'image' = supports image input; 'video' = video; else both
        mid = m["id"].lower()
        if "image" in mid and input_mode != "image":
            continue
        if "video" in mid and "image" not in mid and input_mode != "video":
            continue
        out.append({
            "id": m["id"],
            "label": m["label"],
            "description": "" if muapi_ready else "Requires muapi.ai integration",
            "supports": [input_mode],
            "resolutions": m.get("resolutions") or ["720p"],
            "ready": muapi_ready,
            "provider": "muapi.ai" if muapi_ready else "muapi.ai (configure MUAPI_KEY)",
        })
        seen.add(m["id"])
    return out


async def generate_lipsync(
    media_path: str,
    audio_path: str,
    output_path: str,
    model_id: str,
    input_mode: str,
    resolution: str = "720p",
) -> str:
    """Lip-sync a portrait image OR a video to an audio track.

    `input_mode` is 'image' or 'video'. The fal.ai sync model accepts the same
    `video_url` field for both — we just upload the file & pass the URL.
    """
    model = LIPSYNC_MODELS.get(model_id)
    if not model:
        # Catalog-only — route via muapi.ai
        from services.muapi_client import muapi_run, muapi_upload, extract_url, is_muapi_configured
        from services.model_catalog import MODEL_CATALOG
        if not is_muapi_configured():
            raise RuntimeError(
                f"Lipsync model '{model_id}' has no fal.ai endpoint. Set MUAPI_KEY in backend/.env."
            )
        catalog_entry = next(
            (m for m in MODEL_CATALOG.get("lipsync", []) if m["id"] == model_id),
            None,
        )
        if not catalog_entry:
            raise RuntimeError(f"Unknown lipsync model: {model_id}")
        media_url = await muapi_upload(media_path)
        audio_url = await muapi_upload(audio_path)
        muapi_payload = {
            ("image_url" if input_mode == "image" else "video_url"): media_url,
            "audio_url": audio_url,
        }
        if catalog_entry.get("resolutions") and resolution in catalog_entry["resolutions"]:
            muapi_payload["resolution"] = resolution
        result = await muapi_run(catalog_entry["endpoint"], muapi_payload)
        video_url = extract_url(result)
        if not video_url:
            raise RuntimeError(f"muapi response missing video URL: {result}")
        await _download_file(video_url, output_path)
        return output_path

    endpoint = model["endpoint"]

    media_url = await asyncio.to_thread(fal_client.upload_file, media_path)
    audio_url = await asyncio.to_thread(fal_client.upload_file, audio_path)

    if model_id == "kling-lipsync":
        args = {"input_image_url": media_url, "audio_url": audio_url}
    else:
        # sync-1.6 / sync-2.0 take video_url for both portrait & video inputs
        args = {"video_url": media_url, "audio_url": audio_url, "resolution": resolution}

    result = await asyncio.to_thread(fal_client.run, endpoint, arguments=args)

    if "video" in result:
        video_url = result["video"]["url"] if isinstance(result["video"], dict) else result["video"]
    elif "video_url" in result:
        video_url = result["video_url"]
    elif "output" in result:
        video_url = result["output"] if isinstance(result["output"], str) else result["output"][0]
    else:
        raise ValueError(f"Cannot find video URL in lipsync result keys: {list(result.keys())}")

    await _download_file(video_url, output_path)
    return output_path


# ── Cinema (nano-banana-pro with cinematic prompt augmentation) ──
async def generate_cinema_image(
    prompt: str,
    aspect_ratio: str,
    resolution: str,
    output_path: str,
) -> str:
    """Cinema generates a single still using nano-banana-pro with the camera-augmented prompt."""
    args = {
        "prompt": prompt,
        "aspect_ratio": aspect_ratio,
        "resolution": resolution.lower(),
        "negative_prompt": "blurry, low quality, distortion, bad composition",
    }
    result = await asyncio.to_thread(
        fal_client.run,
        "fal-ai/nano-banana-pro",
        arguments=args,
    )
    img_url = result["images"][0]["url"]
    await _download_file(img_url, output_path)
    return output_path


async def remove_background(image_path: str, output_path: str) -> str:
    """Remove background from an image using BiRefNet."""
    image_uri = _image_to_data_uri(image_path)
    result = await asyncio.to_thread(
        fal_client.run,
        "fal-ai/birefnet",
        arguments={"image_url": image_uri},
    )
    img_url = result["image"]["url"]
    await _download_file(img_url, output_path)
    return output_path


async def _download_file(url: str, dest: str):
    import httpx
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.get(url)
        r.raise_for_status()
        with open(dest, "wb") as f:
            f.write(r.content)
