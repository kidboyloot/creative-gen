import os
import uuid
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional
from sqlmodel import Session

from database import get_session
from models import User
from routers.auth import require_user

router = APIRouter(prefix="/profile", tags=["profile"])

UPLOAD_DIR = os.getenv("STORAGE_PATH", "./uploads")


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    niche: Optional[str] = None


@router.get("")
async def get_profile(user: User = Depends(require_user)):
    return {
        "id": user.id,
        "email": user.email,
        "name": user.name,
        "bio": user.bio or "",
        "website": user.website or "",
        "location": user.location or "",
        "niche": user.niche or "",
        "avatar": user.avatar,
        "credits": user.credits,
        "plan": user.plan,
        "created_at": user.created_at.isoformat(),
    }


@router.put("")
async def update_profile(
    req: ProfileUpdate,
    user: User = Depends(require_user),
    session: Session = Depends(get_session),
):
    if req.name is not None:
        user.name = req.name
    if req.bio is not None:
        user.bio = req.bio
    if req.website is not None:
        user.website = req.website
    if req.location is not None:
        user.location = req.location
    if req.niche is not None:
        user.niche = req.niche

    session.add(user)
    session.commit()
    return {"ok": True}


@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(require_user),
    session: Session = Depends(get_session),
):
    if not file.filename:
        raise HTTPException(400, "No file provided")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("png", "jpg", "jpeg", "webp", "gif"):
        raise HTTPException(400, "Supported: PNG, JPG, WebP, GIF")

    avatar_dir = os.path.join(UPLOAD_DIR, "avatars")
    os.makedirs(avatar_dir, exist_ok=True)

    file_id = str(uuid.uuid4())
    filename = f"{file_id}.{ext}"
    filepath = os.path.join(avatar_dir, filename)

    with open(filepath, "wb") as f:
        content = await file.read()
        f.write(content)

    url = f"/files/avatars/{filename}"
    user.avatar = url
    session.add(user)
    session.commit()

    return {"url": url}


@router.delete("/avatar")
async def delete_avatar(
    user: User = Depends(require_user),
    session: Session = Depends(get_session),
):
    user.avatar = None
    session.add(user)
    session.commit()
    return {"ok": True}
