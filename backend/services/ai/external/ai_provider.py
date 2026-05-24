"""
外部 AI 提供者 — OpenAI-compatible API 封装
Engine 0.5: 三模板工作流（路由/点睛/微调），失败兜底到内置引擎
"""

import json
from typing import Optional

import httpx

from services.ai.base import AIProvider, FusionRequest, FusionResult
from services.ai.config import ai_settings
from services.ai.builtin.engine import BuiltinProvider
from services.ai.prompts.router_prompt import (
    ROUTER_SYSTEM_PROMPT, ROUTER_USER_TEMPLATE, ROUTER_PARAMS,
)
from services.ai.prompts.highlight_prompt import (
    HIGHLIGHT_SYSTEM_PROMPT, HIGHLIGHT_USER_TEMPLATE, HIGHLIGHT_PARAMS,
)
from services.ai.prompts.refine_prompt import (
    REFINE_SYSTEM_PROMPT, REFINE_USER_TEMPLATE, REFINE_PARAMS,
)
from services.ai.quality_monitor import quality_monitor


class ExternalProvider(AIProvider):
    """
    外部 AI 提供者 — OpenAI-compatible API。
    所有方法先尝试外部 API，失败后自动回退到 BuiltinProvider。
    """

    provider_name = "external"

    def __init__(self):
        self._builtin = BuiltinProvider()
        self._api_key = ai_settings.AI_API_KEY
        self._api_base = ai_settings.AI_API_BASE.rstrip("/") if ai_settings.AI_API_BASE else ""
        self._model = ai_settings.AI_MODEL
        self._max_retries = ai_settings.AI_MAX_RETRIES
        self._timeout = ai_settings.AI_TIMEOUT_SECONDS

    async def is_available(self) -> bool:
        if not self._api_key or not self._api_base:
            return False
        return True

    async def fuse(self, request: FusionRequest) -> FusionResult:
        """用内置引擎完成规则匹配，外部 AI 用于增强金句、方向文案和洞察"""
        builtin_result = self._builtin._builtin_fusion(
            request.profession, request.fragments, request.goal
        )

        if not await self.is_available():
            return self._dict_to_result(builtin_result)

        core = [f.get("content", "") for f in request.fragments[:3]]
        directions = builtin_result.get("directions", [])

        # 尝试用外部 AI 润色：金句 + 方向描述 + 洞察
        try:
            # 1. 润色金句
            direction_name = directions[0].get("title", "") if directions else ""
            direction_summary = directions[0].get("why_this_works", "")[:100] if directions else ""

            highlight = await self._call_api(
                system=HIGHLIGHT_SYSTEM_PROMPT,
                user=HIGHLIGHT_USER_TEMPLATE.format(
                    core_fragments="\n".join(f"- {c}" for c in core),
                    direction_name=direction_name,
                    direction_summary=direction_summary,
                ),
                params=HIGHLIGHT_PARAMS,
            )
            if highlight and "personalized_highlight" in highlight:
                builtin_result["golden_sentence"] = highlight["personalized_highlight"]

            # 2. 用 LLM 润色方向描述的 why_this_works（第一个方向，提升感知质量）
            if directions:
                refined = await self._call_api(
                    system=REFINE_SYSTEM_PROMPT,
                    user=REFINE_USER_TEMPLATE.format(
                        tags_and_keywords="\n".join(f"- {c}" for c in core),
                        current_stage="初步探索",
                        available_resources=request.profession,
                        step_template=directions[0].get("why_this_works", ""),
                    ),
                    params=REFINE_PARAMS,
                )
                if refined and "steps" in refined:
                    # 只取微调后的 steps 描述文本作为 why_this_works 的补充
                    refined_steps = refined["steps"]
                    if refined_steps and len(refined_steps) > 0:
                        actions_hint = "; ".join(refined_steps[0].get("actions", [])[:2])
                        if actions_hint:
                            directions[0]["why_this_works"] = (
                                directions[0]["why_this_works"]
                                + f"\n\n💡 一个可选的切入点：{actions_hint}"
                            )
        except Exception:
            quality_monitor.record_fallback("external", "fuse_highlight_failed")

        # 3. 润色 insight（整体洞察）
        try:
            if core and builtin_result.get("insight"):
                insight_prompt = (
                    f"用户的关键碎片：{'、'.join(c[:20] for c in core)}\n"
                    f"当前洞察：{builtin_result['insight'][:200]}\n"
                    "请用一句接地气的话总结这个人的核心优势（不超过60字），"
                    "像朋友看穿了你那样说。"
                )
                insight_result = await self._call_api(
                    system="你是一个敏锐的个人观察者。一句话点破一个人的核心优势。输出纯JSON：{\"insight\": \"一句话\"}",
                    user=insight_prompt,
                    params={"temperature": 0.7, "max_tokens": 200},
                )
                if insight_result and "insight" in insight_result:
                    builtin_result["insight"] = insight_result["insight"]
        except Exception:
            pass

        builtin_result["directions"] = directions
        return self._dict_to_result(builtin_result)

    async def spark(self, request) -> dict:
        """回退到内置火花引擎"""
        return await self._builtin.spark(request)

    async def score_fragment(self, fragment_type: str, content: str) -> int:
        """回退到内置评分"""
        return await self._builtin.score_fragment(fragment_type, content)

    async def extract_fragments(self, text: str) -> list[dict]:
        """先用外部 AI 提取，失败回退内置"""
        if not await self.is_available():
            return await self._builtin.extract_fragments(text)

        try:
            result = await self._call_api(
                system=ROUTER_SYSTEM_PROMPT,
                user=ROUTER_USER_TEMPLATE.format(user_text=text),
                params=ROUTER_PARAMS,
            )
            if result and "is_valid" in result:
                if result.get("is_valid") and result.get("tags"):
                    return [
                        {"type": "能力", "content": text[:30], "tags": result.get("tags", [])}
                    ]
            return []
        except Exception:
            quality_monitor.record_fallback("external", "extract_fragments_failed")
            return await self._builtin.extract_fragments(text)

    async def classify_text(self, content: str) -> dict:
        """先用外部 AI 分类，失败回退内置"""
        if not await self.is_available():
            return await self._builtin.classify_text(content)

        try:
            result = await self._call_api(
                system=ROUTER_SYSTEM_PROMPT,
                user=ROUTER_USER_TEMPLATE.format(user_text=content),
                params=ROUTER_PARAMS,
            )
            if result and "is_valid" in result:
                return {
                    "category": "fragment" if result.get("is_valid") else "journal",
                    "fragment_type": "能力",
                    "quality_score": int(result.get("confidence", 0.5) * 5),
                    "is_valid": result.get("is_valid", True),
                    "capability_tags": result.get("tags", []),
                    "reason": result.get("reason", ""),
                }
            return await self._builtin.classify_text(content)
        except Exception:
            quality_monitor.record_fallback("external", "classify_text_failed")
            return await self._builtin.classify_text(content)

    async def _call_api(
        self, system: str, user: str, params: dict
    ) -> Optional[dict]:
        """调用 OpenAI-compatible 聊天 API"""
        if not self._api_base or not self._api_key:
            return None

        url = f"{self._api_base}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self._model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            **params,
        }

        last_err = None
        for attempt in range(self._max_retries):
            try:
                async with httpx.AsyncClient(timeout=self._timeout) as client:
                    resp = await client.post(url, json=payload, headers=headers)
                    resp.raise_for_status()
                    data = resp.json()

                content = data["choices"][0]["message"]["content"]
                # 去除可能的 markdown 包裹
                content = content.strip()
                if content.startswith("```"):
                    content = content.split("\n", 1)[-1]
                    content = content.rsplit("```", 1)[0]
                return json.loads(content.strip())
            except Exception as e:
                last_err = e
                if attempt < self._max_retries - 1:
                    continue

        return None

    @staticmethod
    def _dict_to_result(data: dict) -> FusionResult:
        return FusionResult(
            golden_sentence=data.get("golden_sentence", ""),
            profile_tag=data.get("profile_tag", ""),
            confidence=data.get("confidence", 50),
            directions=data.get("directions", []),
            insight=data.get("insight", ""),
            skill_gaps=data.get("skill_gaps", []),
            fragment_connections=data.get("fragment_connections", []),
            mini_directions=data.get("mini_directions", []),
        )
