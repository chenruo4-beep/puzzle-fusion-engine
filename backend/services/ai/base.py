"""
AI 提供者抽象基类 + 数据类定义
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class FusionRequest:
    """融合分析请求"""
    profession: str
    fragments: list[dict]
    goal: Optional[str] = None


@dataclass
class FusionResult:
    """融合分析结果"""
    golden_sentence: str
    profile_tag: str
    confidence: int
    directions: list[dict] = field(default_factory=list)
    insight: str = ""
    skill_gaps: list[str] = field(default_factory=list)
    fragment_connections: list[dict] = field(default_factory=list)
    mini_directions: list[dict] = field(default_factory=list)


@dataclass
class SparkRequest:
    """灵感碰撞请求"""
    fragments: list[dict]


class AIProvider(ABC):
    """AI 提供者抽象基类"""

    provider_name: str = "base"

    @abstractmethod
    async def fuse(self, request: FusionRequest) -> FusionResult:
        """融合分析 — 对碎片进行深度分析并输出方向"""
        ...

    @abstractmethod
    async def spark(self, request: SparkRequest) -> dict:
        """灵感碰撞 — 轻量级碎片火花"""
        ...

    @abstractmethod
    async def score_fragment(self, fragment_type: str, content: str) -> int:
        """碎片质量评分 (1-5)"""
        ...

    @abstractmethod
    async def extract_fragments(self, text: str) -> list[dict]:
        """从文本中提取碎片"""
        ...

    @abstractmethod
    async def classify_text(self, content: str) -> dict:
        """文本分类（碎片 vs 日记）"""
        ...

    @abstractmethod
    async def is_available(self) -> bool:
        """检查提供者是否可用"""
        ...
