"""
质量监控 — Engine 0.6 反馈闭环
追踪兜底率、有用反馈率、方向点击率，超阈值告警。
"""

import json
import time
from collections import defaultdict
from pathlib import Path
from threading import Lock

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
MONITOR_FILE = DATA_DIR / "quality_monitor.json"

# 告警阈值
FALLBACK_RATE_ALERT = 0.15       # 兜底率 >15% 告警
MIN_FEEDBACK_SAMPLE = 10         # 最小反馈样本量
USEFUL_RATE_FLOOR = 0.3          # 有用率 <30% 告警


class QualityMonitor:
    """质量监控 — 单例"""

    def __init__(self):
        self._lock = Lock()
        self._data: dict = {
            "fallback_events": [],       # 兜底事件 [{timestamp, provider, reason}]
            "feedback_stats": {          # 反馈统计
                "useful": 0,
                "not_useful": 0,
                "reasons": {},
            },
            "direction_clicks": 0,       # 方向推荐点击次数
            "total_fusions": 0,          # 总融合次数
            "alerts": [],                # 历史告警
        }
        self._load()

    def _load(self):
        if MONITOR_FILE.exists():
            try:
                with open(MONITOR_FILE, "r", encoding="utf-8") as f:
                    stored = json.load(f)
                    self._data.update(stored)
            except (json.JSONDecodeError, IOError):
                pass

    def _save(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with self._lock:
            try:
                with open(MONITOR_FILE, "w", encoding="utf-8") as f:
                    json.dump(self._data, f, ensure_ascii=False, indent=2)
            except IOError:
                pass

    # ---- 兜底追踪 ----

    def record_fusion(self):
        """记录一次融合事件"""
        with self._lock:
            self._data["total_fusions"] += 1
        self._save()

    def record_fallback(self, provider: str, reason: str = ""):
        """记录一次兜底事件"""
        event = {
            "timestamp": time.time(),
            "provider": provider,
            "reason": reason,
        }
        with self._lock:
            self._data["fallback_events"].append(event)
            self._data["total_fusions"] += 1
            # 只保留最近 1000 条
            if len(self._data["fallback_events"]) > 1000:
                self._data["fallback_events"] = self._data["fallback_events"][-1000:]
        self._save()
        self._check_fallback_rate()

    def _check_fallback_rate(self):
        """检查兜底率是否超过阈值"""
        rate = self.get_fallback_rate(hours=24)
        if rate > FALLBACK_RATE_ALERT:
            alert = {
                "timestamp": time.time(),
                "type": "fallback_rate",
                "value": round(rate, 3),
                "threshold": FALLBACK_RATE_ALERT,
                "message": f"兜底率 {rate:.1%} 超过阈值 {FALLBACK_RATE_ALERT:.0%}",
            }
            with self._lock:
                if not self._data["alerts"] or self._data["alerts"][-1]["type"] != "fallback_rate":
                    self._data["alerts"].append(alert)
                    if len(self._data["alerts"]) > 100:
                        self._data["alerts"] = self._data["alerts"][-100:]
            self._save()

    def get_fallback_rate(self, hours: int = 24) -> float:
        """获取最近 N 小时的兜底率"""
        cutoff = time.time() - hours * 3600
        with self._lock:
            recent = [e for e in self._data["fallback_events"] if e["timestamp"] > cutoff]
            total = self._data["total_fusions"]
        if total == 0:
            return 0.0
        return len(recent) / total

    # ---- 反馈追踪 ----

    def record_feedback(self, is_useful: bool, reason: str = ""):
        """记录用户对融合结果的反馈"""
        with self._lock:
            if is_useful:
                self._data["feedback_stats"]["useful"] += 1
            else:
                self._data["feedback_stats"]["not_useful"] += 1
                if reason:
                    reasons = self._data["feedback_stats"]["reasons"]
                    reasons[reason] = reasons.get(reason, 0) + 1
        self._save()
        self._check_useful_rate()

    def _check_useful_rate(self):
        """检查有用反馈率是否过低"""
        stats = self._data["feedback_stats"]
        total = stats["useful"] + stats["not_useful"]
        if total < MIN_FEEDBACK_SAMPLE:
            return
        rate = stats["useful"] / total
        if rate < USEFUL_RATE_FLOOR:
            alert = {
                "timestamp": time.time(),
                "type": "useful_rate",
                "value": round(rate, 3),
                "threshold": USEFUL_RATE_FLOOR,
                "message": f"有用反馈率 {rate:.1%} 低于阈值 {USEFUL_RATE_FLOOR:.0%}",
            }
            with self._lock:
                if not self._data["alerts"] or self._data["alerts"][-1]["type"] != "useful_rate":
                    self._data["alerts"].append(alert)
            self._save()

    def get_useful_rate(self) -> float:
        """获取有用反馈率"""
        stats = self._data["feedback_stats"]
        total = stats["useful"] + stats["not_useful"]
        if total == 0:
            return 0.0
        return stats["useful"] / total

    # ---- 方向点击 ----

    def record_direction_click(self):
        """记录用户点击了某个方向推荐"""
        with self._lock:
            self._data["direction_clicks"] += 1
        self._save()

    def get_direction_click_rate(self) -> float:
        """方向推荐点击率（点击/融合）"""
        with self._lock:
            clicks = self._data["direction_clicks"]
            total = self._data["total_fusions"]
        if total == 0:
            return 0.0
        return clicks / total

    # ---- 报告 ----

    def get_quality_report(self) -> dict:
        """生成质量报告"""
        with self._lock:
            stats = dict(self._data["feedback_stats"])
            alerts = list(self._data["alerts"])
            clicks = self._data["direction_clicks"]
            total = self._data["total_fusions"]

        total_feedback = stats["useful"] + stats["not_useful"]
        return {
            "total_fusions": total,
            "fallback_rate_24h": round(self.get_fallback_rate(24), 3),
            "fallback_rate_7d": round(self.get_fallback_rate(24 * 7), 3),
            "useful_rate": round(self.get_useful_rate(), 3),
            "total_feedback": total_feedback,
            "direction_click_rate": round(self.get_direction_click_rate(), 3),
            "recent_alerts": alerts[-5:] if alerts else [],
        }

    # ---- 自毁机制 ----

    def get_stale_data(self, days: int = 30) -> dict:
        """获取过时数据的摘要（用于数据自毁标记）"""
        cutoff = time.time() - days * 86400
        with self._lock:
            old_events = [e for e in self._data["fallback_events"] if e["timestamp"] < cutoff]
        return {
            "old_fallback_events": len(old_events),
            "total_fallback_events": len(self._data["fallback_events"]),
        }

    def cleanup_stale_data(self, days: int = 30):
        """清理过时兜底事件"""
        cutoff = time.time() - days * 86400
        with self._lock:
            before = len(self._data["fallback_events"])
            self._data["fallback_events"] = [
                e for e in self._data["fallback_events"] if e["timestamp"] > cutoff
            ]
            after = len(self._data["fallback_events"])
        self._save()
        return {"removed": before - after, "remaining": after}


quality_monitor = QualityMonitor()
