"""
邀请系统路由 — 分享裂变
- POST /api/invites/  生成邀请码
- GET /api/invites/{code}  验证邀请码（新用户注册时调用）
- POST /api/invites/{code}/redeem  兑换邀请奖励
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
import secrets

from database import get_db
from models import User
from routers.auth import get_current_user

router = APIRouter(prefix="/api/invites", tags=["invites"])


class InviteCreate(BaseModel):
    source: str = "dashboard"


class InviteResponse(BaseModel):
    code: str
    created_at: str
    source: str


class InviteRedeemResponse(BaseModel):
    success: bool
    bonus_fusions: int


# 内存存储（生产环境应改用数据库表）
_invites: dict[str, dict] = {}


@router.post("", response_model=InviteResponse)
async def create_invite(
    payload: InviteCreate,
    current_user: User = Depends(get_current_user),
):
    """生成邀请码"""
    code = secrets.token_urlsafe(8)
    _invites[code] = {
        "inviter_id": current_user.id,
        "source": payload.source,
        "created_at": datetime.utcnow().isoformat(),
        "redeemed": False,
    }
    return InviteResponse(
        code=code,
        created_at=_invites[code]["created_at"],
        source=payload.source,
    )


@router.get("/{code}")
async def get_invite(code: str):
    """验证邀请码是否有效"""
    invite = _invites.get(code)
    if not invite:
        raise HTTPException(status_code=404, detail="邀请码不存在")
    if invite["redeemed"]:
        raise HTTPException(status_code=400, detail="邀请码已使用")
    # 邀请码7天有效
    created = datetime.fromisoformat(invite["created_at"])
    if datetime.utcnow() - created > timedelta(days=7):
        raise HTTPException(status_code=400, detail="邀请码已过期")
    return {"valid": True, "source": invite["source"]}


@router.post("/{code}/redeem", response_model=InviteRedeemResponse)
async def redeem_invite(
    code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """兑换邀请奖励"""
    invite = _invites.get(code)
    if not invite:
        raise HTTPException(status_code=404, detail="邀请码不存在")
    if invite["redeemed"]:
        raise HTTPException(status_code=400, detail="邀请码已使用")
    if invite["inviter_id"] == current_user.id:
        raise HTTPException(status_code=400, detail="不能兑换自己的邀请码")

    invite["redeemed"] = True
    invite["redeemed_by"] = current_user.id
    invite["redeemed_at"] = datetime.utcnow().isoformat()

    # 给双方各加5次免费融合
    # TODO: 实现用量增加逻辑（需配合 UsageBar 组件）
    # 这里先返回成功

    return InviteRedeemResponse(success=True, bonus_fusions=5)
