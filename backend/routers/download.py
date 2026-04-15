import os
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

router = APIRouter(tags=["download"])

OUTPUT_DIR = os.getenv("OUTPUT_PATH", "./outputs")

MEDIA_TYPES = {
    "png": "image/png",
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "webp": "image/webp",
    "mp4": "video/mp4",
}


@router.get("/download/{job_id}")
async def download_zip(job_id: str):
    zip_path = os.path.join(OUTPUT_DIR, job_id, "all_creatives.zip")
    if not os.path.exists(zip_path):
        raise HTTPException(404, "ZIP not ready yet or job not found.")
    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename=f"creatives_{job_id[:8]}.zip",
    )


# More specific route first — video outputs live in outputs/video/{job_id}/
@router.get("/files/video/{job_id}/{filename}")
async def serve_video_file(job_id: str, filename: str):
    file_path = os.path.join(OUTPUT_DIR, "video", job_id, filename)
    if not os.path.exists(file_path):
        raise HTTPException(404, "File not found.")
    ext = filename.rsplit(".", 1)[-1].lower()
    return FileResponse(file_path, media_type=MEDIA_TYPES.get(ext, "application/octet-stream"))


@router.get("/files/avatars/{filename}")
async def serve_avatar_file(filename: str):
    file_path = os.path.join(OUTPUT_DIR, "..", "uploads", "avatars", filename)
    if not os.path.exists(file_path):
        raise HTTPException(404, "File not found.")
    ext = filename.rsplit(".", 1)[-1].lower()
    mt = {"gif": "image/gif", "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp"}
    return FileResponse(file_path, media_type=mt.get(ext, "application/octet-stream"))


@router.get("/files/voice/{filename}")
async def serve_voice_file(filename: str):
    file_path = os.path.join(OUTPUT_DIR, "voice", filename)
    if not os.path.exists(file_path):
        raise HTTPException(404, "File not found.")
    return FileResponse(file_path, media_type="audio/mpeg")


@router.get("/files/tools/{filename}")
async def serve_tools_file(filename: str):
    file_path = os.path.join(OUTPUT_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(404, "File not found.")
    ext = filename.rsplit(".", 1)[-1].lower()
    return FileResponse(file_path, media_type=MEDIA_TYPES.get(ext, "application/octet-stream"))


@router.get("/files/{job_id}/{filename}")
async def serve_file(job_id: str, filename: str):
    file_path = os.path.join(OUTPUT_DIR, job_id, filename)
    if not os.path.exists(file_path):
        raise HTTPException(404, "File not found.")
    ext = filename.rsplit(".", 1)[-1].lower()
    return FileResponse(file_path, media_type=MEDIA_TYPES.get(ext, "application/octet-stream"))
