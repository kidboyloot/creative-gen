import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlmodel import Session, select
from pydantic import BaseModel, EmailStr
from jose import jwt, JWTError
from passlib.context import CryptContext

from database import get_session
from models import User, CreditTransaction

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
}


# ── Schemas ──

class RegisterRequest(BaseModel):
    email: str
    name: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


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


def spend_credits(user: User, amount: int, description: str, session: Session) -> None:
    """Deduct credits from user. Raises 403 if insufficient."""
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
    """Add credits to user."""
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
async def get_me(user: User = Depends(require_user)):
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        credits=user.credits,
        plan=user.plan,
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
        "credits": user.credits,
        "plan": user.plan,
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
