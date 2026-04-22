import os
import json
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import Optional

from database import get_session
from models import GenerationJob, GeneratedAsset, Project, User
from routers.auth import require_user

router = APIRouter(prefix="/history", tags=["history"])


@router.get("")
async def list_jobs(
    project_id: Optional[str] = None,
    limit: int = 50,
    session: Session = Depends(get_session),
    user: User = Depends(require_user),
):
    query = (
        select(GenerationJob)
        .where(GenerationJob.user_id == user.id)
        .order_by(GenerationJob.created_at.desc())
        .limit(limit)
    )
    if project_id:
        query = query.where(GenerationJob.project_id == project_id)
    jobs = session.exec(query).all()

    result = []
    for j in jobs:
        # Get first few assets for thumbnails
        assets = session.exec(
            select(GeneratedAsset)
            .where(GeneratedAsset.job_id == j.id)
            .where(GeneratedAsset.asset_type == "image")
            .limit(4)
        ).all()

        result.append({
            "id": j.id,
            "prompt": j.prompt,
            "model": j.model,
            "formats": json.loads(j.formats),
            "types": json.loads(j.types),
            "count": j.count,
            "status": j.status,
            "done": j.done_assets,
            "total": j.total_assets,
            "project_id": j.project_id,
            "created_at": j.created_at.isoformat(),
            "thumbnails": [
                f"/files/{j.id}/{os.path.basename(a.file_path)}"
                for a in assets
            ],
        })

    return result


@router.get("/projects")
async def list_projects(
    session: Session = Depends(get_session),
    user: User = Depends(require_user),
):
    projects = session.exec(
        select(Project)
        .where(Project.user_id == user.id)
        .order_by(Project.created_at.desc())
    ).all()
    return [{"id": p.id, "name": p.name, "created_at": p.created_at.isoformat()} for p in projects]


@router.post("/projects")
async def create_project(
    name: str,
    session: Session = Depends(get_session),
    user: User = Depends(require_user),
):
    project = Project(name=name, user_id=user.id)
    session.add(project)
    session.commit()
    session.refresh(project)
    return {"id": project.id, "name": project.name}
