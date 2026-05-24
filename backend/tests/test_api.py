"""API 集成测试 — 覆盖核心路由的 CRUD 和权限保护"""

import pytest


class TestHealth:
    """健康检查"""

    def test_health_ok(self, client):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"


class TestAuthProtection:
    """未认证访问受保护路由应返回 401"""

    ENDPOINTS = [
        ("GET", "/api/fragments/"),
        ("POST", "/api/fragments/"),
        ("GET", "/api/fusions/"),
        ("POST", "/api/fusions/save"),
        ("GET", "/api/journal/"),
        ("POST", "/api/journal/"),
        ("GET", "/api/checkins/"),
        ("POST", "/api/checkins/"),
    ]

    @pytest.mark.parametrize("method,path", ENDPOINTS)
    def test_unauthenticated_returns_401(self, client, method, path):
        resp = client.request(method, path)
        assert resp.status_code == 401


class TestFragments:
    """碎片 CRUD 测试"""

    def _create(self, client, auth_headers, ftype="能力", content="test"):
        return client.post("/api/fragments/", headers=auth_headers, json={
            "fragment_type": ftype, "content": content,
        }).json()["data"]

    def test_list_fragments_empty(self, client, auth_headers):
        resp = client.get("/api/fragments/", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["data"]["items"] == []
        assert data["data"]["pagination"]["total"] == 0

    def test_create_fragment(self, client, auth_headers):
        resp = client.post("/api/fragments/", headers=auth_headers, json={
            "fragment_type": "能力",
            "content": "会写 Python 代码",
        })
        assert resp.status_code == 201
        data = resp.json()
        assert data["success"] is True
        fragment = data["data"]
        assert fragment["fragment_type"] == "能力"
        assert fragment["content"] == "会写 Python 代码"
        assert fragment["id"] > 0

    def test_list_fragments_after_create(self, client, auth_headers):
        self._create(client, auth_headers, "技能", "数据分析")
        resp = client.get("/api/fragments/", headers=auth_headers)
        data = resp.json()
        assert len(data["data"]["items"]) == 1
        assert data["data"]["pagination"]["total"] == 1

    def test_update_fragment(self, client, auth_headers):
        created = self._create(client, auth_headers, "能力", "旧内容")
        resp = client.put(f"/api/fragments/{created['id']}", headers=auth_headers, json={
            "content": "新内容",
        })
        assert resp.status_code == 200
        assert resp.json()["data"]["content"] == "新内容"

    def test_update_nonexistent_returns_404(self, client, auth_headers):
        resp = client.put("/api/fragments/99999", headers=auth_headers, json={
            "content": "不存在",
        })
        assert resp.status_code == 404

    def test_delete_fragment(self, client, auth_headers):
        created = self._create(client, auth_headers, "习惯", "每天写代码")
        resp = client.delete(f"/api/fragments/{created['id']}", headers=auth_headers)
        assert resp.status_code == 204

    def test_delete_nonexistent_returns_404(self, client, auth_headers):
        resp = client.delete("/api/fragments/99999", headers=auth_headers)
        assert resp.status_code == 404

    def test_archive_fragment(self, client, auth_headers):
        created = self._create(client, auth_headers, "知识", "Python 知识")
        resp = client.patch(f"/api/fragments/{created['id']}/archive",
                          headers=auth_headers, json={"archived": 1})
        assert resp.status_code == 200
        assert resp.json()["archived"] == 1

    def test_archive_nonexistent_returns_404(self, client, auth_headers):
        resp = client.patch("/api/fragments/99999/archive",
                          headers=auth_headers, json={"archived": 1})
        assert resp.status_code == 404

    def test_rate_fragment(self, client, auth_headers):
        created = self._create(client, auth_headers, "能力", "测试评分")
        resp = client.patch(f"/api/fragments/{created['id']}/rate",
                          headers=auth_headers, json={"quality_score": 5})
        assert resp.status_code == 200
        assert resp.json()["data"]["quality_score"] == 5

    def test_fragment_stats(self, client, auth_headers):
        self._create(client, auth_headers, "能力", "能力1")
        self._create(client, auth_headers, "技能", "技能1")
        resp = client.get("/api/fragments/stats", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_fragments"] == 2

    def test_scene_index(self, client):
        resp = client.get("/api/fragments/scene-index/能力")
        assert resp.status_code == 200
        assert resp.json()["fragment_type"] == "能力"
        assert "scenes" in resp.json()

    def test_pagination(self, client, auth_headers):
        for i in range(5):
            self._create(client, auth_headers, "能力", f"碎片{i}")
        resp = client.get("/api/fragments/?page=1&page_size=2", headers=auth_headers)
        data = resp.json()["data"]
        assert len(data["items"]) == 2
        assert data["pagination"]["total"] == 5
        assert data["pagination"]["pages"] == 3

    def test_user_isolation(self, client, auth_headers):
        """用户 A 的碎片不应出现在用户 B 的列表中"""
        import time
        ts = str(int(time.time() * 1000))
        self._create(client, auth_headers, "能力", "A的碎片")

        resp_b = client.post("/api/auth/register", json={
            "email": f"iso_{ts}_b@test.com", "password": "pass123",
        })
        headers_b = {"Authorization": f"Bearer {resp_b.json()['access_token']}"}
        resp = client.get("/api/fragments/", headers=headers_b).json()["data"]
        assert resp["pagination"]["total"] == 0


class TestFusions:
    """融合历史 CRUD 测试"""

    def _create_frags(self, client, auth_headers, n=2):
        return [
            client.post("/api/fragments/", headers=auth_headers, json={
                "fragment_type": "能力", "content": f"frag{i}",
            }).json()["data"]["id"]
            for i in range(n)
        ]

    def _save(self, client, auth_headers, fragment_ids, title="t"):
        return client.post("/api/fusions/save", headers=auth_headers, json={
            "profession": "测试", "title": title,
            "fragment_ids": fragment_ids,
            "result": '{"golden_sentence": "test"}',
        })

    def test_list_fusions_empty(self, client, auth_headers):
        resp = client.get("/api/fusions/", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["success"] is True
        assert resp.json()["data"]["items"] == []

    def test_save_fusion(self, client, auth_headers):
        ids = self._create_frags(client, auth_headers, 2)
        resp = self._save(client, auth_headers, ids, "测试融合")
        assert resp.status_code == 201
        assert resp.json()["title"] == "测试融合"

    def test_list_fusions_after_save(self, client, auth_headers):
        ids = self._create_frags(client, auth_headers, 2)
        self._save(client, auth_headers, ids)
        resp = client.get("/api/fusions/", headers=auth_headers).json()["data"]
        assert len(resp["items"]) == 1

    def test_get_fusion_by_id(self, client, auth_headers):
        ids = self._create_frags(client, auth_headers, 2)
        saved = self._save(client, auth_headers, ids, "融合详情").json()
        resp = client.get(f"/api/fusions/{saved['id']}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["title"] == "融合详情"

    def test_get_nonexistent_returns_404(self, client, auth_headers):
        resp = client.get("/api/fusions/99999", headers=auth_headers)
        assert resp.status_code == 404


class TestJournal:
    """日记 CRUD 测试"""

    def test_list_empty(self, client, auth_headers):
        resp = client.get("/api/journal/", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["data"]["items"] == []

    def test_create_journal(self, client, auth_headers):
        resp = client.post("/api/journal/", headers=auth_headers, json={
            "content": "今天写了代码，感觉不错",
            "tags": "工作",
        })
        assert resp.status_code == 201
        assert resp.json()["content"] == "今天写了代码，感觉不错"

    def test_get_by_id(self, client, auth_headers):
        created = client.post("/api/journal/", headers=auth_headers, json={
            "content": "单条日记",
        }).json()
        resp = client.get(f"/api/journal/{created['id']}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["content"] == "单条日记"

    def test_get_nonexistent_returns_404(self, client, auth_headers):
        resp = client.get("/api/journal/99999", headers=auth_headers)
        assert resp.status_code == 404

    def test_daily_template(self, client, auth_headers):
        resp = client.get("/api/journal/daily-template", headers=auth_headers)
        assert resp.status_code == 200
        assert "question" in resp.json()

    def test_today_suggestion(self, client, auth_headers):
        resp = client.get("/api/journal/today-suggestion", headers=auth_headers)
        assert resp.status_code == 200
        assert "suggestion" in resp.json()


class TestCheckin:
    """打卡测试（checkin 端点返回原始格式，非 success_response 包装）"""

    def test_list_empty(self, client, auth_headers):
        resp = client.get("/api/checkins/", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_checkin(self, client, auth_headers):
        resp = client.post("/api/checkins/", headers=auth_headers, json={
            "title": "今日打卡",
            "action": "写了代码",
        })
        assert resp.status_code == 201
        assert resp.json()["title"] == "今日打卡"
        assert resp.json()["id"] > 0

    def test_list_after_create(self, client, auth_headers):
        client.post("/api/checkins/", headers=auth_headers, json={
            "title": "打卡1", "action": "跑步",
        })
        assert len(client.get("/api/checkins/", headers=auth_headers).json()) == 1


class TestBilling:
    """用量查询"""

    def test_get_usage(self, client, auth_headers):
        resp = client.get("/api/billing/usage", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "tier" in data
        assert "fragments" in data
        assert "fusions" in data
