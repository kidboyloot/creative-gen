from datetime import datetime
from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
import uuid


def gen_uuid() -> str:
    return str(uuid.uuid4())


# ── Users & Auth ──

class User(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    email: str = Field(index=True, unique=True)
    name: str
    hashed_password: str
    credits: int = Field(default=50)
    plan: str = Field(default="free")
    avatar: Optional[str] = Field(default=None)  # URL to avatar image
    bio: Optional[str] = Field(default=None)
    website: Optional[str] = Field(default=None)
    location: Optional[str] = Field(default=None)
    niche: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    jobs: List["GenerationJob"] = Relationship(back_populates="user")
    projects: List["Project"] = Relationship(back_populates="user")


class CreditTransaction(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    user_id: str = Field(foreign_key="user.id")
    amount: int  # negative = spent, positive = added
    balance_after: int
    description: str  # "Image generation (5 variants)", "Welcome bonus", etc.
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── Projects ──

class Project(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    name: str
    user_id: Optional[str] = Field(default=None, foreign_key="user.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    user: Optional[User] = Relationship(back_populates="projects")
    jobs: List["GenerationJob"] = Relationship(back_populates="project")


# ── Generation ──

class GenerationJob(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    project_id: Optional[str] = Field(default=None, foreign_key="project.id")
    user_id: Optional[str] = Field(default=None, foreign_key="user.id")
    image_id: str
    prompt: str                   # kept for backwards compat (first prompt)
    prompts: Optional[str] = None  # JSON-encoded list of prompts
    formats: str  # JSON-encoded list e.g. '["1:1","9:16"]'
    types: str    # JSON-encoded list e.g. '["image","video","collage"]'
    count: int
    model: str = "flux-dev"
    status: str = "pending"  # pending | running | done | failed
    total_assets: int = 0
    done_assets: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

    user: Optional[User] = Relationship(back_populates="jobs")
    project: Optional[Project] = Relationship(back_populates="jobs")
    assets: List["GeneratedAsset"] = Relationship(back_populates="job")


class GeneratedAsset(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    job_id: str = Field(foreign_key="generationjob.id")
    variant_index: int
    asset_type: str   # image | video | collage
    format: str       # 1:1 | 9:16
    file_path: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    job: Optional[GenerationJob] = Relationship(back_populates="assets")
