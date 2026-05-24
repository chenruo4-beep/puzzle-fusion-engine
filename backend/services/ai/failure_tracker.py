"""
失败飞轮 — P3.1 高频失败路径追踪
记录用户卡住/放弃事件，分析失败模式，生成"X%的人在这里卡住了"提示。
"""

import json
import time
from collections import defaultdict
from pathlib import Path
from threading import Lock
from typing import Optional

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
FAILURE_FILE = DATA_DIR / "failure_flywheel.json"

# 卡住判定阈值
STUCK_THRESHOLD_DAYS = 7          # 超过7天未推进视为卡住
STUCK_PROGRESS_CEILING = 20       # 完成度≤20%视为卡住
ABANDON_PROGRESS_CEILING = 30     # 放弃时的完成度上限（不记录已完成地图的放弃）


class FailureFlywheel:
    """失败飞轮 — 追踪高频失败路径和常见卡住节点"""

    def __init__(self):
        self._lock = Lock()
        self._data: dict = {
            "abandoned_maps": [],       # 放弃的地图 [{map_id, title, progress, timestamp}]
            "stuck_steps": [],           # 卡住步骤 [{map_id, step_number, landmark, days_stuck}]
            "failure_reasons": {},       # 放弃原因统计 {reason: count}
            "prototype_failures": {},    # 原型失败率 {proto_id: {attempts, stuck, abandoned}}
            "total_maps_created": 0,     # 总创建地图数（用于计算比例）
            "total_maps_abandoned": 0,
        }
        self._load()

    def _load(self):
        if FAILURE_FILE.exists():
            try:
                with open(FAILURE_FILE, "r", encoding="utf-8") as f:
                    stored = json.load(f)
                    self._data.update(stored)
            except (json.JSONDecodeError, IOError):
                pass

    def _save(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        with self._lock:
            try:
                with open(FAILURE_FILE, "w", encoding="utf-8") as f:
                    json.dump(self._data, f, ensure_ascii=False, indent=2)
            except IOError:
                pass

    # ---- 地图级追踪 ----

    def record_map_created(self):
        """记录新地图创建"""
        with self._lock:
            self._data["total_maps_created"] += 1
        self._save()

    def record_map_abandoned(self, map_id: int, title: str, progress: int, reason: str = ""):
        """记录地图被放弃"""
        if progress > ABANDON_PROGRESS_CEILING:
            return  # 高完成度的不计入失败
        event = {
            "map_id": map_id,
            "title": title[:40],
            "progress": progress,
            "reason": reason,
            "timestamp": time.time(),
        }
        with self._lock:
            self._data["abandoned_maps"].append(event)
            self._data["total_maps_abandoned"] += 1
            if len(self._data["abandoned_maps"]) > 1000:
                self._data["abandoned_maps"] = self._data["abandoned_maps"][-1000:]
            if reason:
                reasons = self._data["failure_reasons"]
                reasons[reason] = reasons.get(reason, 0) + 1
        self._save()

    def record_stuck_step(self, map_id: int, step_number: int, landmark: str, days_stuck: int):
        """记录步骤卡住"""
        event = {
            "map_id": map_id,
            "step_number": step_number,
            "landmark": landmark[:20],
            "days_stuck": days_stuck,
            "timestamp": time.time(),
        }
        with self._lock:
            self._data["stuck_steps"].append(event)
            if len(self._data["stuck_steps"]) > 2000:
                self._data["stuck_steps"] = self._data["stuck_steps"][-2000:]
        self._save()

    # ---- 原型级追踪 ----

    def record_prototype_attempt(self, proto_id: str):
        """记录某个原型的尝试"""
        with self._lock:
            stats = self._data["prototype_failures"].setdefault(proto_id, {
                "attempts": 0, "stuck": 0, "abandoned": 0,
            })
            stats["attempts"] += 1
        self._save()

    def record_prototype_stuck(self, proto_id: str):
        """记录原型步骤卡住"""
        with self._lock:
            stats = self._data["prototype_failures"].setdefault(proto_id, {
                "attempts": 0, "stuck": 0, "abandoned": 0,
            })
            stats["stuck"] += 1
        self._save()

    def record_prototype_abandoned(self, proto_id: str):
        """记录原型被放弃"""
        with self._lock:
            stats = self._data["prototype_failures"].setdefault(proto_id, {
                "attempts": 0, "stuck": 0, "abandoned": 0,
            })
            stats["abandoned"] += 1
        self._save()

    # ---- 查询 ----

    def get_stuck_rate_for_step(self, step_number: int, proto_id: str = "") -> float:
        """获取某步骤的卡住率"""
        with self._lock:
            total = self._data["total_maps_created"]
            if total == 0:
                return 0.0
            stuck = len([e for e in self._data["stuck_steps"] if e["step_number"] == step_number])
        return min(stuck / total, 1.0)

    def get_abandon_rate_for_prototype(self, proto_id: str) -> float:
        """获取某原型的放弃率"""
        with self._lock:
            stats = self._data["prototype_failures"].get(proto_id, {"attempts": 0, "abandoned": 0})
            attempts = stats["attempts"]
            abandoned = stats["abandoned"]
        if attempts == 0:
            return 0.0
        return abandoned / attempts

    def get_failure_message(self, proto_id: str, step_number: int) -> str:
        """生成"X%的人在这里卡住了"提示"""
        stuck_rate = self.get_stuck_rate_for_step(step_number, proto_id)
        abandon_rate = self.get_abandon_rate_for_prototype(proto_id)
        total_rate = (stuck_rate + abandon_rate) / 2

        if total_rate > 0.7:
            return f"⚠️ 这条路也有{total_rate:.0%}的人在这里卡住了，原因是..." if total_rate >= 0.3 else ""
        if total_rate > 0.3:
            return f"💡 约{total_rate:.0%}的人走到这一步需要多花点时间，不用急"

        return ""

    def get_hot_stuck_steps(self, limit: int = 5) -> list[dict]:
        """获取最常见的卡住步骤"""
        step_counts = defaultdict(int)
        for e in self._data["stuck_steps"]:
            key = (e["landmark"], e["step_number"])
            step_counts[key] += 1
        sorted_steps = sorted(step_counts.items(), key=lambda x: -x[1])
        return [
            {"landmark": k[0], "step_number": k[1], "stuck_count": v}
            for k, v in sorted_steps[:limit]
        ]

    def get_summary(self) -> dict:
        """获取失败飞轮摘要"""
        with self._lock:
            total = self._data["total_maps_created"]
            abandoned = self._data["total_maps_abandoned"]
            stuck = len(self._data["stuck_steps"])
        return {
            "total_maps_created": total,
            "total_maps_abandoned": abandoned,
            "abandon_rate": round(abandoned / total, 3) if total else 0.0,
            "stuck_events": stuck,
            "top_stuck_steps": self.get_hot_stuck_steps(5),
            "failure_reasons": dict(self._data["failure_reasons"]),
        }


failure_flywheel = FailureFlywheel()
