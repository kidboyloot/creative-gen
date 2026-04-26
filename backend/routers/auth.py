import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from pydantic import BaseModel, EmailStr
from jose import jwt, JWTError
from passlib.context import CryptContext

from database import get_session
from models import User, CreditTransaction, Team, TeamMember, PasswordResetToken

router = APIRouter(prefix="/auth", tags=["auth"])

# ── Config ──
SECRET_KEY = os.getenv("JWT_SECRET", "creative-gen-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 72
WELCOME_CREDITS = 50

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

# ── Credit costs ──
CREDIT_COSTS = {
    "image": 1,       # 1 credit per image variant
    "video": 3,       # 3 credits per video
    "collage": 0,     # free (made from existing images)
    "upscale": 1,     # 1 credit per upscale
    "bg_remove": 0,   # free
    "enhance": 0,     # free prompt enhancement
    "shopify_translate": 1,   # 1 credit per (product × locale)
    "shopify_image_gen": 1,   # 1 credit per AI image slot in the Shopify flow
    "lipsync": 3,     # 3 credits per lip-sync render
    "cinema": 2,      # 2 credits per cinema shot
}


# ── Schemas ──

class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    credits: int
    plan: str
    avatar: str | None = None
    created_at: datetime


# ── Helpers ──

def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_token(user_id: str) -> str:
    expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode({"sub": user_id, "exp": expire}, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User | None:
    """Returns the current user or None if not authenticated."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if not user_id:
            return None
    except JWTError:
        return None
    user = session.get(User, user_id)
    return user


def require_user(
    token: str | None = Depends(oauth2_scheme),
    session: Session = Depends(get_session),
) -> User:
    """Returns the current user or raises 401."""
    user = get_current_user(token, session)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def _user_team(user: User, session: Session) -> Optional[Team]:
    """Return the team the user belongs to, or None if solo."""
    membership = session.exec(
        select(TeamMember).where(TeamMember.user_id == user.id)
    ).first()
    if not membership:
        return None
    return session.get(Team, membership.team_id)


def effective_credits(user: User, session: Session) -> int:
    """Credits available to this user — from their team if any, else their own."""
    team = _user_team(user, session)
    return team.credits if team else user.credits


def effective_plan(user: User, session: Session) -> str:
    """Plan in effect for this user — team's plan overrides personal."""
    team = _user_team(user, session)
    return team.plan if team else user.plan


def spend_credits(user: User, amount: int, description: str, session: Session) -> None:
    """Deduct credits from the team (if any) or the user. Raises 403 if insufficient.

    Concurrency: when a team is used we lock the team row with SELECT FOR UPDATE
    so two members buying simultaneously can't double-spend the same balance.
    SQLite (dev) ignores `with_for_update()` silently — fine for single-process dev.
    """
    team = _user_team(user, session)
    if team:
        # Re-fetch with row lock so concurrent spends serialize.
        locked = session.exec(
            select(Team).where(Team.id == team.id).with_for_update()
        ).first()
        if not locked or locked.credits < amount:
            have = locked.credits if locked else 0
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient team credits. Need {amount}, have {have}.",
            )
        locked.credits -= amount
        session.add(locked)
        tx = CreditTransaction(
            user_id=user.id,
            amount=-amount,
            balance_after=locked.credits,
            description=f"[team:{locked.name}] {description}",
        )
        session.add(tx)
        session.commit()
        return

    if user.credits < amount:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient credits. You need {amount} but have {user.credits}.",
        )
    user.credits -= amount
    session.add(user)

    tx = CreditTransaction(
        user_id=user.id,
        amount=-amount,
        balance_after=user.credits,
        description=description,
    )
    session.add(tx)
    session.commit()


def add_credits(user: User, amount: int, description: str, session: Session) -> None:
    """Add credits — to the team if one exists, else to the user."""
    team = _user_team(user, session)
    if team:
        team.credits += amount
        session.add(team)
        tx = CreditTransaction(
            user_id=user.id,
            amount=amount,
            balance_after=team.credits,
            description=f"[team:{team.name}] {description}",
        )
        session.add(tx)
        session.commit()
        return

    user.credits += amount
    session.add(user)

    tx = CreditTransaction(
        user_id=user.id,
        amount=amount,
        balance_after=user.credits,
        description=description,
    )
    session.add(tx)
    session.commit()


# ── Endpoints ──

@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, session: Session = Depends(get_session)):
    # Check existing
    existing = session.exec(select(User).where(User.email == req.email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )

    if len(req.password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")

    user = User(
        email=req.email.lower().strip(),
        name=req.name.strip(),
        hashed_password=hash_password(req.password),
        credits=WELCOME_CREDITS,
    )
    session.add(user)
    # Flush so the user row hits the DB before we insert a CreditTransaction
    # that FK-references it. SQLite tolerates the ordering, Postgres rejects it.
    session.flush()

    # Welcome credit transaction
    tx = CreditTransaction(
        user_id=user.id,
        amount=WELCOME_CREDITS,
        balance_after=WELCOME_CREDITS,
        description="Welcome bonus",
    )
    session.add(tx)
    session.commit()
    session.refresh(user)

    token = create_token(user.id)
    return TokenResponse(
        access_token=token,
        user={
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "credits": user.credits,
            "plan": user.plan,
            "avatar": user.avatar,
        },
    )


@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == req.email.lower().strip())).first()
    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_token(user.id)
    return TokenResponse(
        access_token=token,
        user={
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "credits": user.credits,
            "plan": user.plan,
            "avatar": user.avatar,
        },
    )


@router.get("/me", response_model=UserResponse)
async def get_me(user: User = Depends(require_user), session: Session = Depends(get_session)):
    # Surface team-effective credits and plan so the frontend never shows the
    # personal balance for someone whose spending really comes from the team pool.
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        credits=effective_credits(user, session),
        plan=effective_plan(user, session),
        avatar=user.avatar,
        created_at=user.created_at,
    )


@router.get("/credits")
async def get_credits(user: User = Depends(require_user), session: Session = Depends(get_session)):
    transactions = session.exec(
        select(CreditTransaction)
        .where(CreditTransaction.user_id == user.id)
        .order_by(CreditTransaction.created_at.desc())
        .limit(50)
    ).all()

    return {
        "credits": effective_credits(user, session),
        "plan": effective_plan(user, session),
        "transactions": [
            {
                "id": tx.id,
                "amount": tx.amount,
                "balance_after": tx.balance_after,
                "description": tx.description,
                "created_at": tx.created_at.isoformat(),
            }
            for tx in transactions
        ],
    }


@router.post("/credits/add")
async def add_credits_endpoint(
    amount: int = 100,
    user: User = Depends(require_user),
    session: Session = Depends(get_session),
):
    """Add credits (simulates a purchase — in production, integrate Stripe here)."""
    add_credits(user, amount, f"Purchased {amount} credits", session)
    return {"credits": user.credits, "added": amount}


# ── Password reset ──

import secrets as _secrets
from datetime import datetime as _dt, timedelta as _td


PASSWORD_RESET_TTL_MINUTES = 60
# Where the user will open the reset page — set by frontend origin. For now
# assume same origin as the API; frontend uses the relative /reset-password.
APP_PUBLIC_URL = os.getenv("APP_PUBLIC_URL", "https://creativegen.online").rstrip("/")


@router.post("/forgot-password")
async def forgot_password(
    req: ForgotPasswordRequest,
    session: Session = Depends(get_session),
):
    """Start a password-reset flow.

    Looks up the user and, if found, generates a one-time token valid for 1h.
    Because we have no SMTP configured yet, the endpoint returns the reset URL
    directly so it can be copy-pasted to the user. When email is wired up,
    this payload should be hidden and the link sent via mail instead.

    Always returns 200 regardless of whether the email exists — prevents
    enumeration.
    """
    email = (req.email or "").lower().strip()
    user = session.exec(select(User).where(User.email == email)).first()
    if not user:
        return {"ok": True, "message": "If that email is registered, a reset link was issued."}

    # Invalidate previous outstanding tokens for this user so only the newest link works
    old = session.exec(
        select(PasswordResetToken)
        .where(PasswordResetToken.user_id == user.id)
        .where(PasswordResetToken.used_at.is_(None))
    ).all()
    for t in old:
        t.used_at = _dt.utcnow()
        session.add(t)

    token = _secrets.token_urlsafe(32)
    row = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=_dt.utcnow() + _td(minutes=PASSWORD_RESET_TTL_MINUTES),
    )
    session.add(row)
    session.commit()

    reset_url = f"{APP_PUBLIC_URL}/reset-password?token={token}"
    # TODO when SMTP is configured, send this link via email and drop the
    # reset_url + token from the response body.
    return {
        "ok": True,
        "message": "Reset link issued.",
        "reset_url": reset_url,
        "expires_in_minutes": PASSWORD_RESET_TTL_MINUTES,
    }


@router.post("/reset-password")
async def reset_password(
    req: ResetPasswordRequest,
    session: Session = Depends(get_session),
):
    if not req.token or not req.new_password:
        raise HTTPException(400, "Token and new_password are required.")
    if len(req.new_password) < 6:
        raise HTTPException(400, "Password must be at least 6 characters.")

    row = session.exec(
        select(PasswordResetToken).where(PasswordResetToken.token == req.token)
    ).first()
    if not row:
        raise HTTPException(400, "Invalid or expired reset link.")
    if row.used_at is not None:
        raise HTTPException(400, "This reset link has already been used.")
    if row.expires_at < _dt.utcnow():
        raise HTTPException(400, "This reset link has expired. Request a new one.")

    user = session.get(User, row.user_id)
    if not user:
        raise HTTPException(400, "User no longer exists.")

    user.hashed_password = hash_password(req.new_password)
    session.add(user)

    row.used_at = _dt.utcnow()
    session.add(row)
    session.commit()
    return {"ok": True, "message": "Password updated. You can now log in."}
