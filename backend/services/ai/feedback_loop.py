"""
模板反馈权重追踪 — 贝叶斯平滑 + 持久化到 JSON 文件
Engine 0.6: 自毁机制（6个月设计寿命 / 兜底>15%告警 / 30天未触发淘汰）
"""

import json
import os
import time
from pathlib import Path
from threading import Lock
from typing import Optional


DATA_DIR = Path(__file__).parent.parent.parent / "data"
FEEDBACK_FILE = DATA_DIR / "template_feedback.json"

# 自毁常量
DESIGN_LIFE_DAYS = 180            # 6 个月设计寿命
DATA_SELF_DESTRUCT_DAYS = 30      # 30 天未触发标记淘汰
QUALITY_FALLBACK_ALERT_RATE = 0.15  # 兜底率 >15% 告警


class TemplateFeedbackTracker:
    """追踪方向原型的用户反馈，影响模板选择权重"""

    def __init__(self):
        self._lock = Lock()
        self._data: dict[str, dict] = {}
        self._load()

    def _load(self):
        """从文件加载反馈数据"""
        if FEEDBACK_FILE.exists():
            try:
                with open(FEEDBACK_FILE, "r", encoding="utf-8") as f:
                    self._data = json.load(f)
            except (json.JSONDecodeError, IOError):
                self._data = {}

    def _save(self):
        """持久化到文件"""
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with self._lock:
            try:
                with open(FEEDBACK_FILE, "w", encoding="utf-8") as f:
                    json.dump(self._data, f, ensure_ascii=False, indent=2)
            except IOError:
                pass

    def get_template_stats(self, template_id: str) -> dict:
        """获取某个模板的统计数据"""
        return self._data.get(template_id, {
            "template_id": template_id,
            "total_uses": 0,
            "useful_count": 0,
            "not_useful_count": 0,
            "not_useful_reasons": {},
            "weight_multiplier": 1.0,
        })

    def record_use(self, template_id: str):
        """记录模板被使用"""
        stats = self.get_template_stats(template_id)
        stats["total_uses"] += 1
        self._data[template_id] = stats
        self._save()

    def record_feedback(self, template_id: str, is_useful: bool, reason: Optional[str] = None):
        """
        记录用户反馈。

        Args:
            template_id: 模板 ID
            is_useful: 是否标记为有用
            reason: 没用时的原因（可选）
        """
        stats = self.get_template_stats(template_id)
        if is_useful:
            stats["useful_count"] += 1
        else:
            stats["not_useful_count"] += 1
            if reason:
                reasons = stats.setdefault("not_useful_reasons", {})
                reasons[reason] = reasons.get(reason, 0) + 1

        # 贝叶斯平滑权重计算
        # weight = (useful + prior_alpha) / (total + prior_alpha + prior_beta)
        # 先验: alpha=2, beta=2 (弱先验，假设初始 50% 有用率)
        alpha, beta = 2, 2
        useful = stats["useful_count"]
        total_feedback = stats["useful_count"] + stats["not_useful_count"]
        smoothed_rate = (useful + alpha) / (total_feedback + alpha + beta) if total_feedback > 0 else 0.5

        # 映射到权重乘数: 0.7 ~ 1.3
        stats["weight_multiplier"] = round(0.7 + smoothed_rate * 0.6, 3)
        self._data[template_id] = stats
        self._save()

    def get_weight(self, template_id: str) -> float:
        """获取模板的当前权重乘数"""
        stats = self.get_template_stats(template_id)
        return stats.get("weight_multiplier", 1.0)

    def get_stale_templates(self, days_threshold: int = 30) -> list[str]:
        """获取超过 N 天未被使用的模板 ID 列表（用于自毁机制）"""
        # 简化版：total_uses 为 0 的模板
        return [tid for tid, stats in self._data.items() if stats.get("total_uses", 0) == 0]

    def get_all_stats(self) -> dict:
        """获取所有模板的统计汇总"""
        return self._data

    # ---- Engine 0.6: 自毁机制 ----

    def design_life_monitor(self) -> list[dict]:
        """
        时间自毁 — 检查超过设计寿命（6个月）的模板。
        返回过期模板列表，含创建时间和使用次数。
        """
        expired = []
        now = time.time()
        for tid, stats in self._data.items():
            created = stats.get("created_at", 0)
            if created and (now - created) > DESIGN_LIFE_DAYS * 86400:
                expired.append({
                    "template_id": tid,
                    "age_days": round((now - created) / 86400, 1),
                    "total_uses": stats.get("total_uses", 0),
                    "status": "expired",
                })
        return expired

    def data_self_destruct_report(self) -> dict:
        """
        数据自毁 — 检查30天未触发的标记淘汰候选。
        返回建议淘汰的模板 ID 列表及摘要。
        """
        now = time.time()
        candidates = []
        for tid, stats in self._data.items():
            last_used = stats.get("last_used_at", 0)
            total = stats.get("total_uses", 0)
            if total == 0 or (last_used and (now - last_used) > DATA_SELF_DESTRUCT_DAYS * 86400):
                candidates.append({
                    "template_id": tid,
                    "days_since_last_use": round((now - last_used) / 86400, 1) if last_used else None,
                    "total_uses": total,
                    "useful_count": stats.get("useful_count", 0),
                    "not_useful_count": stats.get("not_useful_count", 0),
                })
        return {
            "candidates": candidates,
            "count": len(candidates),
        }

    def mark_used(self, template_id: str):
        """记录模板被使用的时间戳（用于自毁追踪）"""
        stats = self.get_template_stats(template_id)
        stats["last_used_at"] = time.time()
        self._data[template_id] = stats
        self._save()

    def get_self_destruct_summary(self) -> dict:
        """获取自毁机制完整摘要"""
        expired = self.design_life_monitor()
        stale = self.data_self_destruct_report()
        return {
            "design_life_days": DESIGN_LIFE_DAYS,
            "data_self_destruct_days": DATA_SELF_DESTRUCT_DAYS,
            "expired_templates": expired,
            "expired_count": len(expired),
            "stale_candidates": stale["candidates"],
            "stale_count": stale["count"],
        }


# 全局单例
feedback_tracker = TemplateFeedbackTracker()
