"""HTTP client for api.muapi.ai.

Async submit + poll pattern:
    POST /api/v1/{endpoint}                  -> { request_id }
    GET  /api/v1/predictions/{id}/result      -> { status, outputs: [...] }
    POST /api/v1/upload_file                  -> { url }

All requests authenticate via the `x-api-key` header.
"""
import os
import asyncio
import httpx

MUAPI_KEY = os.getenv("MUAPI_KEY", "")
MUAPI_BASE = os.getenv("MUAPI_BASE", "https://api.muapi.ai").rstrip("/")
MUAPI_API = f"{MUAPI_BASE}/api/v1"


def is_muapi_configured() -> bool:
    return bool(MUAPI_KEY)


def _headers() -> dict:
    return {"x-api-key": MUAPI_KEY, "Content-Type": "application/json"}


async def muapi_submit(endpoint: str, payload: dict, timeout: float = 60.0) -> dict:
    """POST to /api/v1/{endpoint} — returns the submit response (with request_id)."""
    if not MUAPI_KEY:
        raise RuntimeError("MUAPI_KEY not set in backend/.env")
    url = f"{MUAPI_API}/{endpoint.lstrip('/')}"
    async with httpx.AsyncClient(timeout=timeout) as client:
        r = await client.post(url, json=payload, headers=_headers())
        if r.status_code >= 400:
            raise RuntimeError(f"muapi submit failed [{r.status_code}]: {r.text[:300]}")
        return r.json()


async def muapi_poll(request_id: str, max_attempts: int = 300, interval: float = 2.0) -> dict:
    """Poll /predictions/{id}/result until status is terminal. Returns the final response dict."""
    url = f"{MUAPI_API}/predictions/{request_id}/result"
    async with httpx.AsyncClient(timeout=30.0) as client:
        for attempt in range(1, max_attempts + 1):
            await asyncio.sleep(interval)
            try:
                r = await client.get(url, headers=_headers())
            except httpx.RequestError as e:
                if attempt == max_attempts:
                    raise
                continue
            if r.status_code >= 500:
                continue
            if r.status_code >= 400:
                raise RuntimeError(f"muapi poll failed [{r.status_code}]: {r.text[:300]}")
            data = r.json()
            status = (data.get("status") or "").lower()
            if status in ("completed", "succeeded", "success"):
                return data
            if status in ("failed", "error"):
                err = data.get("error") or data.get("message") or "unknown"
                raise RuntimeError(f"muapi generation failed: {err}")
            # otherwise still processing — keep polling
    raise RuntimeError("muapi polling timed out")


async def muapi_run(endpoint: str, payload: dict) -> dict:
    """Submit + poll combined. Returns the final result dict (with `outputs` array)."""
    submit = await muapi_submit(endpoint, payload)
    request_id = submit.get("request_id") or submit.get("id")
    if not request_id:
        # Some endpoints return synchronously
        return submit
    return await muapi_poll(request_id)


def extract_url(result: dict) -> str:
    """Pull the asset URL out of a muapi result. Handles common shapes."""
    outputs = result.get("outputs")
    if isinstance(outputs, list) and outputs:
        first = outputs[0]
        if isinstance(first, str):
            return first
        if isinstance(first, dict):
            return first.get("url") or first.get("file_url") or ""
    if "url" in result and isinstance(result["url"], str):
        return result["url"]
    output = result.get("output")
    if isinstance(output, dict):
        return output.get("url", "")
    if isinstance(output, str):
        return output
    return ""


async def muapi_upload(file_path: str) -> str:
    """Upload a local file via /api/v1/upload_file (multipart)."""
    if not MUAPI_KEY:
        raise RuntimeError("MUAPI_KEY not set in backend/.env")
    url = f"{MUAPI_API}/upload_file"
    headers = {"x-api-key": MUAPI_KEY}
    async with httpx.AsyncClient(timeout=180.0) as client:
        with open(file_path, "rb") as f:
            r = await client.post(url, headers=headers, files={"file": f})
        if r.status_code >= 400:
            raise RuntimeError(f"muapi upload failed [{r.status_code}]: {r.text[:300]}")
        data = r.json()
        url = data.get("url") or data.get("file_url") or (data.get("data") or {}).get("url")
        if not url:
            raise RuntimeError(f"muapi upload returned no URL: {data}")
        return url
