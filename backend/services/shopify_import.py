"""Background worker that drives a ShopifyImportJob end-to-end.

Flow:
  1. fetching        → already cached on items at create time, just mark step
  2. translating     → per item × locale, build ShopifyImportVariant rows
  3. generating_images (optional) → per item + prompt slot, call fal.ai
  4. ready           → status=done, frontend polls and advances to review
"""
from __future__ import annotations

import asyncio
import json
import os
import uuid
from datetime import datetime
from typing import Optional

import httpx
from sqlmodel import Session, select

from database import engine
from models import (
    ShopifyImportJob,
    ShopifyImportItem,
    ShopifyImportVariant,
    GeneratedAsset,
    GenerationJob,
)
from services import fal_client as fal
from services.llm_translate import llm_available, translate_product_copy
from routers.translate import _translate_text


OUTPUT_DIR = os.getenv("OUTPUT_PATH", "./outputs")


def _set_step(job_id: str, step: str, status: Optional[str] = None) -> None:
    with Session(engine) as s:
        j = s.get(ShopifyImportJob, job_id)
        if not j:
            return
        j.step = step
        if status:
            j.status = status
        s.add(j)
        s.commit()


def _increment_done(job_id: str) -> None:
    with Session(engine) as s:
        j = s.get(ShopifyImportJob, job_id)
        if not j:
            return
        j.done_products += 1
        s.add(j)
        s.commit()


async def _translate_listing_google(title: str, description: str, tags: list[str], locale: str) -> dict:
    async def _one(text: str, fallback: str = "") -> str:
        if not text:
            return ""
        try:
            return (await _translate_text(text, "auto", locale))["translated"]
        except Exception:
            return fallback or text

    title_task = _one(title)
    desc_task = _one(description)
    tag_tasks = [_one(tag, fallback=tag) for tag in (tags or [])]
    t_title, t_desc, *t_tags = await asyncio.gather(title_task, desc_task, *tag_tasks)
    return {"title": t_title, "description": t_desc, "tags": list(t_tags)}


async def _translate_listing(
    engine_kind: str, title: str, description: str, tags: list[str], locale: str
) -> dict:
    if engine_kind == "llm" and llm_available():
        try:
            return await translate_product_copy(title, description, tags, locale)
        except Exception as e:
            print(f"[shopify_import] LLM translate failed ({e}); falling back to google")
    return await _translate_listing_google(title, description, tags, locale)


async def _download_to_temp(url: str) -> Optional[str]:
    if not url:
        return None
    try:
        async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
            r = await client.get(url)
            r.raise_for_status()
        ext = url.split("?")[0].rsplit(".", 1)[-1].lower()
        if ext not in ("png", "jpg", "jpeg", "webp"):
            ext = "jpg"
        path = os.path.join(OUTPUT_DIR, f"shopify_ref_{uuid.uuid4().hex}.{ext}")
        os.makedirs(OUTPUT_DIR, exist_ok=True)
        with open(path, "wb") as f:
            f.write(r.content)
        return path
    except Exception as e:
        print(f"[shopify_import] ref download failed ({url}): {e}")
        return None


def _ensure_gen_job_for_import(
    job_id: str,
    user_id: str,
    *,
    product_count: int = 0,
    total_images: int = 0,
    first_prompt: str = "",
) -> str:
    """Create a sibling GenerationJob so GeneratedAsset.shopify_item_id images
    live under the existing library/history pages too. Populating it with the
    product count + expected image total up-front makes the History page show
    "Shopify import · N products · K images" instead of a blank "0 variants"
    row while the job is still running.
    """
    label = (
        f"Shopify import — {product_count} product"
        + ("s" if product_count != 1 else "")
        + (f" · {first_prompt[:60]}" if first_prompt else "")
    )
    with Session(engine) as s:
        existing = s.exec(
            select(GenerationJob).where(GenerationJob.id == job_id)
        ).first()
        if existing:
            existing.prompt = label
            existing.count = product_count
            existing.total_assets = total_images
            s.add(existing)
            s.commit()
            return existing.id
        gj = GenerationJob(
            id=job_id,
            user_id=user_id,
            image_id="",
            prompt=label,
            formats=json.dumps(["1:1"]),
            types=json.dumps(["image"]),
            count=product_count,
            model="flux-dev",
            status="running",
            total_assets=total_images,
            done_assets=0,
        )
        s.add(gj)
        s.commit()
        return gj.id


def _increment_gen_job_done(gen_job_id: str) -> None:
    with Session(engine) as s:
        gj = s.get(GenerationJob, gen_job_id)
        if gj:
            gj.done_assets = (gj.done_assets or 0) + 1
            s.add(gj)
            s.commit()


async def run_shopify_import(job_id: str) -> None:
    with Session(engine) as s:
        job = s.get(ShopifyImportJob, job_id)
        if not job:
            return
        job.status = "running"
        job.step = "fetching"
        job.started_at = datetime.utcnow()
        s.add(job)
        s.commit()
        locales = json.loads(job.target_locales_json or "[]")
        engine_kind = job.translation_engine or "google"
        generate_images = bool(job.generate_images)
        image_prompts = json.loads(job.image_prompts_json or "[]")
        user_id = job.user_id

    try:
        # Back GeneratedAsset FK with a lightweight GenerationJob shell so
        # these imports show up in the History page alongside normal gens.
        total_expected_images = (
            len([p for p in image_prompts if (p.get("prompt") or "").strip()])
            if generate_images
            else 0
        )
        first_prompt = next(
            (p.get("prompt", "") for p in image_prompts if (p.get("prompt") or "").strip()),
            "",
        )
        gen_job_id = _ensure_gen_job_for_import(
            job_id,
            user_id,
            product_count=0,  # filled in after we load items below
            total_images=total_expected_images,
            first_prompt=first_prompt,
        )

        # ─── Translate ───
        _set_step(job_id, "translating")
        with Session(engine) as s:
            items = s.exec(
                select(ShopifyImportItem).where(ShopifyImportItem.job_id == job_id)
            ).all()
            items_snapshot = [
                {
                    "id": it.id,
                    "source_product_id": it.source_product_id,
                    "title": it.source_title,
                    "description": it.source_description,
                    "tags": json.loads(it.source_tags_json or "[]"),
                    "price": it.source_price,
                    "currency": it.source_currency,
                    "images": json.loads(it.source_images_json or "[]"),
                }
                for it in items
            ]

        # Now that we know how many products there are, refresh the sibling
        # GenerationJob so the History row reads "Shopify import — N products".
        with Session(engine) as s:
            gj = s.get(GenerationJob, gen_job_id)
            if gj:
                count = len(items_snapshot)
                gj.count = count
                gj.prompt = (
                    f"Shopify import — {count} product"
                    + ("s" if count != 1 else "")
                    + (f" · {first_prompt[:60]}" if first_prompt else "")
                )
                s.add(gj)
                s.commit()

        locales_list = locales or ["en"]
        for snap in items_snapshot:
            # Fan out all locales for this product in parallel. Each _translate_listing
            # itself fans out title/description/tags in parallel — so one product's
            # translations collapse from ~locales × (2 + #tags) serial HTTP calls
            # into a single gather.
            results = await asyncio.gather(
                *[
                    _translate_listing(
                        engine_kind,
                        snap["title"],
                        snap["description"],
                        snap["tags"],
                        locale,
                    )
                    for locale in locales_list
                ]
            )
            with Session(engine) as s:
                for locale, tr in zip(locales_list, results):
                    s.add(
                        ShopifyImportVariant(
                            item_id=snap["id"],
                            locale=locale,
                            translated_title=tr.get("title", ""),
                            translated_description=tr.get("description", ""),
                            translated_tags_json=json.dumps(tr.get("tags", [])),
                            price=snap["price"],
                            currency=snap["currency"],
                        )
                    )
                s.commit()
            # If there's no image phase after this, count progress now so the
            # progress bar actually moves during translation instead of jumping
            # from 0% to 100% at the very end.
            if not (generate_images and image_prompts):
                _increment_done(job_id)

        # ─── Generate images ───
        if generate_images and image_prompts:
            _set_step(job_id, "generating_images")
            out_dir = os.path.join(OUTPUT_DIR, f"shopify_{job_id}")
            os.makedirs(out_dir, exist_ok=True)

            # The frontend keys slots by the Shopify product id (what it sees in
            # the collection preview). Our ShopifyImportItem has a separate
            # internal UUID, so match on source_product_id — not `id` — otherwise
            # every product ends up with an empty slot list and no images are
            # generated.
            prompts_by_product: dict[str, list[dict]] = {}
            for slot in image_prompts:
                key = str(slot.get("item_id") or "")
                if key:
                    prompts_by_product.setdefault(key, []).append(slot)

            for snap in items_snapshot:
                slots = prompts_by_product.get(str(snap["source_product_id"] or ""), [])
                ref_url = (snap["images"][0]["src"] if snap["images"] else "")
                ref_path = await _download_to_temp(ref_url) if ref_url else None

                for idx, slot in enumerate(slots):
                    prompt = (slot.get("prompt") or "").strip()
                    if not prompt:
                        continue
                    model_id = slot.get("model") or "flux-dev"
                    style = slot.get("style") or ""
                    full_prompt = f"{prompt}. {style}".strip(". ").strip()
                    out_path = os.path.join(out_dir, f"{snap['id']}_{idx+1:02d}.png")
                    seed = (idx + 1) * 1000 + (hash(full_prompt) % 10000)
                    try:
                        if ref_path:
                            await fal.generate_image(
                                ref_path, full_prompt, "1:1", seed, out_path, model_id
                            )
                        else:
                            await fal.generate_image_from_text(
                                full_prompt, "1:1", seed, out_path, model_id
                            )
                        with Session(engine) as s:
                            asset = GeneratedAsset(
                                job_id=gen_job_id,
                                variant_index=idx + 1,
                                asset_type="image",
                                format="1:1",
                                file_path=out_path,
                                shopify_item_id=snap["id"],
                            )
                            s.add(asset)
                            s.commit()
                        _increment_gen_job_done(gen_job_id)
                    except Exception as e:
                        print(f"[shopify_import] image gen failed {snap['id']}/{idx}: {e}")

                _increment_done(job_id)
                if ref_path and os.path.exists(ref_path):
                    try:
                        os.remove(ref_path)
                    except Exception:
                        pass

        with Session(engine) as s:
            job = s.get(ShopifyImportJob, job_id)
            job.status = "done"
            job.step = "ready"
            job.completed_at = datetime.utcnow()
            s.add(job)
            # flip sidecar generation job too
            gj = s.get(GenerationJob, gen_job_id)
            if gj:
                gj.status = "done"
                s.add(gj)
            s.commit()

    except Exception as e:
        print(f"[shopify_import] job {job_id} failed: {e}")
        with Session(engine) as s:
            j = s.get(ShopifyImportJob, job_id)
            if j:
                j.status = "failed"
                j.error = str(e)[:500]
                j.completed_at = datetime.utcnow()
                s.add(j)
                s.commit()
