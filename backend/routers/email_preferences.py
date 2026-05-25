"""拼拼看Me - 邮件偏好路由"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models.user import User
from models.email_preference import EmailPreference
from routers.auth import get_current_user
from services.email import send_email

router = APIRouter(prefix="/api/email", tags=["邮件偏好"])


# ---------- Schemas ----------


class EmailPreferencesResponse(BaseModel):
    """用户邮件偏好响应"""
    password_reset: bool
    checkin_reminder: bool
    weekly_report: bool
    milestone: bool


class EmailPreferencesUpdate(BaseModel):
    """更新邮件偏好（不传的字段保持不变）"""
    checkin_reminder: bool | None = None
    weekly_report: bool | None = None
    milestone: bool | None = None
    # password_reset 为安全类邮件，不可关闭


# ---------- Helper ----------


def _get_or_create_prefs(db: Session, user_id: int) -> EmailPreference:
    """获取用户偏好，不存在则创建默认偏好。"""
    pref = db.query(EmailPreference).filter(
        EmailPreference.user_id == user_id
    ).first()
    if not pref:
        pref = EmailPreference(user_id=user_id)
        db.add(pref)
        db.commit()
        db.refresh(pref)
    return pref


# ---------- Endpoints ----------


@router.get("/preferences", response_model=EmailPreferencesResponse)
async def get_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """获取当前用户的邮件偏好设置。"""
    pref = _get_or_create_prefs(db, current_user.id)
    return EmailPreferencesResponse(
        password_reset=pref.password_reset,
        checkin_reminder=pref.checkin_reminder,
        weekly_report=pref.weekly_report,
        milestone=pref.milestone,
    )


@router.put("/preferences", response_model=EmailPreferencesResponse)
async def update_preferences(
    body: EmailPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """更新邮件偏好设置。"""
    pref = _get_or_create_prefs(db, current_user.id)

    if body.checkin_reminder is not None:
        pref.checkin_reminder = body.checkin_reminder
    if body.weekly_report is not None:
        pref.weekly_report = body.weekly_report
    if body.milestone is not None:
        pref.milestone = body.milestone

    db.commit()
    db.refresh(pref)

    return EmailPreferencesResponse(
        password_reset=pref.password_reset,
        checkin_reminder=pref.checkin_reminder,
        weekly_report=pref.weekly_report,
        milestone=pref.milestone,
    )


@router.post("/test")
async def send_test_email(
    current_user: User = Depends(get_current_user),
):
    """发送测试邮件到当前用户邮箱。"""
    html = """
    <h2 style="color: #6c5ce7;">✅ 测试邮件发送成功</h2>
    <p>如果你收到了这封邮件，说明拼拼看Me的邮件系统配置正常。</p>
    <p>如果你没有请求此测试邮件，请忽略。</p>
    """
    success = await send_email(
        current_user.email,
        "拼拼看Me - 邮件配置测试",
        html,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="邮件发送失败，请检查 SMTP 配置",
        )
    return {"message": "测试邮件已发送"}
