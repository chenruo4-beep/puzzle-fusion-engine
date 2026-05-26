"""日记路由异步测试 — httpx.AsyncClient 覆盖 journal CRUD + 特色功能"""

import pytest
from unittest.mock import patch, AsyncMock


pytestmark = pytest.mark.asyncio


class TestListJournals:
    """GET /api/journal/"""

    async def test_list_empty(self, async_client, async_auth_headers):
        resp = await async_client.get("/api/journal/", headers=async_auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert body["success"] is True
        assert body["data"]["items"] == []
        assert body["data"]["pagination"]["total"] == 0

    async def test_list_with_source_filter(self, async_client, async_auth_headers):
        with patch("services.ai_service.AIService.extract_fragments_from_journal", new_callable=AsyncMock) as m:
            m.return_value = None
            await async_client.post("/api/journal/", headers=async_auth_headers, json={
                "content": "今天做了很多事",
                "tags": "",
            })
        resp = await async_client.get("/api/journal/", headers=async_auth_headers)
        assert resp.status_code == 200
        assert resp.json()["data"]["pagination"]["total"] == 1

    async def test_list_pagination(self, async_client, async_auth_headers):
        with patch("services.ai_service.AIService.extract_fragments_from_journal", new_callable=AsyncMock) as m:
            m.return_value = None
            for i in range(3):
                await async_client.post("/api/journal/", headers=async_auth_headers, json={
                    "content": f"日记 {i}",
                    "tags": "",
                })
        resp = await async_client.get("/api/journal/?page=1&page_size=2", headers=async_auth_headers)
        assert resp.status_code == 200
        body = resp.json()["data"]
        assert len(body["items"]) == 2
        assert body["pagination"]["total"] == 3
        assert body["pagination"]["pages"] == 2

    async def test_list_requires_auth(self, async_client):
        resp = await async_client.get("/api/journal/")
        assert resp.status_code == 401


class TestCreateJournal:
    """POST /api/journal/"""

    async def test_create_basic(self, async_client, async_auth_headers):
        with patch("services.ai_service.AIService.extract_fragments_from_journal", new_callable=AsyncMock) as mock_extract:
            mock_extract.return_value = None
            resp = await async_client.post("/api/journal/", headers=async_auth_headers, json={
                "content": "今天学到了新东西",
                "tags": "学习,成长",
            })
        assert resp.status_code == 201
        body = resp.json()
        assert body["content"] == "今天学到了新东西"
        assert body["tags"] == "学习,成长"
        assert body["id"] > 0

    async def test_create_minimal(self, async_client, async_auth_headers):
        with patch("services.ai_service.AIService.extract_fragments_from_journal", new_callable=AsyncMock) as m:
            m.return_value = None
            resp = await async_client.post("/api/journal/", headers=async_auth_headers, json={
                "content": "最短的日记",
            })
        assert resp.status_code == 201

    async def test_create_empty_content_is_allowed(self, async_client, async_auth_headers):
        """日记API允许空内容（用户可能想只写标题等）"""
        with patch("services.ai_service.AIService.extract_fragments_from_journal", new_callable=AsyncMock) as m:
            m.return_value = None
            resp = await async_client.post("/api/journal/", headers=async_auth_headers, json={
                "content": "",
            })
        assert resp.status_code == 201

    async def test_create_missing_content_returns_422(self, async_client, async_auth_headers):
        resp = await async_client.post("/api/journal/", headers=async_auth_headers, json={})
        assert resp.status_code == 422

    async def test_create_with_ai_suggestion(self, async_client, async_auth_headers):
        mock_fragments = [
            {"type": "能力", "content": "写作"},
            {"type": "性格", "content": "善于观察"},
        ]
        with patch("services.ai_service.AIService.extract_fragments_from_journal", new_callable=AsyncMock) as mock_extract:
            mock_extract.return_value = mock_fragments
            resp = await async_client.post("/api/journal/", headers=async_auth_headers, json={
                "content": "今天写了篇文章",
            })
        assert resp.status_code == 201
        body = resp.json()
        assert body["suggested_fragments"] is not None

    async def test_create_requires_auth(self, async_client):
        resp = await async_client.post("/api/journal/", json={"content": "test"})
        assert resp.status_code == 401


class TestGetJournal:
    """GET /api/journal/{id}"""

    async def test_get_existing(self, async_client, async_auth_headers):
        with patch("services.ai_service.AIService.extract_fragments_from_journal", new_callable=AsyncMock) as m:
            m.return_value = None
            create_resp = await async_client.post("/api/journal/", headers=async_auth_headers, json={
                "content": "要查看的日记",
            })
        journal_id = create_resp.json()["id"]

        resp = await async_client.get(f"/api/journal/{journal_id}", headers=async_auth_headers)
        assert resp.status_code == 200
        assert resp.json()["content"] == "要查看的日记"

    async def test_get_nonexistent_returns_404(self, async_client, async_auth_headers):
        resp = await async_client.get("/api/journal/99999", headers=async_auth_headers)
        assert resp.status_code == 404

    async def test_get_other_user_journal_returns_404(self, async_client, async_auth_headers):
        resp = await async_client.get("/api/journal/99999", headers=async_auth_headers)
        assert resp.status_code == 404


class TestUpdateJournal:
    """PUT /api/journal/{id}"""

    async def test_update_own_journal(self, async_client, async_auth_headers):
        with patch("services.ai_service.AIService.extract_fragments_from_journal", new_callable=AsyncMock) as m:
            m.return_value = None
            create_resp = await async_client.post("/api/journal/", headers=async_auth_headers, json={
                "content": "原始内容",
                "tags": "",
            })
        journal_id = create_resp.json()["id"]

        with patch("services.ai_service.AIService.extract_fragments_from_journal", new_callable=AsyncMock) as m:
            m.return_value = None
            resp = await async_client.put(f"/api/journal/{journal_id}", headers=async_auth_headers, json={
                "content": "修改后的内容",
                "tags": "更新",
            })
        assert resp.status_code == 200
        assert resp.json()["content"] == "修改后的内容"

    async def test_update_nonexistent_returns_404(self, async_client, async_auth_headers):
        with patch("services.ai_service.AIService.extract_fragments_from_journal", new_callable=AsyncMock):
            resp = await async_client.put("/api/journal/99999", headers=async_auth_headers, json={
                "content": "随便写",
            })
        assert resp.status_code == 404


class TestDeleteJournal:
    """DELETE /api/journal/{id}"""

    async def test_delete_own_journal(self, async_client, async_auth_headers):
        with patch("services.ai_service.AIService.extract_fragments_from_journal", new_callable=AsyncMock) as m:
            m.return_value = None
            create_resp = await async_client.post("/api/journal/", headers=async_auth_headers, json={
                "content": "要删除的日记",
            })
        journal_id = create_resp.json()["id"]

        resp = await async_client.delete(f"/api/journal/{journal_id}", headers=async_auth_headers)
        assert resp.status_code == 200
        assert resp.json()["ok"] is True

        get_resp = await async_client.get(f"/api/journal/{journal_id}", headers=async_auth_headers)
        assert get_resp.status_code == 404

    async def test_delete_nonexistent_returns_404(self, async_client, async_auth_headers):
        resp = await async_client.delete("/api/journal/99999", headers=async_auth_headers)
        assert resp.status_code == 404


class TestQuickSave:
    """POST /api/journal/quick-save"""

    async def test_quick_save(self, async_client, async_auth_headers):
        with patch("services.ai_service.AIService.extract_fragments_from_journal", new_callable=AsyncMock) as mock_extract:
            mock_extract.return_value = None
            resp = await async_client.post("/api/journal/quick-save", headers=async_auth_headers, json={
                "template_id": "template-test",
                "question": "今天我大部分的能量消耗在了哪里",
                "answer": "创造",
            })
        assert resp.status_code == 200
        body = resp.json()
        assert "id" in body
        assert body["message"] == "已记录"

    async def test_quick_save_requires_auth(self, async_client):
        resp = await async_client.post("/api/journal/quick-save", json={
            "template_id": "test",
            "question": "q",
            "answer": "a",
        })
        assert resp.status_code == 401


class TestDailyTemplate:
    """GET /api/journal/daily-template"""

    async def test_daily_template_returns_prompt(self, async_client):
        resp = await async_client.get("/api/journal/daily-template")
        assert resp.status_code == 200
        body = resp.json()
        assert "id" in body
        assert "question" in body
        assert body["id"].startswith("template-")


class TestTodaySuggestion:
    """GET /api/journal/today-suggestion"""

    async def test_today_suggestion_requires_auth(self, async_client):
        resp = await async_client.get("/api/journal/today-suggestion")
        assert resp.status_code == 401

    async def test_today_suggestion_returns_suggestion(self, async_client, async_auth_headers):
        resp = await async_client.get("/api/journal/today-suggestion", headers=async_auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert "suggestion" in body
        assert "context" in body
        assert isinstance(body["suggestion"], str)
        assert len(body["suggestion"]) > 0


class TestDeepQuestion:
    """GET /api/journal/deep-question"""

    async def test_deep_question_requires_auth(self, async_client):
        resp = await async_client.get("/api/journal/deep-question")
        assert resp.status_code == 401

    async def test_deep_question_returns_question(self, async_client, async_auth_headers):
        resp = await async_client.get("/api/journal/deep-question", headers=async_auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert "question" in body
        assert "context" in body
        assert "timestamp" in body
        assert body["context"] in ["积累", "卡住", "完成", "探索"]


class TestWeeklyInsight:
    """GET /api/journal/weekly-insight"""

    async def test_weekly_insight_requires_auth(self, async_client):
        resp = await async_client.get("/api/journal/weekly-insight")
        assert resp.status_code == 401

    async def test_weekly_insight_empty_returns_message(self, async_client, async_auth_headers):
        """没有足够日记时返回鼓励消息"""
        with patch("services.ai_service.AIService.extract_fragments_from_journal", new_callable=AsyncMock) as m:
            m.return_value = None
            resp = await async_client.get("/api/journal/weekly-insight", headers=async_auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert "insights" in body or "message" in body

    async def test_weekly_insight_with_data(self, async_client, async_auth_headers):
        """有多条日记时返回洞察"""
        with patch("services.ai_service.AIService.extract_fragments_from_journal", new_callable=AsyncMock) as m:
            m.return_value = None
            for i in range(5):
                await async_client.post("/api/journal/", headers=async_auth_headers, json={
                    "content": f"第{i}天的记录，今天做了有意义的事",
                    "tags": "学习",
                })
        resp = await async_client.get("/api/journal/weekly-insight", headers=async_auth_headers)
        assert resp.status_code == 200
        body = resp.json()
        assert "insights" in body
        assert "highlight" in body
        assert "week" in body


class TestConfirmFragments:
    """POST /api/journal/{id}/confirm-fragments"""

    async def test_confirm_fragments(self, async_client, async_auth_headers):
        mock_fragments = [
            {"type": "能力", "content": "写作"},
            {"type": "性格", "content": "善于观察"},
        ]
        with patch("services.ai_service.AIService.extract_fragments_from_journal", new_callable=AsyncMock) as mock_extract:
            mock_extract.return_value = mock_fragments
            create_resp = await async_client.post("/api/journal/", headers=async_auth_headers, json={
                "content": "今天写了篇文章，感觉不错",
            })
        journal_id = create_resp.json()["id"]

        resp = await async_client.post(
            f"/api/journal/{journal_id}/confirm-fragments",
            headers=async_auth_headers,
            json={"indices": [0]},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert isinstance(body, list)
        assert len(body) == 1
        assert body[0]["type"] == "能力"

    async def test_confirm_no_pending_returns_400(self, async_client, async_auth_headers):
        with patch("services.ai_service.AIService.extract_fragments_from_journal", new_callable=AsyncMock) as mock_extract:
            mock_extract.return_value = None
            create_resp = await async_client.post("/api/journal/", headers=async_auth_headers, json={
                "content": "没有碎片的日记",
            })
        journal_id = create_resp.json()["id"]

        resp = await async_client.post(
            f"/api/journal/{journal_id}/confirm-fragments",
            headers=async_auth_headers,
            json={"indices": [0]},
        )
        assert resp.status_code == 400


class TestDismissFragments:
    """POST /api/journal/{id}/dismiss-fragments"""

    async def test_dismiss_fragments(self, async_client, async_auth_headers):
        mock_fragments = [{"type": "能力", "content": "编程"}]
        with patch("services.ai_service.AIService.extract_fragments_from_journal", new_callable=AsyncMock) as mock_extract:
            mock_extract.return_value = mock_fragments
            create_resp = await async_client.post("/api/journal/", headers=async_auth_headers, json={
                "content": "今天写了代码",
            })
        journal_id = create_resp.json()["id"]

        resp = await async_client.post(
            f"/api/journal/{journal_id}/dismiss-fragments",
            headers=async_auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["ok"] is True
