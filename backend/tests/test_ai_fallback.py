"""外部 AI 提供者兜底测试 — Engine 0.6 验证"""

import pytest
from unittest.mock import patch, AsyncMock

from services.ai.base import FusionRequest
from services.ai.external.ai_provider import ExternalProvider
from services.ai.config import ai_settings

pytestmark = pytest.mark.asyncio


@pytest.fixture
def external_provider():
    orig_key = ai_settings.AI_API_KEY
    orig_base = ai_settings.AI_API_BASE
    provider = ExternalProvider()
    yield provider
    ai_settings.AI_API_KEY = orig_key
    ai_settings.AI_API_BASE = orig_base


@pytest.fixture
def external_provider_configured():
    """创建并配置了 API key/base 的 provider"""
    ai_settings.AI_API_KEY = "sk-test"
    ai_settings.AI_API_BASE = "https://api.example.com"
    provider = ExternalProvider()
    yield provider
    ai_settings.AI_API_KEY = ""
    ai_settings.AI_API_BASE = ""


@pytest.fixture
def sample_fusion_request():
    return FusionRequest(
        profession="设计师",
        fragments=[
            {"type": "技能", "content": "UI 设计"},
            {"type": "经历", "content": "做过3个APP"},
            {"type": "性格", "content": "注重细节"},
            {"type": "能力", "content": "用户研究"},
            {"type": "资源", "content": "Sketch 熟练"},
        ],
        goal="做独立开发者",
    )


class TestExternalProviderAvailability:

    async def test_not_available_without_key(self, external_provider):
        """无 API key → is_available 返回 False"""
        ai_settings.AI_API_KEY = ""
        ai_settings.AI_API_BASE = "https://api.example.com"
        assert await external_provider.is_available() is False

    async def test_not_available_without_base(self, external_provider):
        """无 API base → is_available 返回 False"""
        ai_settings.AI_API_KEY = "sk-test"
        ai_settings.AI_API_BASE = ""
        assert await external_provider.is_available() is False

    async def test_available_with_key_and_base(self, external_provider_configured):
        """有 API key 和 base → is_available 返回 True"""
        assert await external_provider_configured.is_available() is True


class TestFuseFallback:

    async def test_fuse_returns_builtin_when_not_available(self, external_provider, sample_fusion_request):
        """外部不可用 → fuse 返回内置引擎结果"""
        ai_settings.AI_API_KEY = ""
        ai_settings.AI_API_BASE = ""
        result = await external_provider.fuse(sample_fusion_request)
        assert result.golden_sentence != ""
        assert result.profile_tag != ""
        assert result.confidence >= 30
        assert len(result.directions) >= 1
        assert result.insight != ""

    async def test_fuse_returns_builtin_when_api_fails(self, external_provider_configured, sample_fusion_request):
        """外部 API 调用失败 → fuse 回退到内置结果"""
        with patch.object(external_provider_configured, "_call_api", AsyncMock(return_value=None)):
            result = await external_provider_configured.fuse(sample_fusion_request)
            assert result.golden_sentence != ""
            assert result.profile_tag != ""
            assert len(result.directions) >= 1

    async def test_fuse_returns_builtin_when_api_raises(self, external_provider_configured, sample_fusion_request):
        """外部 API 抛异常 → fuse 回退到内置结果"""
        with patch.object(external_provider_configured, "_call_api", AsyncMock(side_effect=Exception("timeout"))):
            result = await external_provider_configured.fuse(sample_fusion_request)
            assert result.golden_sentence != ""
            assert result.profile_tag != ""


class TestExtractFragmentsFallback:

    async def test_extract_falls_back_when_not_available(self, external_provider):
        """外部不可用 → extract_fragments 使用内置"""
        ai_settings.AI_API_KEY = ""
        result = await external_provider.extract_fragments("今天学了新的设计模式")
        assert isinstance(result, list)

    async def test_extract_falls_back_when_api_fails(self, external_provider_configured):
        """外部 API 失败 → extract_fragments 回退内置"""
        with patch.object(external_provider_configured, "_call_api", AsyncMock(return_value=None)):
            result = await external_provider_configured.extract_fragments("今天学了新的设计模式")
            assert isinstance(result, list)

    async def test_extract_falls_back_when_api_raises(self, external_provider_configured):
        """外部 API 抛异常 → extract_fragments 回退内置"""
        with patch.object(external_provider_configured, "_call_api", AsyncMock(side_effect=Exception("timeout"))):
            result = await external_provider_configured.extract_fragments("今天学了新的设计模式")
            assert isinstance(result, list)


class TestClassifyTextFallback:

    async def test_classify_falls_back_when_not_available(self, external_provider):
        """外部不可用 → classify_text 使用内置"""
        ai_settings.AI_API_KEY = ""
        result = await external_provider.classify_text("今天工作很忙")
        assert isinstance(result, dict)
        assert "category" in result

    async def test_classify_falls_back_when_api_fails(self, external_provider_configured):
        """外部 API 失败 → classify_text 回退内置"""
        with patch.object(external_provider_configured, "_call_api", AsyncMock(return_value=None)):
            result = await external_provider_configured.classify_text("今天工作很忙")
            assert isinstance(result, dict)
            assert "category" in result

    async def test_classify_falls_back_when_api_raises(self, external_provider_configured):
        """外部 API 抛异常 → classify_text 回退内置"""
        with patch.object(external_provider_configured, "_call_api", AsyncMock(side_effect=Exception("timeout"))):
            result = await external_provider_configured.classify_text("今天工作很忙")
            assert isinstance(result, dict)
            assert "category" in result


class TestSparkAndScore:

    async def test_spark_delegates_to_builtin(self, external_provider):
        """spark 总是使用内置引擎"""
        result = await external_provider.spark(
            type("obj", (), {"fragments": [{"type": "技能", "content": "写作"}]})()
        )
        assert isinstance(result, dict) or result is None

    async def test_score_fragment_returns_int(self, external_provider):
        """score_fragment 总是返回 1-5 整数"""
        score = await external_provider.score_fragment("技能", "写作能力")
        assert isinstance(score, int)
        assert 1 <= score <= 5


class TestCallApi:

    async def test_call_api_returns_none_without_config(self, external_provider):
        """无 API base → _call_api 返回 None"""
        ai_settings.AI_API_BASE = ""
        result = await external_provider._call_api("system", "user", {})
        assert result is None

    async def test_call_api_retries_on_failure(self, external_provider_configured):
        """失败重试 — 多次失败后返回 None"""
        external_provider_configured._max_retries = 2

        with patch("services.ai.external.ai_provider.httpx.AsyncClient") as mock_client:
            mock_ctx = AsyncMock()
            mock_ctx.post.side_effect = Exception("connection error")
            mock_client.return_value.__aenter__.return_value = mock_ctx
            result = await external_provider_configured._call_api("system", "user", {})
            assert result is None
            assert mock_ctx.post.call_count == 2
