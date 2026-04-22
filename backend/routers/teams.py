"""Team / shared-plan endpoints.

Owner creates a team → that team owns the credits and plan. Members the owner
invites share that pool — when they spend credits, the team balance drops.
Concurrency is handled inside spend_credits() via SELECT FOR UPDATE on the
team row, so two members can use the platform simultaneously without
double-spending the same balance.
"""
from __future__ import annotations

import secrets
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlmodel import Session, select

from database import get_session
from models import CreditTransaction, Team, TeamMember, User
from routers.auth import require_user

router = APIRouter(prefix="/teams", tags=["teams"])


# ── Schemas ──

class CreateTeamRequest(BaseModel):
    name: str


class JoinTeamRequest(BaseModel):
    invite_code: str


class TransferCreditsRequest(BaseModel):
    amount: int


class MemberInfo(BaseModel):
    user_id: str
    name: str
    email: str
    role: str
    joined_at: str


class TeamInfo(BaseModel):
    id: str
    name: str
    plan: str
    credits: int
    invite_code: Optional[str] = None  # only the owner sees this
    is_owner: bool
    members: list[MemberInfo]


# ── Helpers ──

def _team_for_user(user: User, session: Session) -> Optional[Team]:
    membership = session.exec(
        select(TeamMember).where(TeamMember.user_id == user.id)
    ).first()
    if not membership:
        return None
    return session.get(Team, membership.team_id)


def _members_payload(team: Team, session: Session) -> list[MemberInfo]:
    rows = session.exec(
        select(TeamMember).where(TeamMember.team_id == team.id)
    ).all()
    out: list[MemberInfo] = []
    for m in rows:
        u = session.get(User, m.user_id)
        if not u:
            continue
        out.append(
            MemberInfo(
                user_id=u.id,
                name=u.name,
                email=u.email,
                role=m.role,
                joined_at=m.joined_at.isoformat(),
            )
        )
    return out


def _team_info(team: Team, user: User, session: Session) -> TeamInfo:
    is_owner = team.owner_id == user.id
    return TeamInfo(
        id=team.id,
        name=team.name,
        plan=team.plan,
        credits=team.credits,
        invite_code=team.invite_code if is_owner else None,
        is_owner=is_owner,
        members=_members_payload(team, session),
    )


# ── Endpoints ──

@router.get("/me", response_model=Optional[TeamInfo])
async def my_team(
    user: User = Depends(require_user),
    session: Session = Depends(get_session),
):
    """Return the team the current user belongs to, or null if none."""
    team = _team_for_user(user, session)
    if not team:
        return None
    return _team_info(team, user, session)


@router.post("", response_model=TeamInfo)
async def create_team(
    req: CreateTeamRequest,
    user: User = Depends(require_user),
    session: Session = Depends(get_session),
):
    if _team_for_user(user, session):
        raise HTTPException(400, "You're already in a team. Leave it first.")

    name = (req.name or "").strip()
    if not name:
        raise HTTPException(400, "Team name is required.")

    # Seed the team with the owner's plan (so a paying solo user keeps their
    # plan when they upgrade to a team) but start credits at 0 — owner can
    # transfer their personal credits across explicitly.
    team = Team(
        name=name,
        owner_id=user.id,
        plan=user.plan,
        credits=0,
        invite_code=secrets.token_urlsafe(6),  # short, easy to share
    )
    session.add(team)
    session.flush()

    membership = TeamMember(team_id=team.id, user_id=user.id, role="owner")
    session.add(membership)
    session.commit()
    session.refresh(team)
    return _team_info(team, user, session)


@router.post("/join", response_model=TeamInfo)
async def join_team(
    req: JoinTeamRequest,
    user: User = Depends(require_user),
    session: Session = Depends(get_session),
):
    if _team_for_user(user, session):
        raise HTTPException(400, "Leave your current team before joining another.")

    code = (req.invite_code or "").strip()
    if not code:
        raise HTTPException(400, "Invite code required.")

    team = session.exec(select(Team).where(Team.invite_code == code)).first()
    if not team:
        raise HTTPException(404, "Invite code not recognised.")

    membership = TeamMember(team_id=team.id, user_id=user.id, role="member")
    session.add(membership)
    session.commit()
    return _team_info(team, user, session)


@router.post("/leave")
async def leave_team(
    user: User = Depends(require_user),
    session: Session = Depends(get_session),
):
    membership = session.exec(
        select(TeamMember).where(TeamMember.user_id == user.id)
    ).first()
    if not membership:
        raise HTTPException(400, "You're not in any team.")

    team = session.get(Team, membership.team_id)
    # Owners can leave only after passing ownership or removing all other members.
    if team and team.owner_id == user.id:
        other_count = session.exec(
            select(TeamMember).where(
                TeamMember.team_id == team.id,
                TeamMember.user_id != user.id,
            )
        ).first()
        if other_count:
            raise HTTPException(
                400,
                "Owner can't leave while other members exist. Remove them first or delete the team.",
            )
        # Last member who was also owner: tear down the team
        session.delete(membership)
        session.delete(team)
        session.commit()
        return {"ok": True, "deleted_team": True}

    session.delete(membership)
    session.commit()
    return {"ok": True}


@router.delete("/members/{member_user_id}")
async def remove_member(
    member_user_id: str,
    user: User = Depends(require_user),
    session: Session = Depends(get_session),
):
    team = _team_for_user(user, session)
    if not team:
        raise HTTPException(404, "Not in a team.")
    if team.owner_id != user.id:
        raise HTTPException(403, "Only the owner can remove members.")
    if member_user_id == user.id:
        raise HTTPException(400, "Owners use /leave instead.")

    membership = session.exec(
        select(TeamMember)
        .where(TeamMember.team_id == team.id)
        .where(TeamMember.user_id == member_user_id)
    ).first()
    if not membership:
        raise HTTPException(404, "Member not found in this team.")

    session.delete(membership)
    session.commit()
    return {"ok": True}


@router.post("/regenerate-invite", response_model=TeamInfo)
async def regenerate_invite(
    user: User = Depends(require_user),
    session: Session = Depends(get_session),
):
    team = _team_for_user(user, session)
    if not team:
        raise HTTPException(404, "Not in a team.")
    if team.owner_id != user.id:
        raise HTTPException(403, "Only the owner can rotate the invite code.")

    team.invite_code = secrets.token_urlsafe(6)
    session.add(team)
    session.commit()
    session.refresh(team)
    return _team_info(team, user, session)


@router.post("/transfer-credits", response_model=TeamInfo)
async def transfer_personal_credits(
    req: TransferCreditsRequest,
    user: User = Depends(require_user),
    session: Session = Depends(get_session),
):
    """Move credits from the user's personal balance into their team's pool."""
    team = _team_for_user(user, session)
    if not team:
        raise HTTPException(404, "You're not in a team.")
    if req.amount <= 0:
        raise HTTPException(400, "Amount must be positive.")
    if user.credits < req.amount:
        raise HTTPException(
            400,
            f"You only have {user.credits} personal credits to transfer.",
        )

    user.credits -= req.amount
    team.credits += req.amount
    session.add(user)
    session.add(team)

    # Two ledger rows so the user can audit both sides
    session.add(
        CreditTransaction(
            user_id=user.id,
            amount=-req.amount,
            balance_after=user.credits,
            description=f"Transferred {req.amount} credits → team {team.name}",
        )
    )
    session.add(
        CreditTransaction(
            user_id=user.id,
            amount=req.amount,
            balance_after=team.credits,
            description=f"[team:{team.name}] Received {req.amount} credits from {user.email}",
        )
    )
    session.commit()
    session.refresh(team)
    return _team_info(team, user, session)
