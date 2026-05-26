"""数据导出路由 — 碎片/融合记录导出）"""

import json
import csv
import io
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from database import get_db
from models.fragment import Fragment
from models.fusion import Fusion
from models.user import User
from routers.auth import get_current_user

router = APIRouter(prefix="/api/export", tags=["数据导出"])

# ---- Schemas ----

class ExportRequest(BaseModel):
    """导出请求"""
    type: str = "all"  # "fragments" | "fusions" | "all"
    format: str = "json"  # "json" | "csv" | "markdown"
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    fragment_types: Optional[List[str]] = None  # 过滤碎片类型

class ExportResponse(BaseModel):
    """导出响应（JSON/CSV格式时返回文件）"""
    success: bool
    message: str
    download_url: Optional[str] = None

# ---- 导出逻辑 ----

def export_fragments_to_json(fragments: list[Fragment]) -> str:
    """导出碎片为JSON格式"""
    data = []
    for f in fragments:
        data.append({
            "id": f.id,
            "fragment_type": f.fragment_type,
            "content": f.content,
            "tags": json.loads(f.tags) if f.tags else [],
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "updated_at": f.updated_at.isoformat() if f.updated_at else None,
        })
    return json.dumps(data, ensure_ascii=False, indent=2)

def export_fragments_to_csv(fragments: list[Fragment]) -> str:
    """导出碎片为CSV格式"""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "类型", "内容", "标签", "创建时间", "更新时间"])
    
    for f in fragments:
        tags = json.loads(f.tags) if f.tags else []
        writer.writerow([
            f.id,
            f.fragment_type,
            f.content,
            ",".join(tags),
            f.created_at.isoformat() if f.created_at else "",
            f.updated_at.isoformat() if f.updated_at else "",
        ])
    
    return output.getvalue()

def export_fragments_to_markdown(fragments: list[Fragment]) -> str:
    """导出碎片为Markdown格式"""
    lines = ["# 碎片导出\n"]
    lines.append(f"导出时间: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}\n")
    lines.append(f"总计: {len(fragments)} 条\n")
    lines.append("---\n")
    
    for f in fragments:
        lines.append(f"## 碎片 {f.id}")
        lines.append(f"- 类型: {f.fragment_type}")
        lines.append(f"- 内容: {f.content}")
        tags = json.loads(f.tags) if f.tags else []
        if tags:
            lines.append(f"- 标签: {', '.join(tags)}")
        lines.append(f"- 创建时间: {f.created_at.strftime('%Y-%m-%d %H:%M:%S') if f.created_at else '未知'}")
        lines.append("\n")
    
    return "\n".join(lines)

def export_fusions_to_json(fusions: list[Fusion]) -> str:
    """导出融合记录为JSON格式"""
    data = []
    for fu in fusions:
        data.append({
            "id": fu.id,
            "title": fu.title,
            "summary": fu.summary,
            "fragment_ids": json.loads(fu.fragment_ids) if fu.fragment_ids else [],
            "created_at": fu.created_at.isoformat() if fu.created_at else None,
        })
    return json.dumps(data, ensure_ascii=False, indent=2)

def export_fusions_to_csv(fusions: list[Fusion]) -> str:
    """导出融合记录为CSV格式"""
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "标题", "摘要", "碎片IDs", "创建时间"])
    
    for fu in fusions:
        fragment_ids = json.loads(fu.fragment_ids) if fu.fragment_ids else []
        writer.writerow([
            fu.id,
            fu.title,
            fu.summary or "",
            ",".join(map(str, fragment_ids)),
            fu.created_at.isoformat() if fu.created_at else "",
        ])
    
    return output.getvalue()

def export_fusions_to_markdown(fusions: list[Fusion]) -> str:
    """导出融合记录为Markdown格式"""
    lines = ["# 融合记录导出\n"]
    lines.append(f"导出时间: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}\n")
    lines.append(f"总计: {len(fusions)} 条\n")
    lines.append("---\n")
    
    for fu in fusions:
        lines.append(f"## {fu.title}")
        lines.append(f"**摘要**: {fu.summary or '无'}\n")
        fragment_ids = json.loads(fu.fragment_ids) if fu.fragment_ids else []
        if fragment_ids:
            lines.append(f"**关联碎片**: {', '.join(map(str, fragment_ids))}")
        lines.append(f"**创建时间**: {fu.created_at.strftime('%Y-%m-%d %H:%M:%S') if fu.created_at else '未知'}\n")
    
    return "\n".join(lines)

# ---- 路由 ----

@router.post("/fragments")
async def export_fragments(
    body: ExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """导出用户碎片数据"""
    # 查询碎片
    query = db.query(Fragment).filter(Fragment.user_id == current_user.id)
    
    # 应用过滤条件
    if body.start_date:
        query = query.filter(Fragment.created_at >= body.start_date)
    if body.end_date:
        query = query.filter(Fragment.created_at <= body.end_date)
    if body.fragment_types:
        query = query.filter(Fragment.fragment_type.in_(body.fragment_types))
    
    fragments = query.order_by(Fragment.created_at.desc()).all()
    
    if not fragments:
        if body.format == "json":
            content = "[]"
            media_type = "application/json"
            filename = f"fragments_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"
            return StreamingResponse(io.BytesIO(content.encode()), media_type=media_type, headers={"Content-Disposition": f"attachment; filename={filename}"})
        elif body.format == "csv":
            content = "id,type,content,created_at\n"
            media_type = "text/csv"
            filename = f"fragments_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
            return StreamingResponse(io.BytesIO(content.encode()), media_type=media_type, headers={"Content-Disposition": f"attachment; filename={filename}"})
        else:
            content = "# 碎片导出\n\n无碎片数据\n"
            media_type = "text/markdown"
            filename = f"fragments_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.md"
            return StreamingResponse(io.BytesIO(content.encode()), media_type=media_type, headers={"Content-Disposition": f"attachment; filename={filename}"})
    
    # 根据格式生成导出内容
    if body.format == "json":
        content = export_fragments_to_json(fragments)
        media_type = "application/json"
        filename = f"fragments_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"
    elif body.format == "csv":
        content = export_fragments_to_csv(fragments)
        media_type = "text/csv"
        filename = f"fragments_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    elif body.format == "markdown":
        content = export_fragments_to_markdown(fragments)
        media_type = "text/markdown"
        filename = f"fragments_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.md"
    else:
        raise HTTPException(status_code=400, detail="不支持的导出格式")
    
    # 返回文件流
    if body.format == "csv":
        # CSV需要特殊处理编码
        response = StreamingResponse(
            iter([content.encode("utf-8-sig")]),  # UTF-8 BOM for Excel
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    else:
        response = StreamingResponse(
            iter([content.encode("utf-8")]),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    return response

@router.post("/fusions")
async def export_fusions(
    body: ExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """导出用户融合记录"""
    # 查询融合记录（需要通过fragment关联找到用户的融合）
    # 这里假设Fusion模型有user_id字段，如果没有需要调整
    query = db.query(Fusion).filter(Fusion.user_id == current_user.id)
    
    # 应用过滤条件
    if body.start_date:
        query = query.filter(Fusion.created_at >= body.start_date)
    if body.end_date:
        query = query.filter(Fusion.created_at <= body.end_date)
    
    fusions = query.order_by(Fusion.created_at.desc()).all()
    
    if not fusions:
        if body.format == "json":
            content = "[]"
        elif body.format == "csv":
            content = "id,title,summary,created_at\n"
        else:
            content = "# 融合导出\n\n无融合数据\n"
        media_type = "application/json" if body.format == "json" else ("text/csv" if body.format == "csv" else "text/markdown")
        ext = "json" if body.format == "json" else ("csv" if body.format == "csv" else "md")
        filename = f"fusions_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.{ext}"
        return StreamingResponse(io.BytesIO(content.encode()), media_type=media_type, headers={"Content-Disposition": f"attachment; filename={filename}"})
    
    # 根据格式生成导出内容
    if body.format == "json":
        content = export_fusions_to_json(fusions)
        media_type = "application/json"
        filename = f"fusions_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"
    elif body.format == "csv":
        content = export_fusions_to_csv(fusions)
        media_type = "text/csv"
        filename = f"fusions_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    elif body.format == "markdown":
        content = export_fusions_to_markdown(fusions)
        media_type = "text/markdown"
        filename = f"fusions_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.md"
    else:
        raise HTTPException(status_code=400, detail="不支持的导出格式")
    
    # 返回文件流
    if body.format == "csv":
        response = StreamingResponse(
            iter([content.encode("utf-8-sig")]),  # UTF-8 BOM for Excel
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    else:
        response = StreamingResponse(
            iter([content.encode("utf-8")]),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    return response

@router.post("/all")
async def export_all(
    body: ExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """导出用户所有数据（碎片 + 融合记录）"""
    # 查询碎片
    fragments_query = db.query(Fragment).filter(Fragment.user_id == current_user.id)
    if body.start_date:
        fragments_query = fragments_query.filter(Fragment.created_at >= body.start_date)
    if body.end_date:
        fragments_query = fragments_query.filter(Fragment.created_at <= body.end_date)
    if body.fragment_types:
        fragments_query = fragments_query.filter(Fragment.fragment_type.in_(body.fragment_types))
    
    fragments = fragments_query.order_by(Fragment.created_at.desc()).all()
    
    # 查询融合记录
    fusions_query = db.query(Fusion).filter(Fusion.user_id == current_user.id)
    if body.start_date:
        fusions_query = fusions_query.filter(Fusion.created_at >= body.start_date)
    if body.end_date:
        fusions_query = fusions_query.filter(Fusion.created_at <= body.end_date)
    
    fusions = fusions_query.order_by(Fusion.created_at.desc()).all()
    
    if not fragments and not fusions:
        # Return empty data instead of 404
        if body.format == "json":
            content = json.dumps({"export_time": datetime.now(timezone.utc).isoformat(), "fragments": [], "fusions": [], "total_fragments": 0, "total_fusions": 0}, ensure_ascii=False, indent=2)
            return StreamingResponse(iter([content.encode()]), media_type="application/json", headers={"Content-Disposition": f"attachment; filename=all_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"})
        elif body.format == "markdown":
            content = "# 全量导出\n\n无数据\n"
            return StreamingResponse(iter([content.encode()]), media_type="text/markdown", headers={"Content-Disposition": f"attachment; filename=all_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.md"})
        else:
            content = "id,type,content,created_at\n"
            return StreamingResponse(iter([content.encode()]), media_type="text/csv", headers={"Content-Disposition": f"attachment; filename=all_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"})
    
    # 根据格式生成导出内容
    if body.format == "json":
        # JSON格式：合并碎片和融合
        fragments_data = json.loads(export_fragments_to_json(fragments)) if fragments else []
        fusions_data = json.loads(export_fusions_to_json(fusions)) if fusions else []
        
        all_data = {
            "export_time": datetime.now(timezone.utc).isoformat(),
            "fragments": fragments_data,
            "fusions": fusions_data,
            "total_fragments": len(fragments),
            "total_fusions": len(fusions),
        }
        
        content = json.dumps(all_data, ensure_ascii=False, indent=2)
        media_type = "application/json"
        filename = f"all_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.json"
    
    elif body.format == "markdown":
        # Markdown格式：分别导出
        parts = []
        
        if fragments:
            parts.append(export_fragments_to_markdown(fragments))
        
        if fusions:
            parts.append("\n---\n\n# 融合记录\n")
            for fu in fusions:
                parts.append(f"## {fu.title}")
                parts.append(fu.summary or "")
                parts.append("\n")
        
        content = "\n".join(parts)
        media_type = "text/markdown"
        filename = f"all_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.md"
    
    else:
        # CSV只支持碎片
        if fragments:
            content = export_fragments_to_csv(fragments)
        else:
            raise HTTPException(status_code=400, detail="CSV格式只支持导出碎片")
        
        media_type = "text/csv"
        filename = f"fragments_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    
    # 返回文件流
    if body.format == "csv":
        response = StreamingResponse(
            iter([content.encode("utf-8-sig")]),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    else:
        response = StreamingResponse(
            iter([content.encode("utf-8")]),
            media_type=media_type,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    return response
