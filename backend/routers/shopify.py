"""Shopify Multi-Product Copy router.

Endpoints let the user:
  - Connect / disconnect stores (admin API token)
  - Preview products in a collection
  - Start a background import job (translate + optional AI image gen)
  - Poll progress + fetch full status (items + variants)
  - Push the reviewed products back to Shopify as drafts
"""
from __future__ import annotations

import json
import os
from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models import (
    GeneratedAsset,
    ShopifyConnection,
    ShopifyImportItem,
    ShopifyImportJob,
    ShopifyImportVariant,
    User,
)
from database import engine as db_engine
from routers.auth import CREDIT_COSTS, require_user, spend_credits
from services.shopify_client import (
    ShopifyClient,
    exchange_client_credentials,
    fetch_public_collection_products,
    parse_collection_identifier,
    parse_source_domain,
)
from services.shopify_import import run_shopify_import

router = APIRouter(prefix="/shopify", tags=["shopify"])


# ── Schemas ──

class ConnectRequest(BaseModel):
    shop_domain: str
    # Legacy: paste an Admin API access token (shpat_...)
    access_token: Optional[str] = None
    # New (client_credentials): paste Client ID + Client Secret; backend rotates the token.
    client_id: Optional[str] = None
    client_secret: Optional[str] = None


class ConnectionResponse(BaseModel):
    id: str
    shop_domain: str
    shop_name: Optional[str] = None
    currency: str
    locales: list[str]
    auth_mode: str
    created_at: datetime


class CollectionPreviewRequest(BaseModel):
    connection_id: str
    collection_url: str


class ImportOptionsProduct(BaseModel):
    id: str
    title: str
    description: str = ""
    price: str = "0.00"
    currency: str = "USD"
    tags: list[str] = []
    images: list[dict] = []


class ImagePromptSlot(BaseModel):
    item_id: str
    prompt: str
    model: str = "flux-dev"
    style: str = ""


class StartImportRequest(BaseModel):
    connection_id: str
    collection_url: str
    products: list[ImportOptionsProduct]
    target_locales: list[str]
    translation_engine: str = "google"    # "google" | "llm"
    generate_images: bool = False
    image_prompts: list[ImagePromptSlot] = []


class PushVariantOverride(BaseModel):
    variant_id: str
    translated_title: Optional[str] = None
    translated_description: Optional[str] = None
    translated_tags: Optional[list[str]] = None
    price: Optional[str] = None
    currency: Optional[str] = None
    selected_image_ids: Optional[list[str]] = None


class PushRequest(BaseModel):
    variant_ids: list[str]
    overrides: list[PushVariantOverride] = []


# ── Helpers ──

def _connection_or_404(
    session: Session, connection_id: str, user: User
) -> ShopifyConnection:
    conn = session.get(ShopifyConnection, connection_id)
    if not conn or conn.user_id != user.id:
        raise HTTPException(404, "Shopify connection not found")
    return conn


def _connection_response(c: ShopifyConnection) -> ConnectionResponse:
    return ConnectionResponse(
        id=c.id,
        shop_domain=c.shop_domain,
        shop_name=c.shop_name,
        currency=c.currency,
        locales=json.loads(c.locales_json or "[]"),
        auth_mode=c.auth_mode or "static",
        created_at=c.created_at,
    )


def _persist_token(connection_id: str):
    """Callback for ShopifyClient to write the refreshed token back to the row."""
    def _cb(token: str, expires_at):
        from sqlmodel import Session
        with Session(db_engine) as s:
            c = s.get(ShopifyConnection, connection_id)
            if not c:
                return
            c.access_token = token
            c.access_token_expires_at = expires_at
            s.add(c)
            s.commit()
    return _cb


def _client_from_connection(conn: ShopifyConnection) -> ShopifyClient:
    return ShopifyClient(
        conn.shop_domain,
        conn.access_token,
        client_id=conn.client_id,
        client_secret=conn.client_secret,
        expires_at=conn.access_token_expires_at,
        on_refresh=_persist_token(conn.id),
    )


# ── Connection endpoints ──

@router.post("/connect", response_model=ConnectionResponse)
async def connect_store(
    req: ConnectRequest,
    session: Session = Depends(get_session),
    user: User = Depends(require_user),
):
    use_cc = bool(req.client_id and req.client_secret)
    use_static = bool(req.access_token and not use_cc)
    if not (use_cc or use_static):
        raise HTTPException(
            400,
            "Provide either an Admin API access token (legacy) or a Client ID + Client Secret (recommended).",
        )

    auth_mode = "oauth_cc" if use_cc else "static"
    access_token = req.access_token or ""
    expires_at = None
    if use_cc:
        result = await exchange_client_credentials(
            req.shop_domain, req.client_id, req.client_secret
        )
        access_token = result["access_token"]
        expires_at = result["expires_at"]

    client = ShopifyClient(req.shop_domain, access_token)
    try:
        shop = await client.get_shop()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Could not reach Shopify: {e}")

    existing = session.exec(
        select(ShopifyConnection)
        .where(ShopifyConnection.user_id == user.id)
        .where(ShopifyConnection.shop_domain == client.shop_domain)
    ).first()
    if existing:
        existing.auth_mode = auth_mode
        existing.client_id = req.client_id if use_cc else None
        existing.client_secret = req.client_secret if use_cc else None
        existing.access_token = access_token
        existing.access_token_expires_at = expires_at
        existing.shop_name = shop.get("name") or existing.shop_name
        existing.currency = shop.get("currency") or existing.currency
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return _connection_response(existing)

    conn = ShopifyConnection(
        user_id=user.id,
        shop_domain=client.shop_domain,
        shop_name=shop.get("name"),
        auth_mode=auth_mode,
        client_id=req.client_id if use_cc else None,
        client_secret=req.client_secret if use_cc else None,
        access_token=access_token,
        access_token_expires_at=expires_at,
        currency=shop.get("currency") or "USD",
        locales_json=json.dumps([shop.get("primary_locale") or "en"]),
    )
    session.add(conn)
    session.commit()
    session.refresh(conn)
    return _connection_response(conn)


@router.get("/connections", response_model=list[ConnectionResponse])
async def list_connections(
    session: Session = Depends(get_session),
    user: User = Depends(require_user),
):
    rows = session.exec(
        select(ShopifyConnection)
        .where(ShopifyConnection.user_id == user.id)
        .order_by(ShopifyConnection.created_at.desc())
    ).all()
    return [_connection_response(c) for c in rows]


@router.delete("/connections/{connection_id}")
async def delete_connection(
    connection_id: str,
    session: Session = Depends(get_session),
    user: User = Depends(require_user),
):
    conn = _connection_or_404(session, connection_id, user)
    session.delete(conn)
    session.commit()
    return {"ok": True}


# ── Collection preview ──

@router.post("/collection-preview")
async def collection_preview(
    req: CollectionPreviewRequest,
    session: Session = Depends(get_session),
    user: User = Depends(require_user),
):
    conn = _connection_or_404(session, req.connection_id, user)
    source_domain = parse_source_domain(req.collection_url)
    ident = parse_collection_identifier(req.collection_url)
    handle = ident.get("handle")
    coll_id: Any = None

    # Decide where to fetch products from.
    # - If the URL has no domain, or the domain matches the connected store → use the
    #   authenticated Admin API (more accurate, includes draft products etc).
    # - If the URL points at a different store → scrape the public storefront JSON
    #   (no auth needed). This is the "swipe competitor's collection" use-case.
    same_store = (not source_domain) or source_domain == conn.shop_domain

    if same_store:
        client = _client_from_connection(conn)
        if handle == "all":
            products = await client.list_all_products()
            coll_id = "all"
        else:
            coll_id = await client.resolve_collection_id(ident)
            if not coll_id:
                h = handle or ident.get("id")
                raise HTTPException(
                    404,
                    f"Collection '{h}' not found on {conn.shop_domain}. "
                    "Check the URL (handle must match exactly) or paste /collections/all to list every product.",
                )
            products = await client.list_collection_products(coll_id)
        source_label = conn.shop_domain
    else:
        products = await fetch_public_collection_products(source_domain, handle)
        if not products:
            h = handle or "all"
            raise HTTPException(
                404,
                f"No products found at {source_domain}/collections/{h}. The store may be "
                "password-protected or the handle is wrong.",
            )
        coll_id = handle or "all"
        source_label = source_domain

    preview = []
    for p in products:
        img = (p.get("image") or {}).get("src") or ""
        if not img and p.get("images"):
            img = p["images"][0].get("src", "")
        variants = p.get("variants") or []
        price = variants[0].get("price") if variants else "0.00"
        preview.append(
            {
                "id": str(p["id"]),
                "title": p.get("title", ""),
                "handle": p.get("handle", ""),
                "featured_image": img,
                "price": price,
                "currency": conn.currency,
                "variant_count": len(variants),
                "description": p.get("body_html", ""),
                "tags": [t.strip() for t in (p.get("tags") or "").split(",") if t.strip()],
                "images": [{"id": str(im.get("id")), "src": im.get("src", ""), "alt": im.get("alt", "")} for im in (p.get("images") or [])],
            }
        )

    return {
        "collection_id": str(coll_id),
        "shop_domain": source_label,
        "destination_domain": conn.shop_domain,
        "currency": conn.currency,
        "products": preview,
    }


# ── Start import job ──

@router.post("/import")
async def start_import(
    req: StartImportRequest,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_session),
    user: User = Depends(require_user),
):
    conn = _connection_or_404(session, req.connection_id, user)
    if not req.products:
        raise HTTPException(400, "No products selected")
    if not req.target_locales:
        raise HTTPException(400, "Select at least one locale")

    # Spend translation credits up-front. Image credits are charged at gen-time
    # via this same endpoint because the user already confirmed cost in the UI.
    translate_cost = (
        len(req.products)
        * len(req.target_locales)
        * CREDIT_COSTS.get("shopify_translate", 0)
    )
    image_cost = 0
    if req.generate_images:
        image_cost = len(req.image_prompts) * CREDIT_COSTS.get("shopify_image_gen", 0)
    total_cost = translate_cost + image_cost
    if total_cost > 0:
        spend_credits(
            user,
            total_cost,
            f"Shopify import: {len(req.products)} products × {len(req.target_locales)} locales"
            + (f" + {len(req.image_prompts)} AI images" if req.generate_images else ""),
            session,
        )

    job = ShopifyImportJob(
        user_id=user.id,
        connection_id=conn.id,
        collection_url=req.collection_url,
        target_locales_json=json.dumps(req.target_locales),
        translation_engine=req.translation_engine,
        generate_images=req.generate_images,
        image_prompts_json=json.dumps([p.model_dump() for p in req.image_prompts]),
        status="pending",
        step="queued",
        total_products=len(req.products),
        done_products=0,
        image_cost_credits=image_cost,
        translate_cost_credits=translate_cost,
    )
    session.add(job)
    session.commit()
    session.refresh(job)

    for p in req.products:
        item = ShopifyImportItem(
            job_id=job.id,
            source_product_id=p.id,
            source_title=p.title,
            source_description=p.description,
            source_price=p.price,
            source_currency=p.currency,
            source_tags_json=json.dumps(p.tags),
            source_images_json=json.dumps(p.images),
        )
        session.add(item)
    session.commit()

    background_tasks.add_task(run_shopify_import, job.id)
    return {"job_id": job.id, "status": "pending"}


# ── Status ──

@router.get("/import/{job_id}")
async def get_import_status(
    job_id: str,
    session: Session = Depends(get_session),
    user: User = Depends(require_user),
):
    job = session.get(ShopifyImportJob, job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(404, "Import job not found")

    conn = session.get(ShopifyConnection, job.connection_id)
    items = session.exec(
        select(ShopifyImportItem).where(ShopifyImportItem.job_id == job_id)
    ).all()
    item_ids = [it.id for it in items]
    variants = []
    if item_ids:
        variants = session.exec(
            select(ShopifyImportVariant).where(ShopifyImportVariant.item_id.in_(item_ids))
        ).all()
    assets = []
    if item_ids:
        assets = session.exec(
            select(GeneratedAsset).where(GeneratedAsset.shopify_item_id.in_(item_ids))
        ).all()

    return {
        "job_id": job.id,
        "status": job.status,
        "step": job.step,
        "done": job.done_products,
        "total": job.total_products,
        "generate_images": job.generate_images,
        "translation_engine": job.translation_engine,
        "target_locales": json.loads(job.target_locales_json or "[]"),
        "error": job.error,
        "shop": {
            "domain": conn.shop_domain if conn else None,
            "name": conn.shop_name if conn else None,
            "currency": conn.currency if conn else "USD",
        },
        "items": [
            {
                "id": it.id,
                "source_product_id": it.source_product_id,
                "source_title": it.source_title,
                "source_price": it.source_price,
                "source_currency": it.source_currency,
                "source_images": json.loads(it.source_images_json or "[]"),
                "status": it.status,
                "shopify_draft_id": it.shopify_draft_id,
                "shopify_draft_url": it.shopify_draft_url,
            }
            for it in items
        ],
        "variants": [
            {
                "id": v.id,
                "item_id": v.item_id,
                "locale": v.locale,
                "translated_title": v.translated_title,
                "translated_description": v.translated_description,
                "translated_tags": json.loads(v.translated_tags_json or "[]"),
                "price": v.price,
                "currency": v.currency,
                "selected_image_ids": json.loads(v.selected_image_ids_json or "[]"),
                "shopify_draft_id": v.shopify_draft_id,
                "shopify_draft_url": v.shopify_draft_url,
                "pushed": v.pushed,
            }
            for v in variants
        ],
        "assets": [
            {
                "id": a.id,
                "shopify_item_id": a.shopify_item_id,
                "variant": a.variant_index,
                "url": f"/files/{a.job_id}/{os.path.basename(a.file_path)}",
                "file_path": a.file_path,
            }
            for a in assets
        ],
    }


# ── Push to Shopify ──

@router.post("/import/{job_id}/push")
async def push_to_shopify(
    job_id: str,
    req: PushRequest,
    session: Session = Depends(get_session),
    user: User = Depends(require_user),
):
    job = session.get(ShopifyImportJob, job_id)
    if not job or job.user_id != user.id:
        raise HTTPException(404, "Import job not found")
    conn = session.get(ShopifyConnection, job.connection_id)
    if not conn:
        raise HTTPException(404, "Connection missing")

    overrides_by_id = {o.variant_id: o for o in req.overrides}
    client = _client_from_connection(conn)
    created = []

    for vid in req.variant_ids:
        variant = session.get(ShopifyImportVariant, vid)
        if not variant:
            continue
        item = session.get(ShopifyImportItem, variant.item_id)
        if not item:
            continue
        override = overrides_by_id.get(vid)

        title = (override and override.translated_title) or variant.translated_title or item.source_title
        description = (
            (override and override.translated_description)
            or variant.translated_description
            or item.source_description
        )
        tags = (override and override.translated_tags) or json.loads(variant.translated_tags_json or "[]") or json.loads(item.source_tags_json or "[]")
        price = (override and override.price) or variant.price or item.source_price
        selected_ids = (override and override.selected_image_ids) or json.loads(variant.selected_image_ids_json or "[]")

        # Resolve image URLs. Prefer generated assets if selected, else fall back to source images.
        image_urls: list[str] = []
        if selected_ids:
            assets = session.exec(
                select(GeneratedAsset).where(GeneratedAsset.id.in_(selected_ids))
            ).all()
            # Map file_path → URL served by /files. We just upload src URLs, so fall back to source image URLs.
            # Generated assets are local files — Shopify needs URLs. Use source product images as the safe default;
            # generated images would require an upload-to-cdn step which we skip for MVP.
            image_urls = [src for src in [json.loads(item.source_images_json or "[]")] if src]
            # Flatten [{src}] -> src list, but only if we have no CDN for generated files
            src_list = [im.get("src") for im in json.loads(item.source_images_json or "[]") if im.get("src")]
            image_urls = src_list
        else:
            image_urls = [im.get("src") for im in json.loads(item.source_images_json or "[]") if im.get("src")]

        try:
            product = await client.create_draft_product(
                title=title,
                body_html=description,
                price=price,
                tags=tags,
                image_urls=image_urls,
            )
        except Exception as e:
            variant.pushed = False
            session.add(variant)
            session.commit()
            created.append({"variant_id": vid, "ok": False, "error": str(e)[:300]})
            continue

        product_id = product.get("id")
        variant.shopify_draft_id = str(product_id) if product_id else None
        variant.shopify_draft_url = (
            f"https://{conn.shop_domain}/admin/products/{product_id}" if product_id else None
        )
        variant.pushed = True
        if override and override.selected_image_ids is not None:
            variant.selected_image_ids_json = json.dumps(override.selected_image_ids)
        if override and override.translated_title is not None:
            variant.translated_title = override.translated_title
        if override and override.translated_description is not None:
            variant.translated_description = override.translated_description
        if override and override.translated_tags is not None:
            variant.translated_tags_json = json.dumps(override.translated_tags)
        if override and override.price is not None:
            variant.price = override.price
        session.add(variant)

        if product_id:
            item.shopify_draft_id = str(product_id)
            item.shopify_draft_url = variant.shopify_draft_url
            item.status = "pushed"
            session.add(item)
        session.commit()

        created.append(
            {
                "variant_id": vid,
                "ok": True,
                "draft_id": variant.shopify_draft_id,
                "draft_url": variant.shopify_draft_url,
                "title": title,
                "locale": variant.locale,
            }
        )

    return {"created": created, "count": sum(1 for c in created if c.get("ok"))}
