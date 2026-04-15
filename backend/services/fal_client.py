import os
import fal_client
import asyncio
import base64
from pathlib import Path

FAL_KEY = os.getenv("FAL_KEY", "")

DIMENSIONS = {
    "1:1": (1080, 1080),
    "9:16": (1080, 1920),
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
}


def get_models():
    return [
        {"id": k, "label": v["label"], "description": v["description"]}
        for k, v in MODELS.items()
    ]


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
        "flux-realism": "fal-ai/flux-realism",
        "recraft-v3": "fal-ai/recraft-v3",
        "ideogram": "fal-ai/ideogram/v2/turbo",
    }
    endpoint = txt2img_endpoints.get(model_id, "fal-ai/flux/dev")

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

    result = await asyncio.to_thread(fal_client.run, endpoint, arguments=args)
    img_url = result["images"][0]["url"]
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
}


def get_video_models():
    return [
        {
            "id": k,
            "label": v["label"],
            "description": v["description"],
            "supports_prompt": v["supports_prompt"],
        }
        for k, v in VIDEO_MODELS.items()
    ]


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
    model = VIDEO_MODELS.get(model_id, VIDEO_MODELS["seedance-2"])
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
