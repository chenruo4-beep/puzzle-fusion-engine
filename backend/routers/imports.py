"""批量导入路由 — Obsidian / Notion zip 导入（挂在碎片模块下）"""

import json
import re
import uuid
import zipfile
import io
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.fragment import Fragment
from models.user import User
from routers.auth import get_current_user
from services.ai.vector_store import upsert_vector

router = APIRouter(prefix="/api/fragments/import", tags=["碎片导入"])

# ---- Schemas ----

class ImportPreviewItem(BaseModel):
    """导入预览项"""
    source: str        # 来源文件名
    fragment_type: str  # 推断的碎片类型
    content: str
    tags: list[str]

class ImportPreviewResponse(BaseModel):
    """导入预览响应"""
    total: int
    fragments: list[ImportPreviewItem]
    skipped: int       # 跳过的文件数（空文件/不支持格式）

class ConfirmImportItem(BaseModel):
    """确认导入的项"""
    source: str
    fragment_type: str
    content: str
    tags: list[str] = []

class ConfirmImportRequest(BaseModel):
    """确认导入请求"""
    source_type: str  # "obsidian" | "notion"
    fragments: list[ConfirmImportItem]

# ---- 碎片类型推断 ----

FRAGMENT_TYPE_KEYWORDS = {
    "技能": ["会", "能做", "擅长", "熟练", "掌握", "经验", "做过", "可以"],
    "知识": ["知道", "了解", "学过", "读过", "看过", "研究", "关注", "学习"],
    "经历": ["做过", "去过", "参与", "负责", "经历过", "那时候", "以前"],
    "性格": ["喜欢", "讨厌", "习惯", "总是", "经常", "性格", "觉得"],
    "资源": ["认识", "有", "拥有", "朋友", "资源", "工具", "渠道"],
    "爱好": ["喜欢", "爱", "兴趣", "玩", "享受", "放松", "有意思"],
    "能力": ["擅长", "善于", "能", "会", "敏感", "直觉"],
}

def infer_fragment_type(text: str) -> str:
    """根据文本内容推断碎片类型"""
    text_lower = text.lower()
    scores: dict[str, int] = {}
    for ftype, keywords in FRAGMENT_TYPE_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in text_lower[:200])
        if score > 0:
            scores[ftype] = score
    if scores:
        return max(scores, key=scores.get)
    return "技能"  # 默认

# ---- Obsidian 解析 ----

def parse_frontmatter(content: str) -> tuple[dict, str]:
    """解析 Obsidian 前置元数据，返回 (元数据, 正文)"""
    body = content
    fm: dict = {}
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            raw_fm = parts[1].strip()
            body = parts[2].strip()
            for line in raw_fm.split("\n"):
                if ":" in line:
                    key, _, val = line.partition(":")
                    fm[key.strip()] = val.strip().strip('"').strip("'")
    return fm, body

def extract_tags_from_content(text: str) -> list[str]:
    """从 Obsidian 内容中提取 #标签 """
    tags = re.findall(r"#([\w一-鿿\-\_]+)", text)
    return list(set(tags))

def parse_obsidian_zip(zip_bytes: bytes) -> tuple[list[ImportPreviewItem], int]:
    """解析 Obsidian vault zip，返回 (碎片列表, 跳过的文件数)"""
    fragments: list[ImportPreviewItem] = []
    skipped = 0

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        for name in z.namelist():
            if not name.endswith(".md"):
                continue
            # 忽略隐藏文件/目录
            if "/." in name or name.startswith("."):
                continue

            raw = z.read(name).decode("utf-8", errors="replace")
            fm, body = parse_frontmatter(raw)
            body = body.strip()

            if not body or len(body) < 10:
                skipped += 1
                continue

            # 提取标签
            tags = extract_tags_from_content(raw)
            # 尝试从 frontmatter 获取标签
            fm_tags = fm.get("tags", "")
            if fm_tags:
                extra = [t.strip() for t in fm_tags.split(",") if t.strip()]
                tags.extend(t for t in extra if t not in tags)

            # 推断碎片类型
            ftype = fm.get("type", "") if fm.get("type") else infer_fragment_type(body)

            # 文件名去掉 .md 作为来源
            source_name = name.replace(".md", "").split("/")[-1]

            fragments.append(ImportPreviewItem(
                source=source_name,
                fragment_type=ftype,
                content=body[:500],  # 限制长度
                tags=tags[:5],
            ))

    return fragments, skipped

# ---- Notion 解析 ----

def parse_notion_zip(zip_bytes: bytes) -> tuple[list[ImportPreviewItem], int]:
    """解析 Notion export zip，返回 (碎片列表, 跳过的文件数)"""
    fragments: list[ImportPreviewItem] = []
    skipped = 0

    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        for name in z.namelist():
            if not (name.endswith(".md") or name.endswith(".markdown")):
                continue
            if "/." in name or name.startswith("."):
                continue

            raw = z.read(name).decode("utf-8", errors="replace")
            body = raw.strip()

            if not body or len(body) < 10:
                skipped += 1
                continue

            # Notion 导出时第一行通常是标题，跳过标题行
            lines = body.split("\n")
            content_lines = [l for l in lines if l.strip() and not l.startswith("# ")]
            clean_body = "\n".join(content_lines).strip() or body[:500]

            tags = extract_tags_from_content(raw)
            ftype = infer_fragment_type(clean_body)
            source_name = name.replace(".md", "").replace(".markdown", "").split("/")[-1]

            fragments.append(ImportPreviewItem(
                source=source_name,
                fragment_type=ftype,
                content=clean_body[:500],
                tags=tags[:5],
            ))

    return fragments, skipped

# ---- 路由 ----

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB

ALLOWED_OBSIDIAN_TYPES = {"技能", "知识", "经历", "性格", "资源", "爱好", "能力"}

@router.post("/obsidian/preview", response_model=ImportPreviewResponse)
async def preview_obsidian_import(file: UploadFile = File(...)):
    """上传 Obsidian vault zip，预览解析出的碎片"""
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="请上传 .zip 文件")

    raw = await file.read()
    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"文件过大，最大支持 {MAX_FILE_SIZE // 1024 // 1024}MB")

    try:
        fragments, skipped = parse_obsidian_zip(raw)
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="无效的 zip 文件")

    return ImportPreviewResponse(
        total=len(fragments),
        fragments=fragments[:200],  # 最多预览 200 条
        skipped=skipped,
    )


@router.post("/notion/preview", response_model=ImportPreviewResponse)
async def preview_notion_import(file: UploadFile = File(...)):
    """上传 Notion export zip，预览解析出的碎片"""
    if not file.filename or not file.filename.endswith(".zip"):
        raise HTTPException(status_code=400, detail="请上传 .zip 文件")

    raw = await file.read()
    if len(raw) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail=f"文件过大，最大支持 {MAX_FILE_SIZE // 1024 // 1024}MB")

    try:
        fragments, skipped = parse_notion_zip(raw)
    except zipfile.BadZipFile:
        raise HTTPException(status_code=400, detail="无效的 zip 文件")

    return ImportPreviewResponse(
        total=len(fragments),
        fragments=fragments[:200],
        skipped=skipped,
    )


@router.post("/confirm")
async def confirm_import(
    body: ConfirmImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """确认导入，保存碎片到数据库"""
    if not body.fragments:
        raise HTTPException(status_code=400, detail="没有要导入的碎片")

    saved = 0
    skipped = 0
    for item in body.fragments:
        if not item.content.strip():
            skipped += 1
            continue

        ftype = item.fragment_type
        if ftype not in ALLOWED_OBSIDIAN_TYPES:
            ftype = "技能"

        # tags 是 list[str]，需要转成 JSON 字符串存入数据库
        tags_str = json.dumps(item.tags, ensure_ascii=False) if item.tags else None

        fragment = Fragment(
            user_id=current_user.id,
            fragment_type=ftype,
            content=item.content.strip(),
            tags=tags_str,
        )
        db.add(fragment)
        db.flush()  # 获取 id
        upsert_vector(fragment.id, ftype, item.content.strip(), current_user.id)
        saved += 1

    db.commit()

    return {
        "success": True,
        "saved": saved,
        "skipped": skipped,
        "message": f"成功导入 {saved} 条碎片" + (f"，跳过 {skipped} 条空内容" if skipped else ""),
    }
