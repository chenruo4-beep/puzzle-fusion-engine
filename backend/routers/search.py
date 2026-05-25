"""语义搜索路由 — Qdrant 向量检索入口"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from models.fragment import Fragment
from models.user import User
from routers.auth import get_current_user
from schemas.search import (
    SemanticSearchRequest,
    SemanticSearchResponse,
    SearchResultItem,
)
from services.embedding_service import get_embedding, EmbeddingError
from services.qdrant_service import qdrant_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/semantic", response_model=SemanticSearchResponse)
async def semantic_search(
    body: SemanticSearchRequest,
    current_user: User = Depends(get_current_user),
):
    """
    语义搜索碎片。

    将查询文本转为向量后，在 Qdrant 中检索最相似的碎片。
    需要配置 AI_API_KEY（支持 OpenAI / DeepSeek 等兼容 API）。
    """
    # 1. 获取 embedding
    try:
        query_vector = await get_embedding(body.query)
    except EmbeddingError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # 2. 确保集合就绪
    await qdrant_service.ensure_collection()

    # 3. 搜索
    results = await qdrant_service.search_similar(
        query_vector=query_vector,
        limit=body.limit,
        min_score=body.min_score,
    )

    # 4. 按当前用户过滤（Qdrant 侧已存 user_id）
    filtered = [r for r in results if r["user_id"] == current_user.id]
    items = [SearchResultItem(**r) for r in filtered]

    return SemanticSearchResponse(
        results=items,
        total=len(items),
        query=body.query,
    )


@router.get("/similar/{fragment_id}", response_model=SemanticSearchResponse)
async def similar_fragments(
    fragment_id: int,
    limit: int = 10,
    min_score: float = 0.5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    找相似碎片。

    根据已有碎片的文本内容，检索 Qdrant 中与该碎片语义相似的其它碎片。
    """
    # 1. 查询碎片内容
    fragment = db.query(Fragment).filter(
        Fragment.id == fragment_id,
        Fragment.user_id == current_user.id,
    ).first()
    if not fragment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="碎片不存在")

    # 2. 获取 embedding
    try:
        query_vector = await get_embedding(fragment.content)
    except EmbeddingError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # 3. 搜索（排除自己）
    await qdrant_service.ensure_collection()
    results = await qdrant_service.search_similar(
        query_vector=query_vector,
        limit=limit + 1,  # 多取一条，后面排除自身
        min_score=min_score,
    )

    # 4. 过滤用户 + 排除自身
    filtered = [
        r for r in results
        if r["user_id"] == current_user.id and r["id"] != fragment_id
    ][:limit]

    items = [SearchResultItem(**r) for r in filtered]

    return SemanticSearchResponse(
        results=items,
        total=len(items),
        query=fragment.content[:50],
    )
