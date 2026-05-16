"""智能组块推荐 - 分析融合历史，找出高频共现碎片组合"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from collections import defaultdict
import json
import math

from database import get_db
from models.fusion import Fusion
from models.fragment import Fragment

router = APIRouter()

TYPE_COLORS = {
    "技能": "#4a7c9b", "经历": "#5a7a5a", "习惯": "#c49a6c",
    "知识": "#7a6a9b", "资源": "#7a9b4a", "能力": "#b8a088",
    "爱好": "#c4a68c", "性格": "#a68c7a",
}


def _to_int(x):
    if isinstance(x, int):
        return x
    if isinstance(x, str) and x.isdigit():
        return int(x)
    return None


def _jaccard(s1: str, s2: str) -> float:
    def ngrams(s, n=2):
        s = s.strip().lower()
        return set(s[i:i + n] for i in range(len(s) - n + 1)) if len(s) >= n else set(s)
    a = ngrams(s1)
    b = ngrams(s2)
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _build_bundle_from_pair(
    fid_a: int,
    fid_b: int,
    frag_map: dict,
    support: int = 1,
    confidence: float = 0.0,
    lift: float = 0.0,
    score: float = 0.0,
    examples: list = None,
    prefix: str = "bundle",
) -> dict | None:
    """将一对碎片ID打包成标准bundle结构"""
    frag_a = frag_map.get(fid_a)
    frag_b = frag_map.get(fid_b)
    if not frag_a or not frag_b:
        return None

    type_a = frag_a.fragment_type or "其他"
    type_b = frag_b.fragment_type or "其他"
    color_a = TYPE_COLORS.get(type_a, "#b8a088")
    color_b = TYPE_COLORS.get(type_b, "#b8a088")

    if type_a == type_b:
        bundle_name = f"{type_a}双子星"
        bundle_desc = f"这对{type_a}碎片经常一起出现，它们可能构成了你{type_a}体系的左右护法"
    else:
        bundle_name = f"{type_a}×{type_b} 跨界组合"
        bundle_desc = f"{type_a}与{type_b}的跨界搭档，默契配合"

    return {
        "id": f"{prefix}_{fid_a}_{fid_b}",
        "name": bundle_name,
        "description": bundle_desc,
        "support": support,
        "confidence": round(confidence, 3),
        "lift": round(lift, 3),
        "score": round(score, 3),
        "examples": examples or [],
        "fragments": [
            {"id": frag_a.id, "content": frag_a.content, "fragment_type": type_a, "color": color_a},
            {"id": frag_b.id, "content": frag_b.content, "fragment_type": type_b, "color": color_b},
        ],
        "theme_color": color_a,
    }


def _get_fusion_pairs(fusions: list[Fusion], min_support: int = 2):
    """从融合记录中提取共现对，返回 (pair_counts, fragment_counts, pair_examples)"""
    fragment_counts = defaultdict(int)
    pair_counts = defaultdict(int)
    pair_examples = defaultdict(list)

    for fusion in fusions:
        try:
            frag_ids = json.loads(fusion.fragment_ids) if fusion.fragment_ids else []
        except Exception:
            continue
        if len(frag_ids) < 2:
            continue

        unique_ids = sorted(set(_to_int(x) for x in frag_ids if _to_int(x) is not None))
        for fid in unique_ids:
            fragment_counts[fid] += 1

        for i in range(len(unique_ids)):
            for j in range(i + 1, len(unique_ids)):
                pair_key = (unique_ids[i], unique_ids[j])
                pair_counts[pair_key] += 1
                if len(pair_examples[pair_key]) < 3:
                    pair_examples[pair_key].append({
                        "fusion_id": fusion.id,
                        "title": fusion.title or f"融合 #{fusion.id}",
                        "created_at": fusion.created_at.isoformat() if fusion.created_at else None,
                    })

    # 过滤最小支持度
    filtered = {k: v for k, v in pair_counts.items() if v >= min_support}
    return filtered, fragment_counts, pair_examples


def _score_pairs(pair_counts: dict, fragment_counts: dict, total_fusions: int) -> list[dict]:
    """计算支持度/置信度/提升度/综合得分"""
    pair_scores = []
    total_with_pairs = max(1, total_fusions)

    for (fid_a, fid_b), co_count in pair_counts.items():
        support = co_count
        conf_a_to_b = co_count / fragment_counts[fid_a] if fragment_counts[fid_a] > 0 else 0
        conf_b_to_a = co_count / fragment_counts[fid_b] if fragment_counts[fid_b] > 0 else 0
        avg_conf = (conf_a_to_b + conf_b_to_a) / 2

        p_a = fragment_counts[fid_a] / total_with_pairs
        p_b = fragment_counts[fid_b] / total_with_pairs
        p_ab = co_count / total_with_pairs
        lift = p_ab / (p_a * p_b) if (p_a * p_b) > 0 else 0

        score = support * avg_conf * (1 + math.log1p(lift))
        pair_scores.append({
            "fragment_a_id": fid_a,
            "fragment_b_id": fid_b,
            "support": support,
            "confidence": avg_conf,
            "lift": lift,
            "score": score,
        })

    pair_scores.sort(key=lambda x: x["score"], reverse=True)
    return pair_scores


def _fallback_semantic_bundles(fragments: list[Fragment], limit: int = 5) -> list[dict]:
    """
    冷启动回退：当融合历史不足时，基于碎片内容语义相似度推荐潜在组合。
    优先推荐同类型高相似度对 + 跨类型互补对。
    """
    if len(fragments) < 2:
        return []

    # 按类型分组
    by_type: dict[str, list[Fragment]] = defaultdict(list)
    for f in fragments:
        by_type[f.fragment_type or "其他"].append(f)

    candidates: list[dict] = []
    seen_pairs: set[tuple[int, int]] = set()

    # 1) 同类型内找高相似度对
    for ftype, group in by_type.items():
        n = len(group)
        if n < 2:
            continue
        for i in range(n):
            for j in range(i + 1, n):
                fa, fb = group[i], group[j]
                pair_key = tuple(sorted([fa.id, fb.id]))
                if pair_key in seen_pairs:
                    continue
                seen_pairs.add(pair_key)
                sim = _jaccard(fa.content, fb.content)
                if sim > 0.05:
                    candidates.append({
                        "fid_a": fa.id,
                        "fid_b": fb.id,
                        "score": sim * 2.0,  # 同类型加权
                        "support": 0,
                        "confidence": sim,
                        "lift": 0,
                        "examples": [],
                    })

    # 2) 跨类型找潜在互补对（不同类型但内容有交集）
    types = list(by_type.keys())
    for ti in range(len(types)):
        for tj in range(ti + 1, len(types)):
            g1, g2 = by_type[types[ti]], by_type[types[tj]]
            for fa in g1:
                for fb in g2:
                    pair_key = tuple(sorted([fa.id, fb.id]))
                    if pair_key in seen_pairs:
                        continue
                    seen_pairs.add(pair_key)
                    sim = _jaccard(fa.content, fb.content)
                    if sim > 0.03:
                        candidates.append({
                            "fid_a": fa.id,
                            "fid_b": fb.id,
                            "score": sim * 1.2,  # 跨类型稍低权重
                            "support": 0,
                            "confidence": sim,
                            "lift": 0,
                            "examples": [],
                        })

    candidates.sort(key=lambda x: x["score"], reverse=True)

    # 构建bundle
    frag_map = {f.id: f for f in fragments}
    used = set()
    bundles = []
    for c in candidates:
        if c["fid_a"] in used or c["fid_b"] in used:
            continue
        b = _build_bundle_from_pair(
            c["fid_a"], c["fid_b"], frag_map,
            support=c["support"],
            confidence=c["confidence"],
            lift=c["lift"],
            score=c["score"],
            examples=c["examples"],
            prefix="semantic",
        )
        if b:
            b["description"] = "🤖 AI 推测这对碎片可能有协同效应，建议尝试融合"
            bundles.append(b)
            used.add(c["fid_a"])
            used.add(c["fid_b"])
        if len(bundles) >= limit:
            break

    return bundles


@router.get("/")
async def get_cooccurrence_recommendations(
    limit: int = 5,
    min_support: int = 2,
    db: Session = Depends(get_db)
):
    """
    智能组块推荐：分析融合历史，找出经常一起融合的碎片组合。
    融合历史不足时，回退到语义相似度推荐。
    """
    fusions = db.query(Fusion).order_by(Fusion.created_at.desc()).all()

    # === 尝试基于融合历史的共现推荐 ===
    pair_counts, fragment_counts, pair_examples = _get_fusion_pairs(fusions, min_support)

    if pair_counts:
        pair_scores = _score_pairs(pair_counts, fragment_counts, len(fusions))
        top_pairs = pair_scores[:limit * 2]

        all_frag_ids = set()
        for p in top_pairs:
            all_frag_ids.add(p["fragment_a_id"])
            all_frag_ids.add(p["fragment_b_id"])

        frag_map = {}
        if all_frag_ids:
            for f in db.query(Fragment).filter(Fragment.id.in_(list(all_frag_ids))).all():
                frag_map[f.id] = f

        used = set()
        bundles = []
        for p in top_pairs:
            if p["fragment_a_id"] in used or p["fragment_b_id"] in used:
                continue
            b = _build_bundle_from_pair(
                p["fragment_a_id"], p["fragment_b_id"], frag_map,
                support=p["support"],
                confidence=p["confidence"],
                lift=p["lift"],
                score=p["score"],
                examples=pair_examples.get((p["fragment_a_id"], p["fragment_b_id"]), []),
            )
            if b:
                bundles.append(b)
                used.add(p["fragment_a_id"])
                used.add(p["fragment_b_id"])
            if len(bundles) >= limit:
                break

        return {
            "bundles": bundles,
            "total_fusions": len(fusions),
            "total_pairs_found": len(pair_scores),
            "mode": "fusion_history",
            "message": f"基于{len(fusions)}次融合历史，发现{len(pair_scores)}对高频组合，推荐{len(bundles)}个智能组块",
        }

    # === 回退：语义相似度推荐 ===
    active_frags = db.query(Fragment).filter(
        Fragment.archived == 0,
    ).order_by(Fragment.created_at.desc()).limit(100).all()

    semantic_bundles = _fallback_semantic_bundles(active_frags, limit)

    if semantic_bundles:
        return {
            "bundles": semantic_bundles,
            "total_fusions": len(fusions),
            "total_pairs_found": len(semantic_bundles),
            "mode": "semantic_fallback",
            "message": f"融合记录尚少，AI 基于{len(active_frags)}块碎片语义分析，推荐{len(semantic_bundles)}个潜在组合",
        }

    return {
        "bundles": [],
        "total_fusions": len(fusions),
        "total_pairs_found": 0,
        "mode": "empty",
        "message": "碎片太少，暂无法生成组块推荐。多添加一些碎片后再来看看吧！",
    }
