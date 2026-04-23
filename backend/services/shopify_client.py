"""Minimal async wrapper around the Shopify Admin REST API.

Supports two auth modes:

- "static"    → legacy long-lived Admin API access token (``shpat_…``) for
                stores that can still generate one.
- "oauth_cc"  → client-credentials grant (Jan-2026+). We exchange
                ``client_id + client_secret`` for a short-lived access token
                that lasts ~24h and refresh it automatically when needed.
"""
from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any, Callable, Iterable, Optional

import httpx
from fastapi import HTTPException

API_VERSION = "2024-10"
DEFAULT_TIMEOUT = 30.0
TOKEN_EXPIRY_BUFFER = timedelta(minutes=5)


def _normalize_domain(raw: str) -> str:
    d = raw.strip().lower()
    d = re.sub(r"^https?://", "", d)
    d = d.split("/")[0]
    if not d.endswith(".myshopify.com") and "." not in d:
        d = f"{d}.myshopify.com"
    return d


def parse_source_domain(url: str) -> Optional[str]:
    """Pull a shop domain out of a pasted URL, or None if it's just a handle."""
    if not url:
        return None
    m = re.search(r"https?://([a-zA-Z0-9\-]+\.myshopify\.com)", url)
    if m:
        return m.group(1).lower()
    m = re.search(r"https?://([a-zA-Z0-9\-\.]+)", url)
    if m:
        return m.group(1).lower()
    return None


def parse_collection_identifier(url: str) -> dict:
    """Extract a collection handle or numeric id from a URL/slug.

    Accepts:
      - Full storefront URL: .../collections/summer-sale
      - Full admin URL:      .../admin/collections/12345
      - Admin GraphQL GID:   gid://shopify/Collection/12345
      - Bare id:             12345
      - Bare handle:         summer-sale
    Handles are lowercased since Shopify stores them lowercased.
    """
    if not url:
        raise HTTPException(400, "collection_url is required")
    raw = url.strip()

    gid_match = re.search(r"Collection/(\d+)", raw)
    if gid_match:
        return {"id": gid_match.group(1)}

    admin_match = re.search(r"/admin/collections/(\d+)", raw)
    if admin_match:
        return {"id": admin_match.group(1)}

    m = re.search(r"/collections/([a-zA-Z0-9\-_%]+)", raw)
    if m:
        return {"handle": m.group(1).lower()}

    if raw.isdigit():
        return {"id": raw}

    slug = raw.rstrip("/").split("/")[-1]
    if slug:
        return {"handle": slug.lower()}
    raise HTTPException(400, "Could not parse collection URL")


async def fetch_public_collection_products(
    source_domain: str, handle: Optional[str], limit: int = 250
) -> list[dict]:
    """Scrape products from a Shopify storefront's public JSON endpoint.

    Works without any authentication for most stores — Shopify exposes
    ``/collections/{handle}/products.json`` and ``/products.json`` by default
    for public product listings. Stores can disable this with password
    protection or customised Liquid, in which case we return an empty list.

    Shape returned matches the Admin REST product payload (title, body_html,
    variants[], images[], tags, handle, id) so downstream code doesn't care
    which source it came from.
    """
    domain = _normalize_domain(source_domain)
    if handle and handle != "all":
        path = f"https://{domain}/collections/{handle}/products.json"
    else:
        path = f"https://{domain}/products.json"

    products: list[dict] = []
    page = 1
    per_page = min(limit, 250)
    remaining = limit
    async with httpx.AsyncClient(timeout=DEFAULT_TIMEOUT, follow_redirects=True) as client:
        while remaining > 0:
            r = await client.get(path, params={"limit": per_page, "page": page})
            if r.status_code == 404:
                break
            if r.status_code >= 400:
                raise HTTPException(
                    400,
                    f"Source store {domain} returned {r.status_code} — it may have the "
                    "storefront blocked or the collection handle is wrong.",
                )
            try:
                batch = r.json().get("products", []) or []
            except Exception:
                raise HTTPException(
                    400,
                    f"Source store {domain} didn't return JSON. It may be password-protected.",
                )
            if not batch:
                break
            products.extend(batch)
            remaining -= len(batch)
            if len(batch) < per_page:
                break
            page += 1

    # Normalize: public JSON returns slightly different fields than admin.
    # - Admin has `image.src`; public has same
    # - Admin has `tags` as comma-string; public has list — normalize to list
    # - Admin has `body_html`; public has `body_html` too
    for p in products:
        if isinstance(p.get("tags"), list):
            p["tags"] = ", ".join(p["tags"])
        # Normalize images array
        p.setdefault("images", [])
    return products


async def exchange_client_credentials(
    shop_domain: str, client_id: str, client_secret: str
) -> dict:
    """Trade client_id + client_secret for a short-lived access token.

    Returns ``{"access_token": str, "expires_at": datetime|None, "scope": str}``.
    Raises HTTPException with status 400 if Shopify rejects the credentials.
    """
    domain = _normalize_domain(shop_domain)
    url = f"https://{domain}/admin/oauth/access_token"
    payload = {
        "grant_type": "client_credentials",
        "client_id": client_id.strip(),
        "client_secret": client_secret.strip(),
    }

    # Explicit per-operation timeouts so a network stall can't hang the UI
    # forever even if the parent httpx default semantics change across versions.
    timeout = httpx.Timeout(connect=5.0, read=10.0, write=5.0, pool=5.0)
    # follow_redirects=False on purpose: Shopify redirects OAuth requests to
    # its merchant login page for Custom Apps that don't support the
    # client_credentials grant. We want to detect that as an error (below)
    # rather than silently serving an HTML login body as "success".
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        try:
            # Shopify OAuth spec: application/x-www-form-urlencoded.
            r = await client.post(url, data=payload)
        except httpx.HTTPError as e:
            raise HTTPException(504, f"Could not reach Shopify OAuth ({domain}): {e}")
        # Some partner-managed apps accept JSON — fall back only on 415.
        if r.status_code == 415:
            try:
                r = await client.post(url, json=payload)
            except httpx.HTTPError as e:
                raise HTTPException(504, f"Could not reach Shopify OAuth ({domain}): {e}")

    if r.status_code in (301, 302, 303, 307, 308):
        raise HTTPException(
            400,
            "This Shopify app doesn't appear to support the client_credentials grant "
            "(Shopify redirected the token request to its login page). Most Custom Apps "
            "don't — use the 'Admin API token (legacy)' mode and paste the shpat_… token "
            "from Apps → Develop apps → your app → API credentials instead.",
        )
    if r.status_code in (400, 401, 403):
        detail = ""
        try:
            detail = r.json().get("error_description") or r.json().get("error") or r.text[:200]
        except Exception:
            detail = r.text[:200]
        raise HTTPException(
            400,
            f"Shopify rejected the client credentials ({r.status_code}). "
            f"Check the shop domain, Client ID and Client Secret, and that the app is installed. "
            f"Details: {detail}",
        )
    if r.status_code >= 400:
        raise HTTPException(r.status_code, f"Shopify token exchange failed: {r.text[:300]}")

    try:
        data = r.json()
    except Exception:
        raise HTTPException(502, f"Shopify returned non-JSON body: {r.text[:200]}")

    token = data.get("access_token")
    if not token:
        raise HTTPException(400, f"Shopify did not return an access_token: {data}")
    expires_in = data.get("expires_in")
    expires_at = (
        datetime.utcnow() + timedelta(seconds=int(expires_in)) if expires_in else None
    )
    return {
        "access_token": token,
        "expires_at": expires_at,
        "scope": data.get("scope", ""),
    }


class ShopifyClient:
    def __init__(
        self,
        shop_domain: str,
        access_token: str,
        *,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        expires_at: Optional[datetime] = None,
        on_refresh: Optional[Callable[[str, Optional[datetime]], None]] = None,
    ):
        self.shop_domain = _normalize_domain(shop_domain)
        self.access_token = (access_token or "").strip()
        self.client_id = client_id
        self.client_secret = client_secret
        self.expires_at = expires_at
        self._on_refresh = on_refresh
        self.base = f"https://{self.shop_domain}/admin/api/{API_VERSION}"

    def _token_expired(self) -> bool:
        if not self.expires_at:
            return False
        return datetime.utcnow() + TOKEN_EXPIRY_BUFFER >= self.expires_at

    async def _ensure_token(self) -> None:
        if self.client_id and self.client_secret and (not self.access_token or self._token_expired()):
            result = await exchange_client_credentials(
                self.shop_domain, self.client_id, self.client_secret
            )
            self.access_token = result["access_token"]
            self.expires_at = result["expires_at"]
            if self._on_refresh:
                self._on_refresh(self.access_token, self.expires_at)

    def _headers(self, extra: Optional[dict] = None) -> dict:
        h = {
            "X-Shopify-Access-Token": self.access_token,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if extra:
            h.update(extra)
        return h

    async def _request(
        self,
        method: str,
        path: str,
        params: Optional[dict] = None,
        json: Optional[dict] = None,
    ) -> Any:
        await self._ensure_token()
        url = f"{self.base}{path}"
        timeout = httpx.Timeout(connect=5.0, read=DEFAULT_TIMEOUT, write=10.0, pool=5.0)
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
            r = await client.request(method, url, params=params, json=json, headers=self._headers())
        # Expired between checks: refresh once and retry
        if r.status_code == 401 and self.client_id and self.client_secret:
            self.access_token = ""
            await self._ensure_token()
            async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
                r = await client.request(method, url, params=params, json=json, headers=self._headers())
        # NOTE: never propagate 401 upstream — the app's axios interceptor
        # treats any 401 as "our auth failed" and logs the user out. Shopify
        # auth errors are bad-request style (wrong token), not app-auth errors.
        if r.status_code == 401:
            raise HTTPException(400, "Shopify token rejected. Check the shop domain and the Admin API access token.")
        if r.status_code == 403:
            raise HTTPException(400, "Shopify token lacks required scopes. Enable read/write access for products and collections.")
        if r.status_code == 404:
            raise HTTPException(404, f"Shopify resource not found: {path}")
        if r.status_code == 429:
            raise HTTPException(429, "Shopify rate limit hit, retry shortly.")
        if r.status_code >= 400:
            safe_status = 400 if r.status_code == 401 else r.status_code
            raise HTTPException(safe_status, f"Shopify error {r.status_code}: {r.text[:300]}")
        if not r.content:
            return {}
        return r.json()

    # ── Shop ──

    async def get_shop(self) -> dict:
        data = await self._request("GET", "/shop.json")
        return data.get("shop", {})

    # ── Collections / products ──

    async def resolve_collection_id(self, identifier: dict) -> Optional[int]:
        """Given {handle|id}, return a numeric collection id, or None if not found."""
        if "id" in identifier:
            return int(identifier["id"])
        handle = identifier["handle"]
        # try custom collections first, then smart collections
        for path in ("/custom_collections.json", "/smart_collections.json"):
            data = await self._request("GET", path, params={"handle": handle, "limit": 1})
            key = path.strip("/").split(".")[0]
            items = data.get(key, [])
            if items:
                return items[0]["id"]
        return None

    async def list_collection_products(self, collection_id: int, limit: int = 250) -> list[dict]:
        data = await self._request(
            "GET",
            f"/collections/{collection_id}/products.json",
            params={"limit": min(limit, 250)},
        )
        return data.get("products", [])

    async def list_all_products(self, limit: int = 250) -> list[dict]:
        """List every product in the shop. Used when the user pastes the
        pseudo-collection /collections/all (which doesn't exist in the API).
        """
        data = await self._request(
            "GET",
            "/products.json",
            params={"limit": min(limit, 250)},
        )
        return data.get("products", [])

    async def get_product(self, product_id: str) -> dict:
        data = await self._request("GET", f"/products/{product_id}.json")
        return data.get("product", {})

    # ── Draft creation ──

    async def create_draft_product(
        self,
        title: str,
        body_html: str,
        price: str = "0.00",
        tags: Iterable[str] = (),
        image_urls: Iterable[str] = (),
        variants: Optional[list[dict]] = None,
        options: Optional[list[dict]] = None,
    ) -> dict:
        # Build variants payload: preserve option1/2/3, price, sku, barcode,
        # compare_at_price from source when provided; fall back to a single
        # variant with just the price for simple products.
        if variants:
            variants_payload: list[dict] = []
            for v in variants:
                vp: dict[str, Any] = {}
                for key in ("option1", "option2", "option3", "sku", "barcode"):
                    val = v.get(key)
                    if val is not None and val != "":
                        vp[key] = val
                vprice = v.get("price")
                vp["price"] = str(vprice) if vprice not in (None, "") else str(price)
                cap = v.get("compare_at_price")
                if cap not in (None, ""):
                    vp["compare_at_price"] = str(cap)
                variants_payload.append(vp)
        else:
            variants_payload = [{"price": str(price)}]

        product: dict[str, Any] = {
            "title": title,
            "body_html": body_html,
            "status": "draft",
            "tags": ", ".join(tags),
            "variants": variants_payload,
            "images": [{"src": u} for u in image_urls if u],
        }

        # options are required by Shopify whenever a variant uses option1/2/3.
        # Shape: [{name: "Size", position: 1, values: ["S","M","L"]}, ...].
        # Shopify also accepts just [{name}, …] and derives values from variants,
        # which keeps us robust to malformed option payloads scraped from the
        # public JSON feed.
        if options:
            clean_opts: list[dict] = []
            for idx, o in enumerate(options):
                name = (o.get("name") or "").strip()
                if not name:
                    continue
                entry: dict[str, Any] = {"name": name, "position": o.get("position") or idx + 1}
                values = o.get("values") or []
                if isinstance(values, list) and values:
                    entry["values"] = [str(x) for x in values if str(x).strip()]
                clean_opts.append(entry)
            if clean_opts:
                product["options"] = clean_opts

        data = await self._request("POST", "/products.json", json={"product": product})
        return data.get("product", {})
