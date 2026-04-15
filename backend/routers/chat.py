import os
import json
import uuid
import asyncio
import pdfplumber
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import List, Optional
from sqlmodel import Session, select

import google.generativeai as genai

from database import get_session
from models import User, GenerationJob, CreditTransaction
from routers.auth import require_user

router = APIRouter(prefix="/chat", tags=["chat"])

# Configure Gemini
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# In-memory knowledge base (per-user document store)
# In production, persist to DB
knowledge_base: dict[str, list[dict]] = {}  # user_id -> [{id, name, content}]

SYSTEM_PROMPT = """You are Vendro AI — a smart, friendly ecommerce & creative strategist assistant built into CreativeGen.

You help users with:
- Ecommerce strategy (dropshipping, product selection, pricing, scaling)
- Ad creative strategy (what works on Instagram, TikTok, Facebook)
- Copywriting (headlines, CTAs, product descriptions, ad copy)
- Brand building (positioning, target audience, color psychology)
- Creative generation tips (best prompts, models, formats for their goals)
- Store optimization (conversion, AOV, retention)
- Market trends and competitor analysis advice

You have access to the user's account data and uploaded knowledge documents which are provided in the context.

Be concise, actionable, and specific. Use bullet points and short paragraphs.
When suggesting ad strategies, give real examples of headlines and CTAs.
If the user asks about their data (credits, generations, etc.), reference the context provided.
If the user asks about their uploaded documents, reference the knowledge base content.
Always be encouraging and proactive with suggestions.
Respond in the same language the user writes in."""


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


@router.post("")
async def chat(
    req: ChatRequest,
    session: Session = Depends(get_session),
    user: User = Depends(require_user),
):
    if not GOOGLE_API_KEY:
        raise HTTPException(500, "GOOGLE_API_KEY not configured. Get a free key from https://aistudio.google.com/apikey")

    # Build user context
    jobs = session.exec(
        select(GenerationJob)
        .where(GenerationJob.user_id == user.id)
        .order_by(GenerationJob.created_at.desc())
        .limit(10)
    ).all()

    recent_txs = session.exec(
        select(CreditTransaction)
        .where(CreditTransaction.user_id == user.id)
        .order_by(CreditTransaction.created_at.desc())
        .limit(10)
    ).all()

    total_assets = sum(j.done_assets for j in jobs)
    credits_spent = sum(abs(t.amount) for t in recent_txs if t.amount < 0)

    user_context = (
        f"\n--- USER DATA ---\n"
        f"Name: {user.name}\n"
        f"Plan: {user.plan}\n"
        f"Credits remaining: {user.credits}\n"
        f"Credits spent recently: {credits_spent}\n"
        f"Total generation jobs: {len(jobs)}\n"
        f"Total assets created: {total_assets}\n"
    )

    if jobs:
        user_context += "\nRecent generations:\n"
        for j in jobs[:5]:
            user_context += f"  - \"{j.prompt[:80]}\" | Model: {j.model} | {j.done_assets} assets | {j.status}\n"

    # Add knowledge base docs
    user_docs = knowledge_base.get(user.id, [])
    if user_docs:
        user_context += f"\n--- KNOWLEDGE BASE ({len(user_docs)} documents) ---\n"
        for doc in user_docs:
            # Truncate to avoid exceeding context limits
            content = doc["content"][:3000]
            user_context += f"\n[Document: {doc['name']}]\n{content}\n"

    # Build Gemini conversation
    model = genai.GenerativeModel(
        "gemini-2.5-flash",
        system_instruction=f"{SYSTEM_PROMPT}\n{user_context}",
    )

    # Convert messages to Gemini format
    gemini_history = []
    for msg in req.messages[:-1]:  # all except last
        gemini_history.append({
            "role": "user" if msg.role == "user" else "model",
            "parts": [msg.content],
        })

    try:
        chat_session = model.start_chat(history=gemini_history)
        last_msg = req.messages[-1].content if req.messages else ""
        response = await asyncio.to_thread(
            chat_session.send_message, last_msg
        )
        reply = response.text
    except Exception as e:
        raise HTTPException(500, f"Chat failed: {e}")

    return {"reply": reply.strip()}


# ── Knowledge Base (PDF/Document Upload) ──

@router.post("/upload-doc")
async def upload_document(
    file: UploadFile = File(...),
    user: User = Depends(require_user),
):
    """Upload a PDF or text document to the knowledge base."""
    filename = file.filename or "document"
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    content = ""

    if ext == "pdf":
        # Save temporarily and extract text
        tmp_path = f"/tmp/{uuid.uuid4()}.pdf"
        with open(tmp_path, "wb") as f:
            data = await file.read()
            f.write(data)

        try:
            with pdfplumber.open(tmp_path) as pdf:
                pages = []
                for page in pdf.pages:
                    text = page.extract_text()
                    if text:
                        pages.append(text)
                content = "\n\n".join(pages)
        finally:
            os.remove(tmp_path)

    elif ext in ("txt", "md", "csv"):
        data = await file.read()
        content = data.decode("utf-8", errors="ignore")

    else:
        raise HTTPException(400, "Supported formats: PDF, TXT, MD, CSV")

    if not content.strip():
        raise HTTPException(400, "Could not extract text from this file")

    doc_id = str(uuid.uuid4())
    doc = {
        "id": doc_id,
        "name": filename,
        "content": content,
        "chars": len(content),
    }

    if user.id not in knowledge_base:
        knowledge_base[user.id] = []
    knowledge_base[user.id].append(doc)

    return {
        "id": doc_id,
        "name": filename,
        "chars": len(content),
        "pages": content.count("\n\n") + 1,
        "total_docs": len(knowledge_base[user.id]),
    }


@router.get("/docs")
async def list_documents(user: User = Depends(require_user)):
    """List all uploaded knowledge base documents."""
    docs = knowledge_base.get(user.id, [])
    return [
        {"id": d["id"], "name": d["name"], "chars": d["chars"]}
        for d in docs
    ]


@router.delete("/docs/{doc_id}")
async def delete_document(doc_id: str, user: User = Depends(require_user)):
    """Remove a document from the knowledge base."""
    docs = knowledge_base.get(user.id, [])
    knowledge_base[user.id] = [d for d in docs if d["id"] != doc_id]
    return {"ok": True, "remaining": len(knowledge_base.get(user.id, []))}
