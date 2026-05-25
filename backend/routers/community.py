"""社区功能路由 - 评论与点赞"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func as sa_func
from typing import Optional

from database import get_db
from models.user import User
from models.fusion import Fusion
from models.community import Comment, Like
from schemas.community import (
    CommentCreate, CommentUpdate, CommentResponse,
    CommentListResponse, LikeResponse,
)
from routers.auth import get_current_user

router = APIRouter()


# ==================== 评论 ====================


@router.get("/fusions/{fusion_id}/comments", response_model=CommentListResponse)
async def list_comments(
    fusion_id: int,
    parent_id: Optional[int] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取融合结果的评论列表。

    - parent_id 为空返回顶级评论，指定则返回该评论的回复
    - 按时间倒序排列
    """
    # 验证融合存在
    fusion = db.query(Fusion).filter(Fusion.id == fusion_id).first()
    if not fusion:
        raise HTTPException(status_code=404, detail="融合记录不存在")

    query = db.query(Comment).filter(
        Comment.fusion_id == fusion_id,
        Comment.parent_id == parent_id,
    )

    total = query.count()
    comments = query.order_by(Comment.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    items = []
    for c in comments:
        # 获取作者名（用 email 前缀）
        author = db.query(User).filter(User.id == c.user_id).first()
        author_name = author.email.split("@")[0] if author else "未知用户"

        # 计算回复数
        reply_count = db.query(sa_func.count(Comment.id)).filter(
            Comment.parent_id == c.id
        ).scalar() or 0

        items.append(CommentResponse(
            id=c.id,
            user_id=c.user_id,
            fusion_id=c.fusion_id,
            content=c.content,
            parent_id=c.parent_id,
            created_at=c.created_at,
            author_name=author_name,
            reply_count=reply_count,
        ))

    return CommentListResponse(items=items, total=total)


@router.post("/fusions/{fusion_id}/comments", status_code=status.HTTP_201_CREATED)
async def create_comment(
    fusion_id: int,
    body: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """对融合结果发表评论。支持传 parent_id 回复他人评论。"""
    fusion = db.query(Fusion).filter(Fusion.id == fusion_id).first()
    if not fusion:
        raise HTTPException(status_code=404, detail="融合记录不存在")

    if not body.content or not body.content.strip():
        raise HTTPException(status_code=400, detail="评论内容不能为空")

    # 如果指定了 parent_id，验证父评论存在且属于同一融合
    if body.parent_id:
        parent = db.query(Comment).filter(Comment.id == body.parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="被回复的评论不存在")
        if parent.fusion_id != fusion_id:
            raise HTTPException(status_code=400, detail="不能跨融合回复")

    comment = Comment(
        user_id=current_user.id,
        fusion_id=fusion_id,
        content=body.content.strip(),
        parent_id=body.parent_id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)

    author_name = current_user.email.split("@")[0]
    return {
        "ok": True,
        "data": CommentResponse(
            id=comment.id,
            user_id=comment.user_id,
            fusion_id=comment.fusion_id,
            content=comment.content,
            parent_id=comment.parent_id,
            created_at=comment.created_at,
            author_name=author_name,
            reply_count=0,
        ),
    }


@router.put("/fusions/{fusion_id}/comments/{comment_id}")
async def update_comment(
    fusion_id: int,
    comment_id: int,
    body: CommentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """编辑自己的评论。"""
    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.fusion_id == fusion_id,
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="评论不存在")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能编辑自己的评论")
    if not body.content or not body.content.strip():
        raise HTTPException(status_code=400, detail="评论内容不能为空")

    comment.content = body.content.strip()
    db.commit()
    return {"ok": True, "message": "评论已更新"}


@router.delete("/fusions/{fusion_id}/comments/{comment_id}")
async def delete_comment(
    fusion_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """删除自己的评论（同时删除所有子回复）。"""
    comment = db.query(Comment).filter(
        Comment.id == comment_id,
        Comment.fusion_id == fusion_id,
    ).first()
    if not comment:
        raise HTTPException(status_code=404, detail="评论不存在")
    if comment.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="只能删除自己的评论")

    # 先删除子回复
    db.query(Comment).filter(Comment.parent_id == comment_id).delete()
    db.delete(comment)
    db.commit()
    return {"ok": True, "message": "评论已删除"}


# ==================== 点赞 ====================


@router.post("/fusions/{fusion_id}/like")
async def toggle_like(
    fusion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """切换点赞状态 — 已赞则取消，未赞则点赞。"""
    fusion = db.query(Fusion).filter(Fusion.id == fusion_id).first()
    if not fusion:
        raise HTTPException(status_code=404, detail="融合记录不存在")

    existing = db.query(Like).filter(
        Like.user_id == current_user.id,
        Like.fusion_id == fusion_id,
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        liked = False
        message = "已取消点赞"
    else:
        like = Like(user_id=current_user.id, fusion_id=fusion_id)
        db.add(like)
        db.commit()
        liked = True
        message = "点赞成功"

    like_count = db.query(sa_func.count(Like.id)).filter(
        Like.fusion_id == fusion_id
    ).scalar() or 0

    return {"ok": True, "liked": liked, "like_count": like_count, "message": message}


@router.get("/fusions/{fusion_id}/likes", response_model=LikeResponse)
async def get_likes(
    fusion_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取融合结果的点赞数及当前用户点赞状态。"""
    like_count = db.query(sa_func.count(Like.id)).filter(
        Like.fusion_id == fusion_id
    ).scalar() or 0

    liked = db.query(Like).filter(
        Like.user_id == current_user.id,
        Like.fusion_id == fusion_id,
    ).first() is not None

    return LikeResponse(liked=liked, like_count=like_count)
