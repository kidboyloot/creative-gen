import os
import uuid
import asyncio
import edge_tts
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional

import fal_client as fal_sdk

if not os.environ.get("FAL_KEY"):
    from dotenv import load_dotenv
    load_dotenv()

router = APIRouter(prefix="/voice", tags=["voice"])

OUTPUT_DIR = os.getenv("OUTPUT_PATH", "./outputs")

# ── Edge TTS voices (free) — upgraded with multilingual/HD voices ──
FEATURED_VOICES = [
    # HD Multilingual (best quality - sound most natural)
    {"id": "en-US-AvaMultilingualNeural", "name": "Ava HD", "lang": "English (US)", "gender": "Female", "tags": ["HD", "multilingual", "natural"], "tier": "free"},
    {"id": "en-US-AndrewMultilingualNeural", "name": "Andrew HD", "lang": "English (US)", "gender": "Male", "tags": ["HD", "multilingual", "deep"], "tier": "free"},
    {"id": "en-US-EmmaMultilingualNeural", "name": "Emma HD", "lang": "English (US)", "gender": "Female", "tags": ["HD", "warm", "storytelling"], "tier": "free"},
    {"id": "en-US-BrianMultilingualNeural", "name": "Brian HD", "lang": "English (US)", "gender": "Male", "tags": ["HD", "professional", "narrator"], "tier": "free"},
    {"id": "pt-BR-ThalitaMultilingualNeural", "name": "Thalita HD", "lang": "Português (BR)", "gender": "Female", "tags": ["HD", "multilingual", "versatile"], "tier": "free"},
    # English standard
    {"id": "en-US-AriaNeural", "name": "Aria", "lang": "English (US)", "gender": "Female", "tags": ["friendly", "conversational"], "tier": "free"},
    {"id": "en-US-GuyNeural", "name": "Guy", "lang": "English (US)", "gender": "Male", "tags": ["calm", "professional"], "tier": "free"},
    {"id": "en-US-JennyNeural", "name": "Jenny", "lang": "English (US)", "gender": "Female", "tags": ["warm", "assistant"], "tier": "free"},
    {"id": "en-US-DavisNeural", "name": "Davis", "lang": "English (US)", "gender": "Male", "tags": ["casual", "young"], "tier": "free"},
    {"id": "en-US-JaneNeural", "name": "Jane", "lang": "English (US)", "gender": "Female", "tags": ["serious", "news"], "tier": "free"},
    {"id": "en-US-JasonNeural", "name": "Jason", "lang": "English (US)", "gender": "Male", "tags": ["cheerful", "ad"], "tier": "free"},
    {"id": "en-US-TonyNeural", "name": "Tony", "lang": "English (US)", "gender": "Male", "tags": ["friendly", "casual"], "tier": "free"},
    {"id": "en-US-NancyNeural", "name": "Nancy", "lang": "English (US)", "gender": "Female", "tags": ["calm", "reading"], "tier": "free"},
    {"id": "en-GB-SoniaNeural", "name": "Sonia", "lang": "English (UK)", "gender": "Female", "tags": ["elegant", "british"], "tier": "free"},
    {"id": "en-GB-RyanNeural", "name": "Ryan", "lang": "English (UK)", "gender": "Male", "tags": ["deep", "british"], "tier": "free"},
    {"id": "en-AU-NatashaNeural", "name": "Natasha", "lang": "English (AU)", "gender": "Female", "tags": ["bright", "australian"], "tier": "free"},
    # Portuguese
    {"id": "pt-PT-DuarteNeural", "name": "Duarte", "lang": "Português (PT)", "gender": "Male", "tags": ["natural", "portuguese"], "tier": "free"},
    {"id": "pt-PT-RaquelNeural", "name": "Raquel", "lang": "Português (PT)", "gender": "Female", "tags": ["warm", "portuguese"], "tier": "free"},
    {"id": "pt-BR-AntonioNeural", "name": "António", "lang": "Português (BR)", "gender": "Male", "tags": ["clear", "brazilian"], "tier": "free"},
    {"id": "pt-BR-FranciscaNeural", "name": "Francisca", "lang": "Português (BR)", "gender": "Female", "tags": ["friendly", "brazilian"], "tier": "free"},
    # Spanish
    {"id": "es-ES-ElviraNeural", "name": "Elvira", "lang": "Español (ES)", "gender": "Female", "tags": ["natural", "spanish"], "tier": "free"},
    {"id": "es-ES-AlvaroNeural", "name": "Álvaro", "lang": "Español (ES)", "gender": "Male", "tags": ["deep", "spanish"], "tier": "free"},
    {"id": "es-MX-DaliaNeural", "name": "Dalia", "lang": "Español (MX)", "gender": "Female", "tags": ["warm", "mexican"], "tier": "free"},
    # French
    {"id": "fr-FR-DeniseNeural", "name": "Denise", "lang": "Français", "gender": "Female", "tags": ["elegant", "french"], "tier": "free"},
    {"id": "fr-FR-HenriNeural", "name": "Henri", "lang": "Français", "gender": "Male", "tags": ["smooth", "french"], "tier": "free"},
    {"id": "fr-FR-VivienneMultilingualNeural", "name": "Vivienne HD", "lang": "Français", "gender": "Female", "tags": ["HD", "multilingual"], "tier": "free"},
    # German
    {"id": "de-DE-KatjaNeural", "name": "Katja", "lang": "Deutsch", "gender": "Female", "tags": ["clear", "german"], "tier": "free"},
    {"id": "de-DE-ConradNeural", "name": "Conrad", "lang": "Deutsch", "gender": "Male", "tags": ["professional", "german"], "tier": "free"},
    {"id": "de-DE-SeraphinaMultilingualNeural", "name": "Seraphina HD", "lang": "Deutsch", "gender": "Female", "tags": ["HD", "multilingual"], "tier": "free"},
    # Italian
    {"id": "it-IT-ElsaNeural", "name": "Elsa", "lang": "Italiano", "gender": "Female", "tags": ["natural", "italian"], "tier": "free"},
    {"id": "it-IT-IsabellaNeural", "name": "Isabella", "lang": "Italiano", "gender": "Female", "tags": ["warm", "italian"], "tier": "free"},
    {"id": "it-IT-DiegoNeural", "name": "Diego", "lang": "Italiano", "gender": "Male", "tags": ["deep", "italian"], "tier": "free"},
    # Dutch
    {"id": "nl-NL-ColetteNeural", "name": "Colette", "lang": "Nederlands", "gender": "Female", "tags": ["natural", "dutch"], "tier": "free"},
    {"id": "nl-NL-MaartenNeural", "name": "Maarten", "lang": "Nederlands", "gender": "Male", "tags": ["calm", "dutch"], "tier": "free"},
    # Japanese
    {"id": "ja-JP-NanamiNeural", "name": "Nanami", "lang": "Japanese", "gender": "Female", "tags": ["natural", "japanese"], "tier": "free"},
    # Korean
    {"id": "ko-KR-SunHiNeural", "name": "Sun-Hi", "lang": "Korean", "gender": "Female", "tags": ["natural", "korean"], "tier": "free"},
    # Chinese
    {"id": "zh-CN-XiaoxiaoNeural", "name": "Xiaoxiao", "lang": "Chinese (CN)", "gender": "Female", "tags": ["friendly", "chinese"], "tier": "free"},
    # Arabic
    {"id": "ar-SA-ZariyahNeural", "name": "Zariyah", "lang": "Arabic", "gender": "Female", "tags": ["natural", "arabic"], "tier": "free"},
]


class TTSRequest(BaseModel):
    text: str
    voice: str = "en-US-AvaMultilingualNeural"
    rate: str = "+0%"
    pitch: str = "+0Hz"


class CloneRequest(BaseModel):
    text: str
    reference_audio_url: str  # URL to a reference voice clip


@router.get("/voices")
async def list_voices():
    return FEATURED_VOICES


@router.get("/voices/all")
async def list_all_voices():
    voices = await edge_tts.list_voices()
    return [
        {
            "id": v["ShortName"],
            "name": v["ShortName"].split("-")[-1].replace("Neural", "").replace("Multilingual", " HD"),
            "lang": v["Locale"],
            "gender": v["Gender"],
            "tags": ["HD", "multilingual"] if "Multilingual" in v["ShortName"] else [],
            "tier": "free",
        }
        for v in voices
    ]


@router.post("/generate")
async def generate_voice(req: TTSRequest):
    """Generate speech using Edge TTS. 100% free."""
    if not req.text.strip():
        raise HTTPException(400, "Text cannot be empty")
    if len(req.text) > 5000:
        raise HTTPException(400, "Text too long (max 5000 characters)")

    file_id = str(uuid.uuid4())
    voice_dir = os.path.join(OUTPUT_DIR, "voice")
    os.makedirs(voice_dir, exist_ok=True)
    output_path = os.path.join(voice_dir, f"{file_id}.mp3")

    try:
        communicate = edge_tts.Communicate(
            text=req.text,
            voice=req.voice,
            rate=req.rate,
            pitch=req.pitch,
        )
        await communicate.save(output_path)
    except Exception as e:
        raise HTTPException(500, f"Voice generation failed: {e}")

    return {
        "id": file_id,
        "url": f"/files/voice/{file_id}.mp3",
        "voice": req.voice,
        "chars": len(req.text),
    }


@router.post("/clone")
async def clone_voice(
    text: str = "Hello, this is a test of voice cloning.",
    audio: UploadFile = File(...),
):
    """Clone a voice from a reference audio clip using F5-TTS. Uses fal.ai credits."""
    file_id = str(uuid.uuid4())
    voice_dir = os.path.join(OUTPUT_DIR, "voice")
    os.makedirs(voice_dir, exist_ok=True)

    # Save reference audio
    ref_path = os.path.join(voice_dir, f"ref_{file_id}.wav")
    with open(ref_path, "wb") as f:
        content = await audio.read()
        f.write(content)

    output_path = os.path.join(voice_dir, f"{file_id}.wav")

    try:
        # Upload reference to fal
        hosted_url = await asyncio.to_thread(fal_sdk.upload_file, ref_path)

        result = await asyncio.to_thread(
            fal_sdk.run,
            "fal-ai/f5-tts",
            arguments={
                "gen_text": text,
                "ref_audio_url": hosted_url,
                "model_type": "F5-TTS",
            },
        )

        audio_url = result.get("audio_url", {})
        if isinstance(audio_url, dict):
            audio_url = audio_url.get("url", "")

        if audio_url:
            import httpx
            async with httpx.AsyncClient(timeout=60) as client:
                r = await client.get(audio_url)
                with open(output_path, "wb") as f:
                    f.write(r.content)
        else:
            raise Exception("No audio URL in response")

    except Exception as e:
        raise HTTPException(500, f"Voice cloning failed: {e}")

    return {
        "id": file_id,
        "url": f"/files/voice/{file_id}.wav",
        "chars": len(text),
    }
