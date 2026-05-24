"""
缺口识别服务 — 分析已选碎片 vs 目标所需，列出缺口类型 + 建议内容
"""

# 8种碎片类型
FRAGMENT_TYPES = ['技能', '能力', '爱好', '习惯', '知识', '经历', '资源', '性格']

# 每种目标类型所需的碎片类型权重映射
GOAL_TYPE_REQUIREMENTS = {
    '找到远程工作': {
        '技能': 3, '能力': 2, '知识': 2, '经历': 1, '性格': 1,
        '资源': 1, '爱好': 0, '习惯': 1,
    },
    '开一家小店': {
        '技能': 2, '能力': 2, '资源': 3, '经历': 2, '知识': 1,
        '性格': 1, '爱好': 0, '习惯': 1,
    },
    '做副业赚钱': {
        '技能': 2, '能力': 2, '资源': 1, '经历': 1, '知识': 1,
        '性格': 1, '爱好': 2, '习惯': 1,
    },
    '技能变现': {
        '技能': 3, '能力': 2, '知识': 1, '经历': 1, '资源': 1,
        '性格': 1, '爱好': 0, '习惯': 1,
    },
    '转行跳槽': {
        '技能': 2, '能力': 2, '知识': 2, '经历': 2, '性格': 1,
        '资源': 1, '爱好': 0, '习惯': 1,
    },
    '自由职业': {
        '技能': 3, '能力': 2, '资源': 1, '经历': 1, '性格': 2,
        '知识': 1, '爱好': 1, '习惯': 1,
    },
    '创业启动': {
        '技能': 2, '能力': 3, '资源': 3, '经历': 2, '性格': 2,
        '知识': 1, '爱好': 0, '习惯': 1,
    },
    '提升职场竞争力': {
        '技能': 3, '能力': 2, '知识': 2, '经历': 1, '性格': 1,
        '资源': 1, '爱好': 0, '习惯': 1,
    },
}

# 每种碎片类型的建议内容模板
TYPE_SUGGESTIONS = {
    '技能': [
        '学会使用一个主流工具（如Excel高级功能、剪辑软件、设计工具）',
        '掌握一门能直接产生收入的技能（如摄影、翻译、编程入门）',
        '提升现有技能的熟练度，达到能接活的水平',
    ],
    '能力': [
        '培养项目管理能力——从小事开始统筹',
        '提升沟通表达能力——练习把想法说清楚',
        '锻炼抗压和解决问题的能力',
    ],
    '爱好': [
        '把爱好变成可展示的作品（如拍照、写作、手工）',
        '找到爱好和赚钱的结合点',
        '在爱好领域积累一些小成就',
    ],
    '习惯': [
        '建立每日学习和复盘的习惯',
        '养成记录和整理信息的习惯',
        '培养时间管理和优先级判断的习惯',
    ],
    '知识': [
        '系统学习行业基础知识',
        '了解目标市场的规则和玩法',
        '掌握一些商业和法律常识',
    ],
    '经历': [
        '主动争取一个小项目或兼职机会',
        '参与一次行业活动或社群',
        '记录并总结过去的工作亮点',
    ],
    '资源': [
        '梳理自己的人脉清单',
        '盘点可用的工具和设备',
        '寻找可以借力的平台和渠道',
    ],
    '性格': [
        '发挥自己性格中的优势面',
        '找到适合自己性格的工作方式',
        '用性格特点建立个人标签',
    ],
}


class GapService:
    """缺口识别服务"""

    @staticmethod
    def analyze_gaps_heuristic(
        selected_fragments: list[dict],
        goal: str,
    ) -> dict:
        """
        启发式分析缺口 — 不依赖AI，快速返回
        
        Args:
            selected_fragments: [{type, content}, ...]
            goal: 目标名称
        
        Returns:
            {
                "goal": str,
                "has_enough_fragments": bool,
                "total_fragments": int,
                "type_coverage": {"技能": 2, "能力": 1, ...},
                "missing_types": ["资源", "性格"],
                "gaps": [
                    {
                        "type": "资源",
                        "severity": "high" | "medium" | "low",
                        "current_count": 0,
                        "needed_count": 3,
                        "suggestion": "建议内容",
                        "action": "今天就能做的事"
                    }
                ],
                "overall_readiness": 0-100,
                "summary": "总体评估文字"
            }
        """
        # 统计已选碎片的类型分布
        type_counts = {t: 0 for t in FRAGMENT_TYPES}
        for f in selected_fragments:
            t = f.get('type', '技能')
            if t in type_counts:
                type_counts[t] += 1

        # 获取目标需求
        requirements = GOAL_TYPE_REQUIREMENTS.get(goal, {
            '技能': 2, '能力': 2, '知识': 1, '经历': 1, '性格': 1,
            '资源': 1, '爱好': 0, '习惯': 1,
        })

        # 计算缺口
        gaps = []
        missing_types = []
        total_score = 0
        max_score = 0

        for frag_type, needed in requirements.items():
            current = type_counts.get(frag_type, 0)
            max_score += needed * 10
            
            if needed > 0:
                # 计算满足度
                if current >= needed:
                    total_score += needed * 10
                else:
                    total_score += current * 10
                    # 有缺口
                    severity = 'high' if current == 0 else 'medium' if current < needed / 2 else 'low'
                    missing_types.append(frag_type)
                    
                    suggestions = TYPE_SUGGESTIONS.get(frag_type, ['补充相关类型的碎片'])
                    suggestion = suggestions[hash(goal + frag_type) % len(suggestions)]
                    
                    gaps.append({
                        "type": frag_type,
                        "severity": severity,
                        "current_count": current,
                        "needed_count": needed,
                        "suggestion": suggestion,
                        "action": GapService._get_action_for_type(frag_type),
                    })

        # 计算整体准备度
        overall_readiness = min(100, int((total_score / max(max_score, 1)) * 100)) if max_score > 0 else 50

        # 生成总结
        if overall_readiness >= 80:
            summary = f"你的碎片组合对「{goal}」已经相当完善了，{len(selected_fragments)}个碎片覆盖了大部分关键维度。可以直接开始融合分析。"
        elif overall_readiness >= 50:
            summary = f"你的碎片对「{goal}」有一定基础，但还缺{len(missing_types)}个关键维度。补充后再融合，结果会更精准。"
        else:
            summary = f"要完成「{goal}」，你还需要补充不少碎片。建议先按下方提示收集{len(missing_types)}类碎片，再回来融合。"

        return {
            "goal": goal,
            "has_enough_fragments": overall_readiness >= 50,
            "total_fragments": len(selected_fragments),
            "type_coverage": type_counts,
            "missing_types": missing_types,
            "gaps": gaps,
            "overall_readiness": overall_readiness,
            "summary": summary,
        }

    @staticmethod
    def _get_action_for_type(frag_type: str) -> str:
        """获取针对某类碎片的即时行动建议"""
        actions = {
            '技能': '今天列出3个你想学或已会的技能，选最实用的那个',
            '能力': '回顾过去一个月，找出一件你处理得不错的事，总结用了什么能力',
            '爱好': '打开相册或备忘录，找出你最近投入时间最多的一件事',
            '习惯': '记录今天的时间分配，找出可以优化的固定行为',
            '知识': '搜索目标行业的基础知识，收藏3篇干货文章',
            '经历': '写一段200字的自我介绍，突出最亮眼的一段经历',
            '资源': '列出你认识的、能帮上忙的人，哪怕只是微信好友',
            '性格': '问问身边的朋友，你最突出的3个性格特点是什么',
        }
        return actions.get(frag_type, '先收集一个相关碎片')

