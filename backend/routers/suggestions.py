"""反向确认路由 — 系统推测特质，用户确认/拒绝"""

import random
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session
from database import get_db
from models.fragment import Fragment
from models.user import User
from routers.auth import get_current_user
from services.ai.templates.tag_system import TAG_DEFINITIONS

router = APIRouter()


class TraitResponse(BaseModel):
    id: str
    trait: str
    dimension: str
    reason: str


class TraitRespondBody(BaseModel):
    suggestion_id: str
    accepted: bool


@router.get("/traits")
async def suggest_traits(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """生成3条反向确认特质推测"""
    fragments = db.query(Fragment).filter(
        Fragment.user_id == current_user.id,
        Fragment.archived == 0,
    ).all()

    if not fragments:
        return {"suggestions": [
            {"id": "seed_1", "trait": "你是一个会注意到细节的人", "dimension": "执行落地", "reason": "大多数人匆匆过一天，但你会注意到那些'不大对'的小事"},
            {"id": "seed_2", "trait": "你有时会默默替别人着想", "dimension": "共情关怀", "reason": "你可能没意识到，但你会下意识照顾别人的感受"},
            {"id": "seed_3", "trait": "你对'好看'有自己的标准", "dimension": "创意审美", "reason": "看到配色不对就浑身难受——你有自己的审美直觉"},
        ]}

    all_text = " ".join(f.content for f in fragments)
    existing_traits = []
    for tag, info in TAG_DEFINITIONS.items():
        for kw in info["keywords"]:
            if kw in all_text:
                existing_traits.append((tag, kw))

    # 对每个维度，找出未匹配但相关的高价值关键词
    matched_tags = set(t for t, _ in existing_traits)
    suggestions = []

    for tag, info in TAG_DEFINITIONS.items():
        if tag in matched_tags:
            continue
        # 从该维度的关键词中挑一个跟已有碎片最相关的
        for kw in info["keywords"]:
            if len(kw) >= 4:  # 只考虑有意义的长关键词
                # 检查是否局部匹配
                for existing_tag, existing_kw in existing_traits:
                    if any(c in kw for c in existing_kw[:2]) or any(c in existing_kw for c in kw[:2]):
                        suggestions.append({
                            "id": f"suggest_{tag}_{kw[:8]}",
                            "trait": f"你{kw}",
                            "dimension": tag,
                            "reason": f"从你的碎片来看，你可能有{info['description']}这方面的特质。",
                        })
                        break
            if len(suggestions) >= 3:
                break
        if len(suggestions) >= 3:
            break

    # 如果不够3条，从高频维度补充
    if len(suggestions) < 3:
        fallbacks = [
            {"id": "fallback_1", "trait": "你可能有自己没发现的幽默感", "dimension": "个人特质", "reason": "很多时候，'能接住别人的梗'本身就是一种敏锐"},
            {"id": "fallback_2", "trait": "你是一个喜欢琢磨'为什么'的人", "dimension": "逻辑分析", "reason": "你可能会对某件事突然好奇，然后一查到底"},
            {"id": "fallback_3", "trait": "你对自己的要求其实不低", "dimension": "执行落地", "reason": "你可能觉得'差不多就行了'，但真做的时候你会做到自己满意为止"},
        ]
        while len(suggestions) < 3:
            f = fallbacks[len(suggestions)]
            if f not in suggestions:
                suggestions.append(f)

    random.shuffle(suggestions)
    return {"suggestions": suggestions[:3]}


@router.post("/traits/respond")
async def respond_trait(body: TraitRespondBody, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """用户回应特质推测：确认则入碎片池"""
    if not body.accepted:
        return {"success": True, "fragment_id": None}

    # 从 suggestion_id 推断特质内容
    trait_text = ""
    if body.suggestion_id.startswith("suggest_"):
        parts = body.suggestion_id.split("_", 2)
        if len(parts) >= 3:
            keyword_hint = parts[2]
            trait_text = f"我{keyword_hint}"
    elif body.suggestion_id == "seed_1":
        trait_text = "我是一个会注意到细节的人"
    elif body.suggestion_id == "seed_2":
        trait_text = "我会默默替别人着想"
    elif body.suggestion_id == "seed_3":
        trait_text = "我对'好看'有自己的标准"
    elif body.suggestion_id == "fallback_1":
        trait_text = "我有自己没发现的幽默感"
    elif body.suggestion_id == "fallback_2":
        trait_text = "我喜欢琢磨'为什么'"
    elif body.suggestion_id == "fallback_3":
        trait_text = "我对自己要求不低"
    else:
        return {"success": False, "fragment_id": None}

    fragment = Fragment(
        user_id=current_user.id,
        fragment_type="性格",
        content=trait_text,
        tags='{"source": "reverse_confirmation", "suggestion_id": "' + body.suggestion_id + '"}',
    )
    db.add(fragment)
    db.commit()
    db.refresh(fragment)

    return {"success": True, "fragment_id": fragment.id}
