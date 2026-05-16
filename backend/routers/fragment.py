"""碎片路由 - 碎片的增删查"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.fragment import Fragment
from schemas.fragment import FragmentCreate, FragmentUpdate, FragmentResponse, BatchImportRequest, BatchImportPreviewItem
from services.ai_service import AIService

router = APIRouter()


@router.get("/", response_model=list[FragmentResponse])
async def list_fragments(archived_filter: str = "0", db: Session = Depends(get_db)):
    """获取碎片列表，默认只显示活跃碎片"""
    q = db.query(Fragment).filter(Fragment.user_id == 1)
    if archived_filter == "all":
        pass
    elif archived_filter == "1":
        q = q.filter(Fragment.archived == 1)
    else:
        q = q.filter(Fragment.archived == 0)
    return q.order_by(Fragment.created_at.desc()).all()


@router.get("/recommend")
async def recommend_fragments(
    target_id: int,
    exclude_ids: str = "",
    limit: int = 5,
    db: Session = Depends(get_db)
):
    """AI推荐相关碎片：基于选中碎片推荐高质量相关内容"""
    import json

    # 获取目标碎片
    target = db.query(Fragment).filter(Fragment.id == target_id, Fragment.user_id == 1).first()
    if not target:
        raise HTTPException(status_code=404, detail="碎片不存在")

    # 已排除的ID集合
    excluded = set(int(x) for x in exclude_ids.split(",") if x.strip().isdigit())
    excluded.add(target_id)  # 排除自身

    def jaccard(s1: str, s2: str) -> float:
        def ngrams(s, n=2):
            s = s.strip().lower()
            return set(s[i:i+n] for i in range(len(s)-n+1)) if len(s) >= n else set(s)
        a = ngrams(s1); b = ngrams(s2)
        if not a or not b: return 0.0
        return len(a & b) / len(a | b)

    def quality_score(f: Fragment) -> int:
        try:
            obj = json.loads(f.tags or "{}")
            return int(obj.get("quality_score", 0) or 0)
        except:
            return 0

    # 扫描所有活跃碎片
    all_frags = db.query(Fragment).filter(
        Fragment.user_id == 1,
        Fragment.archived == 0,
        Fragment.id.notin_(excluded)
    ).all()

    scored: list[dict] = []
    for f in all_frags:
        # 同一类型权重更高 (1.5x)，不同类型也有机会推荐
        sim = jaccard(target.content, f.content)
        if f.fragment_type == target.fragment_type:
            sim *= 1.5
        qs = quality_score(f)
        # 综合分 = 相似度 * (质量分数/5)，鼓励选高质量碎片
        composite = sim * (0.5 + 0.5 * (qs / 5.0))
        if composite > 0.05:  # 阈值过滤
            scored.append({
                "id": f.id,
                "content": f.content,
                "fragment_type": f.fragment_type,
                "quality_score": qs,
                "similarity": round(sim, 3),
                "composite_score": round(composite, 4),
            })

    scored.sort(key=lambda x: x["composite_score"], reverse=True)
    return {"target_id": target_id, "recommendations": scored[:limit]}


@router.post("/", response_model=FragmentResponse, status_code=status.HTTP_201_CREATED)
async def create_fragment(body: FragmentCreate, db: Session = Depends(get_db)):
    """创建新的碎片，AI自动评分（后台异步）"""
    import json as _json
    fragment = Fragment(
        user_id=1,
        journal_id=body.journal_id,
        fragment_type=body.fragment_type,
        content=body.content,
        tags=body.tags,
    )
    db.add(fragment)
    db.commit()
    db.refresh(fragment)

    # 后台自动评分——不阻塞响应
    frag_id = fragment.id
    frag_type = fragment.fragment_type
    frag_content = fragment.content
    async def _auto_score():
        from database import SessionLocal
        score = await AIService.score_fragment(frag_type, frag_content)
        score_db = SessionLocal()
        try:
            f = score_db.query(Fragment).filter(Fragment.id == frag_id).first()
            if f:
                tags_obj = _json.loads(f.tags) if f.tags else {}
                tags_obj["quality_score"] = score
                f.tags = _json.dumps(tags_obj)
                score_db.commit()
        finally:
            score_db.close()

    import asyncio
    asyncio.create_task(_auto_score())

    return fragment


@router.post("/batch-import", response_model=list[BatchImportPreviewItem])
async def batch_import_fragments(body: BatchImportRequest):
    """批量导入：粘贴文本→AI拆分为碎片预览"""
    fragments = await AIService.batch_import_fragments(body.text)
    return fragments


@router.put("/{fragment_id}", response_model=FragmentResponse)
async def update_fragment(fragment_id: int, body: FragmentUpdate, db: Session = Depends(get_db)):
    """编辑指定碎片"""
    fragment = db.query(Fragment).filter(Fragment.id == fragment_id).first()
    if not fragment:
        raise HTTPException(status_code=404, detail="碎片不存在")
    if body.fragment_type is not None:
        fragment.fragment_type = body.fragment_type
    if body.content is not None:
        fragment.content = body.content
    if body.tags is not None:
        fragment.tags = body.tags
    if body.archived is not None:
        fragment.archived = body.archived
    db.commit()
    db.refresh(fragment)
    return fragment


@router.patch("/{fragment_id}/rate")
async def rate_fragment(fragment_id: int, body: dict, db: Session = Depends(get_db)):
    """给碎片评分：quality_score 1-5（1=垃圾，5=精品）"""
    fragment = db.query(Fragment).filter(Fragment.id == fragment_id).first()
    if not fragment:
        raise HTTPException(status_code=404, detail="碎片不存在")
    score = body.get("quality_score")
    if score is not None:
        if not isinstance(score, int) or score < 1 or score > 5:
            raise HTTPException(status_code=400, detail="quality_score 必须是 1-5 的整数")
        import json
        tags_obj = json.loads(fragment.tags) if fragment.tags else {}
        tags_obj["quality_score"] = score
        fragment.tags = json.dumps(tags_obj)
        db.commit()
    return {"id": fragment.id, "quality_score": score}


@router.patch("/{fragment_id}/archive")
async def toggle_archive(fragment_id: int, body: dict, db: Session = Depends(get_db)):
    """切换归档状态：archived=1归档，archived=0激活"""
    fragment = db.query(Fragment).filter(Fragment.id == fragment_id).first()
    if not fragment:
        raise HTTPException(status_code=404, detail="碎片不存在")
    archived = body.get("archived")
    if archived not in (0, 1):
        raise HTTPException(status_code=400, detail="archived 必须是 0 或 1")
    fragment.archived = archived
    db.commit()
    return {"id": fragment.id, "archived": fragment.archived}


@router.post("/deduplicate")
async def deduplicate_fragments(db: Session = Depends(get_db)):
    """扫描相似碎片，返回候选去重对列表（同类型 bigram Jaccard > 0.6）"""
    import json

    def jaccard_similarity(s1: str, s2: str) -> float:
        def ngrams(s, n=2):
            s = s.strip().lower()
            return set(s[i:i+n] for i in range(len(s)-n+1)) if len(s) >= n else set(s)
        a = ngrams(s1); b = ngrams(s2)
        if not a and not b:
            return 0.0
        return len(a & b) / len(a | b)

    def get_score(f):
        try:
            obj = json.loads(f.tags or '{}')
            return obj.get('quality_score', 0) or 0
        except:
            return 0

    fragments = db.query(Fragment).filter(Fragment.user_id == 1).all()

    by_type: dict[str, list] = {}
    for f in fragments:
        t = f.fragment_type or '其他'
        by_type.setdefault(t, []).append(f)

    candidates: list[dict] = []
    seen_pairs: set = set()

    for _type, group in by_type.items():
        n = len(group)
        if n < 2:
            continue
        for i in range(n):
            for j in range(i + 1, n):
                f1, f2 = group[i], group[j]
                pair_key = tuple(sorted([f1.id, f2.id]))
                if pair_key in seen_pairs:
                    continue
                seen_pairs.add(pair_key)
                sim = jaccard_similarity(f1.content, f2.content)
                if sim > 0.6:
                    candidates.append({
                        'fragment_a': {'id': f1.id, 'content': f1.content, 'fragment_type': f1.fragment_type, 'quality_score': get_score(f1)},
                        'fragment_b': {'id': f2.id, 'content': f2.content, 'fragment_type': f2.fragment_type, 'quality_score': get_score(f2)},
                        'similarity': round(sim, 3),
                    })

    candidates.sort(key=lambda x: x['similarity'], reverse=True)
    return {'total_fragments': len(fragments), 'duplicate_pairs': len(candidates), 'candidates': candidates[:50]}


@router.get("/clusters")
async def get_clusters(db: Session = Depends(get_db)):
    """智能组块推荐：将拼图片按语义聚类为3-5个组块，每组有颜色主题"""
    import json
    from collections import defaultdict

    # 颜色主题调色板
    THEME_COLORS = [
        {"name": "深海蓝", "color": "#4a7c9b", "bg": "#e8f0f6"},
        {"name": "森林绿", "color": "#5a7a5a", "bg": "#e8f0e8"},
        {"name": "琥珀金", "color": "#c49a6c", "bg": "#faf3e8"},
        {"name": "陶土棕", "color": "#9b6c4a", "bg": "#f5ede5"},
        {"name": "橄榄绿", "color": "#7a9b4a", "bg": "#eef5e3"},
        {"name": "紫罗兰", "color": "#7a6c9b", "bg": "#f0edf5"},
        {"name": "珊瑚红", "color": "#c46c6c", "bg": "#fae8e8"},
    ]

    # 分类名称映射
    TYPE_LABELS: dict[str, str] = {
        "技能": "实用技能", "能力": "核心能力", "爱好": "兴趣爱好",
        "习惯": "日常习惯", "知识": "知识储备", "经历": "人生经历",
        "资源": "资源网络", "性格": "性格特质",
    }

    def jaccard(s1: str, s2: str) -> float:
        def ngrams(s, n=2):
            s = s.strip().lower()
            return set(s[i:i+n] for i in range(len(s)-n+1)) if len(s) >= n else set(s)
        a = ngrams(s1); b = ngrams(s2)
        if not a or not b: return 0.0
        return len(a & b) / len(a | b)

    fragments = db.query(Fragment).filter(
        Fragment.user_id == 1, Fragment.archived == 0
    ).all()

    if len(fragments) < 3:
        return {"clusters": [], "message": "拼图片太少，暂无法生成组块（至少需要3块）", "total_fragments": len(fragments)}

    # 按类型分组
    by_type: dict[str, list] = defaultdict(list)
    for f in fragments:
        t = f.fragment_type or "其他"
        by_type[t].append(f)

    # 对每个类型内的碎片进行聚类
    all_clusters: list[dict] = []

    for ftype, group in by_type.items():
        if len(group) == 1:
            f = group[0]
            all_clusters.append({
                "fragments": [f],
                "primary_type": ftype,
                "avg_similarity": 0.0,
            })
            continue

        # 用连通分量聚类（Jaccard > 0.15 连边）
        n = len(group)
        parent = list(range(n))

        def find(x):
            while parent[x] != x:
                parent[x] = parent[parent[x]]
                x = parent[x]
            return x

        def union(x, y):
            rx, ry = find(x), find(y)
            if rx != ry:
                parent[rx] = ry

        for i in range(n):
            for j in range(i + 1, n):
                sim = jaccard(group[i].content, group[j].content)
                if sim > 0.15:
                    union(i, j)

        # 收集连通分量
        clusters_map: dict[int, list] = defaultdict(list)
        for i in range(n):
            clusters_map[find(i)].append(group[i])

        for members in clusters_map.values():
            if len(members) == 1:
                avg_sim = 0.0
            else:
                total_sim = 0.0
                count = 0
                for i in range(len(members)):
                    for j in range(i + 1, len(members)):
                        total_sim += jaccard(members[i].content, members[j].content)
                        count += 1
                avg_sim = total_sim / count if count > 0 else 0.0

            all_clusters.append({
                "fragments": members,
                "primary_type": ftype,
                "avg_similarity": round(avg_sim, 3),
            })

    # 按大小排序，取 top 5
    all_clusters.sort(key=lambda c: (len(c["fragments"]), c["avg_similarity"]), reverse=True)
    top_clusters = all_clusters[:5]

    # 命名 + 分配颜色主题
    result = []
    for idx, cluster in enumerate(top_clusters):
        members = cluster["fragments"]
        ptype = cluster["primary_type"]

        if len(members) == 1:
            name = members[0].content[:12] + ("…" if len(members[0].content) > 12 else "")
        else:
            name = TYPE_LABELS.get(ptype, ptype) + "组"

        theme = THEME_COLORS[idx % len(THEME_COLORS)]

        if len(members) == 1:
            desc = f"这块拼图片是独特的{ptype}碎片"
        elif len(members) <= 3:
            desc = f"{len(members)}块{ptype}拼图片紧密关联，可以组合发力"
        else:
            desc = f"{len(members)}块{ptype}拼图片高度聚集，这是你的核心资产"

        frag_items = []
        for f in members:
            tags_obj = {}
            try:
                tags_obj = json.loads(f.tags or "{}")
            except:
                pass
            frag_items.append({
                "id": f.id,
                "content": f.content,
                "fragment_type": f.fragment_type,
                "quality_score": tags_obj.get("quality_score", 0),
            })

        result.append({
            "name": name,
            "theme": theme,
            "description": desc,
            "primary_type": ptype,
            "count": len(members),
            "avg_similarity": cluster["avg_similarity"],
            "fragments": frag_items,
        })

    return {"clusters": result, "total_fragments": len(fragments)}


@router.get("/gaps")
async def get_gaps(db: Session = Depends(get_db)):
    """缺口识别：分析现有拼图片，生成灰色"缺口"拼图片建议"""
    import json

    # ===== 知识库：各类型常见能力/要素 =====
    CAPABILITY_KB: dict[str, list[str]] = {
        "技能": [
            "公开演讲与表达能力", "数据分析与可视化", "项目管理方法论",
            "Python或JavaScript编程", "Excel高级函数与透视表", "基本设计与排版",
            "写作与内容创作", "外语沟通能力", "视频剪辑与后期制作",
            "销售与谈判技巧", "社交媒体的内容运营", "财务管理与预算编制",
        ],
        "能力": [
            "批判性思维与逻辑推理", "跨部门沟通协调能力", "团队领导与管理",
            "快速学习与自我迭代", "复杂问题拆解能力", "抗压与情绪管理",
            "决策能力与判断力", "时间管理与优先级排序", "创意思维与发散联想",
            "用户研究与同理心", "系统性思维与全局观", "执行落地与闭环能力",
        ],
        "爱好": [
            "阅读（每月至少一本书）", "运动健身（跑步/游泳/球类）", "摄影或绘画",
            "乐器演奏", "手工制作或DIY", "烹饪或烘焙", "旅行与探索未知",
            "桌游或策略游戏", "园艺与绿植养护", "电影或纪录片鉴赏",
        ],
        "习惯": [
            "每日早起（固定时间起床）", "每日复盘与日记", "定期运动（每周3-5次）",
            "深度工作块（番茄钟/专注）", "信息摄入管理（减少碎片阅读）", "定期整理与断舍离",
            "感恩练习或正念冥想", "主动社交与关系维护", "持续学习（每天至少30分钟）",
            "健康饮食与戒糖控油", "财务记账与定期审视", "主动休息与能量管理",
        ],
        "知识": [
            "本行业前沿趋势洞察", "经济学基础（微观/宏观）", "心理学基础知识",
            "计算机科学基础（算法/网络/系统设计）", "市场营销与品牌策略", "产品设计与用户体验",
            "法律常识（合同/劳动法）", "历史与文明演变", "哲学与思维方法",
            "营养学与健康管理", "投资与理财基础知识", "AI与机器学习原理",
        ],
        "经历": [
            "主导过从0到1的项目", "参与过跨文化团队协作", "经历过重大挫折并复盘",
            "独立完成过一个中长期目标", "担任过团队领导角色", "参与过公益或志愿服务",
            "有过教学或指导他人的经历", "参与过大型活动策划与执行", "有过副业或创业尝试",
            "有过跳槽/转行经历并适应", "经历过远程或独立工作", "有过公开获奖或认可经历",
        ],
        "资源": [
            "行业内的导师或引路人", "跨领域的专业人士人脉", "稳定的信息获取渠道",
            "可复用的模板与工具库", "被动收入来源", "核心供应商或合作伙伴",
            "行业社群的成员资格", "个人品牌或自媒体账号", "证书或资质认证",
            "备用金或应急资金", "技术设备与数字工具", "忠实用户或客户群体",
        ],
        "性格": [
            "好奇心与探索欲", "坚韧不拔与韧性", "开放包容的价值观",
            "自驱力与内驱动机", "乐观积极的心态", "正直诚信的品格",
            "同理心与共情能力", "幽默感与轻松氛围营造", "谦逊与持续学习的心态",
            "责任感与担当意识", "独立判断与不从众", "细致耐心与长期主义",
        ],
    }

    # 类型中文映射
    TYPE_GAP_COLORS: dict[str, str] = {
        "技能": "#7a9bb5", "能力": "#7a9b7a", "爱好": "#c4a68c",
        "习惯": "#c4a68c", "知识": "#b8a088", "经历": "#b8a088",
        "资源": "#8aab6a", "性格": "#a68c7a",
    }

    def jaccard(s1: str, s2: str) -> float:
        """2-gram Jaccard相似度"""
        def ngrams(s, n=2):
            s = s.strip().lower()
            return set(s[i:i+n] for i in range(len(s)-n+1)) if len(s) >= n else set(s)
        a = ngrams(s1); b = ngrams(s2)
        if not a or not b: return 0.0
        return len(a & b) / len(a | b)

    def contains_keywords(user_text: str, capability: str) -> float:
        """关键词匹配：从capability中提取关键词，检查user_text是否包含"""
        import re
        # 从capability中提取2-4字的中文关键词
        keywords = re.findall(r'[\u4e00-\u9fa5]{2,4}', capability)
        if not keywords:
            return 0.0
        user_lower = user_text.lower()
        matched = sum(1 for kw in keywords if kw in user_text)
        return matched / len(keywords)

    # 获取所有活跃碎片
    fragments = db.query(Fragment).filter(
        Fragment.user_id == 1, Fragment.archived == 0
    ).all()

    # 按类型组织用户已有内容
    user_by_type: dict[str, list[str]] = {}
    for f in fragments:
        t = f.fragment_type or "其他"
        user_by_type.setdefault(t, []).append(f.content)

    gaps: list[dict] = []

    for cap_type, capabilities in CAPABILITY_KB.items():
        user_contents = user_by_type.get(cap_type, [])
        for cap in capabilities:
            # 检测用户是否已有此能力
            matched = False
            best_sim = 0.0
            for uc in user_contents:
                # 组合相似度：Jaccard + 关键词匹配
                jac = jaccard(cap, uc)
                kw = contains_keywords(uc, cap)
                combined = max(jac * 0.7 + kw * 0.3, kw)  # 关键词匹配权重更高
                if combined > best_sim:
                    best_sim = combined
                # 判定阈值：Jaccard > 0.25 或 关键词覆盖率 > 0.4
                if jac > 0.25 or kw > 0.4:
                    matched = True
                    break

            if not matched:
                gaps.append({
                    "content": cap,
                    "fragment_type": cap_type,
                    "suggestion": f"你可能还需要「{cap}」",
                    "color": TYPE_GAP_COLORS.get(cap_type, "#9b9b9b"),
                    "best_match_score": round(best_sim, 2),
                })

    # 按类型分组排序，同类型内按最佳相似度排序（接近有但不完全的优先）
    gaps.sort(key=lambda g: (-len(g["fragment_type"]), -g["best_match_score"]))

    # 限制返回数量（最多15个）
    gaps = gaps[:15]

    # 统计
    total_existing = len(fragments)
    existing_types = list(user_by_type.keys())
    gap_types = list(set(g["fragment_type"] for g in gaps))

    return {
        "total_fragments": total_existing,
        "existing_types": existing_types,
        "gap_count": len(gaps),
        "gap_types": gap_types,
        "gaps": gaps,
        "message": f"你的拼图片覆盖了{len(existing_types)}个类型，但在{len(gap_types)}个类型中还有{len(gaps)}个潜在缺口" if gaps else "你的拼图片覆盖很全面！暂时没有发现明显缺口 🎉",
    }


@router.get("/{fragment_id}/relations")
async def get_fragment_relations(
    fragment_id: int,
    limit: int = 3,
    db: Session = Depends(get_db)
):
    """碎片关联发现：基于内容相似度和共现分析，返回关联碎片列表"""
    import json

    # 获取目标碎片
    target = db.query(Fragment).filter(Fragment.id == fragment_id, Fragment.user_id == 1).first()
    if not target:
        raise HTTPException(status_code=404, detail="碎片不存在")

    def jaccard(s1: str, s2: str) -> float:
        def ngrams(s, n=2):
            s = s.strip().lower()
            return set(s[i:i+n] for i in range(len(s)-n+1)) if len(s) >= n else set(s)
        a = ngrams(s1); b = ngrams(s2)
        if not a or not b: return 0.0
        return len(a & b) / len(a | b)

    def get_quality_score(f: Fragment) -> int:
        try:
            obj = json.loads(f.tags or "{}")
            return int(obj.get("quality_score", 0) or 0)
        except:
            return 0

    # 获取所有其他活跃碎片
    all_frags = db.query(Fragment).filter(
        Fragment.user_id == 1,
        Fragment.archived == 0,
        Fragment.id != fragment_id
    ).all()

    # 计算关联分数
    scored: list[dict] = []
    for f in all_frags:
        sim = jaccard(target.content, f.content)

        # 同类型加成
        type_bonus = 1.5 if f.fragment_type == target.fragment_type else 1.0

        # 质量分数加成
        qs = get_quality_score(f)
        quality_boost = 1.0 + (qs / 10.0)  # 最高1.5x

        # 综合关联度
        relation_score = sim * type_bonus * quality_boost

        if relation_score > 0.03:  # 阈值过滤
            scored.append({
                "id": f.id,
                "content": f.content,
                "fragment_type": f.fragment_type,
                "quality_score": qs,
                "similarity": round(sim, 3),
                "relation_score": round(relation_score, 4),
            })

    # 按关联度排序
    scored.sort(key=lambda x: x["relation_score"], reverse=True)

    # 生成关联描述
    relations = scored[:limit]
    relation_count = len(relations)

    # 关联类型标签
    relation_labels = []
    if relation_count > 0:
        top_relation = relations[0]
        if top_relation["similarity"] > 0.3:
            relation_labels.append("高度相似")
        elif top_relation["similarity"] > 0.15:
            relation_labels.append("内容相关")
        else:
            relation_labels.append("同类型")

        if any(r["fragment_type"] == target.fragment_type for r in relations):
            relation_labels.append("同类型")

    return {
        "fragment_id": fragment_id,
        "fragment_content": target.content,
        "fragment_type": target.fragment_type,
        "relation_count": relation_count,
        "relation_labels": relation_labels,
        "relations": relations,
        "message": f"这个碎片和另外 {relation_count} 个碎片有关联" if relation_count > 0 else "暂无发现明显关联碎片",
    }


@router.delete("/{fragment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_fragment(fragment_id: int, db: Session = Depends(get_db)):
    """删除指定碎片"""
    fragment = db.query(Fragment).filter(Fragment.id == fragment_id).first()
    if not fragment:
        raise HTTPException(status_code=404, detail="碎片不存在")
    db.delete(fragment)
    db.commit()