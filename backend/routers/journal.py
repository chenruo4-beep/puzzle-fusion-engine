"""日记路由 - 日记的增删查"""

import asyncio
import json
import sys
import threading
import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from models.journal import JournalEntry
from models.fragment import Fragment
from schemas.journal import JournalCreate, JournalResponse

logger = logging.getLogger(__name__)
router = APIRouter()


def _extract_fragments_bg(journal_id: int, content: str):
    """独立线程中运行异步提取 — 完全独立于 uvicorn event loop"""
    print(f"[BG] 开始提取 diary#{journal_id}...", flush=True, file=sys.stderr)
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(_do_extract(journal_id, content))
    except Exception as e:
        import traceback
        print(f"[BG] diary#{journal_id} 异常: {e}", flush=True, file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
    finally:
        loop.close()


async def _do_extract(journal_id: int, content: str):
    """实际异步提取逻辑 — 自动入库模式"""
    db = SessionLocal()
    try:
        from services.ai_service import AIService
        from models.fragment import Fragment
        fragments = await AIService.extract_fragments_from_journal(content)
        if fragments:
            journal = db.query(JournalEntry).filter(JournalEntry.id == journal_id).first()
            if journal:
                # 自动入库：直接创建 Fragment 记录
                created_ids = []
                for frag_data in fragments:
                    fragment = Fragment(
                        user_id=journal.user_id,
                        journal_id=journal.id,
                        fragment_type=frag_data["type"],
                        content=frag_data["content"],
                        tags="日记自动提取",
                    )
                    db.add(fragment)
                    db.flush()
                    created_ids.append(fragment.id)

                # 更新日记的已提取碎片ID列表
                existing_ids = json.loads(journal.extracted_fragment_ids or "[]")
                existing_ids.extend(created_ids)
                journal.extracted_fragment_ids = json.dumps(existing_ids)
                journal.auto_extracted_count = len(created_ids)
                db.commit()
                print(f"[BG] diary#{journal_id} 自动入库 {len(created_ids)} 个碎片", flush=True, file=sys.stderr)
        else:
            print(f"[BG] diary#{journal_id} 无碎片", flush=True, file=sys.stderr)
    except Exception as e:
        import traceback
        print(f"[BG] diary#{journal_id} AI调用失败: {e}", flush=True, file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
    finally:
        db.close()


@router.get("/", response_model=list[JournalResponse])
async def list_journals(db: Session = Depends(get_db)):
    """获取当前用户的所有日记列表"""
    return db.query(JournalEntry).filter(JournalEntry.user_id == 1).order_by(JournalEntry.created_at.desc()).all()


@router.post("/", response_model=JournalResponse, status_code=status.HTTP_201_CREATED)
async def create_journal(body: JournalCreate, db: Session = Depends(get_db)):
    """创建新的日记条目 — AI碎片提取在后台线程中执行"""
    journal = JournalEntry(
        user_id=1,
        content=body.content,
        tags=body.tags,
    )
    db.add(journal)
    db.commit()
    db.refresh(journal)

    # 独立线程中执行，完全不影响响应
    threading.Thread(
        target=_extract_fragments_bg,
        args=(journal.id, body.content),
        daemon=True
    ).start()

    return journal


@router.get("/{journal_id}", response_model=JournalResponse)
async def get_journal(journal_id: int, db: Session = Depends(get_db)):
    """获取单条日记详情"""
    journal = db.query(JournalEntry).filter(JournalEntry.id == journal_id).first()
    if not journal:
        raise HTTPException(status_code=404, detail="日记不存在")
    return journal


@router.put("/{journal_id}", response_model=JournalResponse)
async def update_journal(journal_id: int, body: JournalCreate, db: Session = Depends(get_db)):
    """编辑日记（仅24小时内可修改）— AI碎片提取在后台线程中执行"""
    from datetime import datetime, timedelta
    journal = db.query(JournalEntry).filter(JournalEntry.id == journal_id).first()
    if not journal:
        raise HTTPException(status_code=404, detail="日记不存在")
    now = datetime.utcnow()
    age = now - journal.created_at
    if age > timedelta(hours=24):
        raise HTTPException(status_code=403, detail="超过24小时，无法修改")
    journal.content = body.content
    journal.tags = body.tags
    journal.suggested_fragments = None  # 清空旧建议
    db.commit()
    db.refresh(journal)

    # 独立线程中执行
    threading.Thread(
        target=_extract_fragments_bg,
        args=(journal.id, body.content),
        daemon=True
    ).start()

    return journal


@router.post("/{journal_id}/confirm-fragments", response_model=list)
async def confirm_fragments(journal_id: int, body: dict, db: Session = Depends(get_db)):
    """确认日记提取的碎片，将选中的建议碎片正式入库"""
    journal = db.query(JournalEntry).filter(JournalEntry.id == journal_id).first()
    if not journal:
        raise HTTPException(status_code=404, detail="日记不存在")

    # body: {"indices": [0, 1, 2]}  用户选中的碎片索引
    indices = body.get("indices", [])
    if not journal.suggested_fragments:
        raise HTTPException(status_code=400, detail="没有待确认的碎片")

    suggested = json.loads(journal.suggested_fragments)
    created_fragments = []
    confirmed_ids = []

    for i in indices:
        if 0 <= i < len(suggested):
            frag_data = suggested[i]
            fragment = Fragment(
                user_id=1,
                journal_id=journal.id,
                fragment_type=frag_data["type"],
                content=frag_data["content"],
                tags="日记提取",
            )
            db.add(fragment)
            db.flush()
            created_fragments.append({
                "id": fragment.id,
                "type": fragment.fragment_type,
                "content": fragment.content,
            })
            confirmed_ids.append(fragment.id)

    # 更新日记的已确认碎片ID列表
    existing_ids = json.loads(journal.extracted_fragment_ids or "[]")
    existing_ids.extend(confirmed_ids)
    journal.extracted_fragment_ids = json.dumps(existing_ids)
    # 清空建议
    journal.suggested_fragments = None
    db.commit()

    return created_fragments


@router.post("/{journal_id}/dismiss-fragments")
async def dismiss_fragments(journal_id: int, db: Session = Depends(get_db)):
    """忽略日记的碎片建议"""
    journal = db.query(JournalEntry).filter(JournalEntry.id == journal_id).first()
    if not journal:
        raise HTTPException(status_code=404, detail="日记不存在")
    journal.suggested_fragments = None
    db.commit()
    return {"ok": True}


@router.delete("/{journal_id}")
async def delete_journal(journal_id: int, db: Session = Depends(get_db)):
    """删除日记（仅24小时内可删除）— 同时删除关联的自动提取碎片"""
    from datetime import datetime, timedelta
    journal = db.query(JournalEntry).filter(JournalEntry.id == journal_id).first()
    if not journal:
        raise HTTPException(status_code=404, detail="日记不存在")
    now = datetime.utcnow()
    age = now - journal.created_at
    if age > timedelta(hours=24):
        raise HTTPException(status_code=403, detail="超过24小时，无法删除")

    # 删除关联的自动提取碎片
    if journal.extracted_fragment_ids:
        try:
            ids = json.loads(journal.extracted_fragment_ids)
            for fid in ids:
                frag = db.query(Fragment).filter(Fragment.id == fid).first()
                if frag:
                    db.delete(frag)
        except Exception:
            pass

    db.delete(journal)
    db.commit()
    return {"ok": True}