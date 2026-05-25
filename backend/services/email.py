"""拼拼看Me - 邮件通知服务

支持 SMTP 发送（aiosmtplib 异步）和开发模式日志打印。
开发环境（ENVIRONMENT=development）下不会真实发送邮件。"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from email.message import EmailMessage
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

from config import settings

logger = logging.getLogger(__name__)

# ---------- Jinja2 模板引擎 ----------

_TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates" / "email"
_jinja_env = Environment(
    loader=FileSystemLoader(str(_TEMPLATE_DIR)),
    autoescape=True,
)


def _render(template_name: str, **kwargs) -> str:
    """渲染邮件 HTML 模板。"""
    template = _jinja_env.get_template(template_name)
    # 注入全局变量
    kwargs.setdefault("settings", settings)
    return template.render(**kwargs)


# ---------- 邮件数据定义 ----------


@dataclass
class EmailData:
    """一封邮件的全部数据。"""
    to: str
    subject: str
    html: str


# ---------- 发送逻辑 ----------


def _is_dev() -> bool:
    """当前是否是开发环境。"""
    return settings.ENVIRONMENT == "development"


def _smtp_configured() -> bool:
    """SMTP 是否已配置（host 不为空）。"""
    return bool(settings.SMTP_HOST)


async def send_email(to: str, subject: str, html: str) -> bool:
    """发送一封邮件。

    开发环境下仅打印到日志，不真实发送。
    生产环境如果没有配置 SMTP 也会优雅降级为日志。
    """
    if _is_dev() or not _smtp_configured():
        logger.info(
            "[DEV EMAIL] To: %s | Subject: %s",
            to,
            subject,
            extra={"email": {"to": to, "subject": subject, "dev": True}},
        )
        return True

    return await _send_smtp(to, subject, html)


async def _send_smtp(to: str, subject: str, html: str) -> bool:
    """通过 SMTP 真实发送邮件。"""
    import aiosmtplib

    msg = EmailMessage()
    msg["From"] = settings.SMTP_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(
        # Fallback 纯文本 —— 去掉 HTML 标签
        html.replace("<br>", "\n").replace("</p>", "\n").replace("<li>", "· "),
        charset="utf-8",
    )
    msg.add_alternative(html, subtype="html", charset="utf-8")

    try:
        async with aiosmtplib.SMTP(
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            use_tls=False,
        ) as server:
            if settings.SMTP_PORT == 587:
                await server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASSWORD:
                await server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            await server.send_message(msg)

        logger.info(
            "邮件发送成功",
            extra={"email": {"to": to, "subject": subject}},
        )
        return True
    except Exception:
        logger.exception(
            "邮件发送失败",
            extra={"email": {"to": to, "subject": subject}},
        )
        return False


# ---------- 业务邮件接口 ----------


async def send_password_reset(to: str, reset_url: str) -> bool:
    """发送密码重置邮件。"""
    html = _render("password_reset.html", reset_url=reset_url)
    return await send_email(to, "重置你的拼拼看Me密码", html)


async def send_checkin_reminder(to: str, streak_days: int = 0) -> bool:
    """发送每日打卡提醒。"""
    html = _render("checkin_reminder.html", streak_days=streak_days)
    return await send_email(to, "🌅 早安！来拼拼看Me打卡吧", html)


async def send_weekly_report(
    to: str,
    fragments: int = 0,
    fusions: int = 0,
    checkins: int = 0,
    highlight: str = "",
) -> bool:
    """发送每周融合报告。"""
    html = _render(
        "weekly_report.html",
        fragments=fragments,
        fusions=fusions,
        checkins=checkins,
        highlight=highlight,
    )
    return await send_email(to, "📊 你的拼拼看Me本周报告", html)


async def send_milestone(
    to: str,
    title: str,
    message: str,
    emoji: str = "🏆",
    extra_stats: dict[str, int] | None = None,
) -> bool:
    """发送里程碑庆祝邮件。"""
    html = _render(
        "milestone.html",
        title=title,
        message=message,
        emoji=emoji,
        extra_stats=extra_stats,
    )
    return await send_email(to, f"🎉 {title}", html)
