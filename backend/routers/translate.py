import os
import uuid
import asyncio
import base64
from pathlib import Path
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List
import httpx
import fal_client as fal_sdk

if not os.environ.get("FAL_KEY"):
    from dotenv import load_dotenv
    load_dotenv()

OUTPUT_DIR = os.getenv("OUTPUT_PATH", "./outputs")
UPLOAD_DIR = os.getenv("STORAGE_PATH", "./uploads")

router = APIRouter(prefix="/translate", tags=["translate"])

# Free Google Translate (no API key needed)
GOOGLE_TRANSLATE_URL = "https://translate.googleapis.com/translate_a/single"

LANGUAGES = [
    {"code": "auto", "name": "Auto Detect"},
    {"code": "pt", "name": "Portuguese"},
    {"code": "en", "name": "English"},
    {"code": "es", "name": "Spanish"},
    {"code": "fr", "name": "French"},
    {"code": "de", "name": "German"},
    {"code": "it", "name": "Italian"},
    {"code": "nl", "name": "Dutch"},
    {"code": "pl", "name": "Polish"},
    {"code": "ru", "name": "Russian"},
    {"code": "ja", "name": "Japanese"},
    {"code": "ko", "name": "Korean"},
    {"code": "zh", "name": "Chinese (Simplified)"},
    {"code": "zh-TW", "name": "Chinese (Traditional)"},
    {"code": "ar", "name": "Arabic"},
    {"code": "hi", "name": "Hindi"},
    {"code": "tr", "name": "Turkish"},
    {"code": "sv", "name": "Swedish"},
    {"code": "da", "name": "Danish"},
    {"code": "no", "name": "Norwegian"},
    {"code": "fi", "name": "Finnish"},
    {"code": "th", "name": "Thai"},
    {"code": "vi", "name": "Vietnamese"},
    {"code": "id", "name": "Indonesian"},
    {"code": "ro", "name": "Romanian"},
    {"code": "cs", "name": "Czech"},
    {"code": "el", "name": "Greek"},
    {"code": "he", "name": "Hebrew"},
    {"code": "uk", "name": "Ukrainian"},
]


async def _translate_text(text: str, source: str, target: str) -> dict:
    """Translate text using free Google Translate."""
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(
            GOOGLE_TRANSLATE_URL,
            params={
                "client": "gtx",
                "sl": source,
                "tl": target,
                "dt": "t",
                "q": text,
            },
        )
        if resp.status_code != 200:
            raise Exception(f"Translation failed: {resp.status_code}")

        data = resp.json()
        translated = "".join(part[0] for part in data[0] if part[0])
        detected_lang = data[2] if len(data) > 2 else source

        return {
            "translated": translated,
            "detected_language": detected_lang,
        }


class TranslateRequest(BaseModel):
    text: str
    source: str = "auto"
    target: str = "en"


class BulkTranslateRequest(BaseModel):
    texts: List[str]
    source: str = "auto"
    target: str = "en"


@router.get("/languages")
async def list_languages():
    return LANGUAGES


@router.post("")
async def translate(req: TranslateRequest):
    """Translate a single text. 100% free."""
    if not req.text.strip():
        raise HTTPException(400, "Text cannot be empty")
    if len(req.text) > 5000:
        raise HTTPException(400, "Text too long (max 5000 chars)")

    try:
        result = await _translate_text(req.text, req.source, req.target)
    except Exception as e:
        raise HTTPException(500, f"Translation failed: {e}")

    return {
        "original": req.text,
        "translated": result["translated"],
        "source": req.source,
        "detected_language": result["detected_language"],
        "target": req.target,
    }


@router.post("/bulk")
async def bulk_translate(req: BulkTranslateRequest):
    """Translate multiple texts in bulk. 100% free."""
    if not req.texts:
        raise HTTPException(400, "No texts provided")
    if len(req.texts) > 50:
        raise HTTPException(400, "Max 50 texts per request")

    results = []
    for text in req.texts:
        if not text.strip():
            results.append({"original": text, "translated": "", "detected_language": req.source})
            continue
        try:
            result = await _translate_text(text, req.source, req.target)
            results.append({
                "original": text,
                "translated": result["translated"],
                "detected_language": result["detected_language"],
            })
        except Exception:
            results.append({"original": text, "translated": "[translation failed]", "detected_language": req.source})

    return {"results": results, "target": req.target}


def _image_to_data_uri(path: str) -> str:
    with open(path, "rb") as f:
        data = base64.b64encode(f.read()).decode()
    ext = Path(path).suffix.lstrip(".").lower()
    mime = "image/jpeg" if ext in ("jpg", "jpeg") else f"image/{ext}"
    return f"data:{mime};base64,{data}"


async def _download_file(url: str, dest: str):
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.get(url)
        r.raise_for_status()
        with open(dest, "wb") as f:
            f.write(r.content)


@router.post("/extract-text")
async def extract_text_from_image(
    file: UploadFile = File(...),
    lang: str = "eng",
):
    """Extract text from an image using OCR. 100% free, runs locally."""
    import pytesseract
    from PIL import Image as PILImage

    file_id = str(uuid.uuid4())
    img_path = os.path.join(UPLOAD_DIR, f"ocr_{file_id}.png")
    os.makedirs(UPLOAD_DIR, exist_ok=True)

    with open(img_path, "wb") as f:
        content = await file.read()
        f.write(content)

    try:
        img = PILImage.open(img_path)
        # Run OCR
        text = await asyncio.to_thread(
            pytesseract.image_to_string, img, lang=lang
        )
        # Also get detailed data with bounding boxes
        data = await asyncio.to_thread(
            pytesseract.image_to_data, img, lang=lang, output_type=pytesseract.Output.DICT
        )

        # Build text blocks
        blocks = []
        current_block = ""
        current_block_num = -1
        for i in range(len(data["text"])):
            if int(data["conf"][i]) > 30 and data["text"][i].strip():
                if data["block_num"][i] != current_block_num:
                    if current_block.strip():
                        blocks.append(current_block.strip())
                    current_block = ""
                    current_block_num = data["block_num"][i]
                current_block += data["text"][i] + " "
        if current_block.strip():
            blocks.append(current_block.strip())

    except Exception as e:
        raise HTTPException(500, f"Text extraction failed: {e}")
    finally:
        os.remove(img_path)

    return {
        "text": text.strip(),
        "blocks": blocks,
        "chars": len(text.strip()),
    }
