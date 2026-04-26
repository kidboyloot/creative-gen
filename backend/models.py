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


class PasswordResetToken(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    token: str = Field(index=True, unique=True)  # random opaque string sent to the user
    expires_at: datetime
    used_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ── Teams (shared plan + credits across multiple users) ──

class Team(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    name: str
    owner_id: str = Field(foreign_key="user.id", index=True)
    # The team owns the shared credits + plan. When set, members debit from
    # here instead of from their own User.credits.
    credits: int = Field(default=0)
    plan: str = Field(default="free")
    invite_code: Optional[str] = Field(default=None, index=True)  # short string others paste to join
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TeamMember(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    team_id: str = Field(foreign_key="team.id", index=True)
    user_id: str = Field(foreign_key="user.id", index=True, unique=True)
    role: str = Field(default="member")  # "owner" | "member"
    joined_at: datetime = Field(default_factory=datetime.utcnow)


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
    image_id: Optional[str] = None  # null when generating from text only (no reference)
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
    shopify_item_id: Optional[str] = Field(default=None, foreign_key="shopifyimportitem.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    job: Optional[GenerationJob] = Relationship(back_populates="assets")


# ── Shopify Multi-Product Copy ──

class ShopifyConnection(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    shop_domain: str                      # "mystore.myshopify.com"
    shop_name: Optional[str] = None       # human display name from /shop.json
    # auth_mode:
    #   "static"  → legacy long-lived shpat_ token in access_token
    #   "oauth_cc" → client_credentials flow; access_token is refreshed from client_id+secret
    auth_mode: str = "static"
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    access_token: str = ""                # current token (refreshed automatically for oauth_cc)
    access_token_expires_at: Optional[datetime] = None
    currency: str = "USD"
    locales_json: str = "[]"              # JSON list of locale codes enabled on the store
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ShopifyImportJob(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    user_id: str = Field(foreign_key="user.id", index=True)
    connection_id: str = Field(foreign_key="shopifyconnection.id")
    collection_handle: Optional[str] = None
    collection_url: str
    target_locales_json: str = "[]"       # e.g. ["pt","es","fr"]
    translation_engine: str = "google"    # "google" | "llm"
    generate_images: bool = False
    image_prompts_json: str = "[]"        # per-item prompt/model/style payload
    status: str = "pending"               # pending | running | done | failed
    step: str = "queued"                  # queued | fetching | translating | generating_images | ready
    total_products: int = 0
    done_products: int = 0
    image_cost_credits: int = 0
    translate_cost_credits: int = 0
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ShopifyImportItem(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    job_id: str = Field(foreign_key="shopifyimportjob.id", index=True)
    source_product_id: str                # Shopify numeric id as string
    source_title: str
    source_description: str = ""
    source_price: str = "0.00"
    source_currency: str = "USD"
    source_tags_json: str = "[]"
    source_images_json: str = "[]"        # list of {id, src, alt}
    source_variants_json: str = "[]"      # list of {id, title, price, sku, barcode, option1, option2, option3, compare_at_price}
    source_options_json: str = "[]"       # list of {name, position, values}
    status: str = "pending"               # pending | ready | pushed | failed
    shopify_draft_id: Optional[str] = None
    shopify_draft_url: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ShopifyImportVariant(SQLModel, table=True):
    id: str = Field(default_factory=gen_uuid, primary_key=True)
    item_id: str = Field(foreign_key="shopifyimportitem.id", index=True)
    locale: str                            # "en" | "pt" | ...
    translated_title: str = ""
    translated_description: str = ""
    translated_tags_json: str = "[]"
    price: str = "0.00"
    currency: str = "USD"
    selected_image_ids_json: str = "[]"    # ids of GeneratedAsset rows chosen in review
    shopify_draft_id: Optional[str] = None
    shopify_draft_url: Optional[str] = None
    pushed: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
