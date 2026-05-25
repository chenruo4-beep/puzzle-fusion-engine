"""支付模块测试 — 订阅创建 / 状态查询 / 支付历史 / Webhook"""

import json
import time
from unittest.mock import patch, MagicMock, ANY
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

from main import app
from models.user import User
from models.payment import Payment
from config import settings
from database import Base

_ts = str(int(time.time() * 1000))

# 创建测试数据库引擎（与 conftest 相同的数据库文件）
_TEST_DB_URL = "sqlite:///./test_puzzle_fusion.db"
_test_engine = create_engine(_TEST_DB_URL, connect_args={"check_same_thread": False})


@event.listens_for(_test_engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=_test_engine)


def _get_test_db():
    """获取测试数据库会话"""
    db = TestingSessionLocal()
    try:
        return db
    except:
        db.close()
        raise


def _enable_stripe():
    """设置 Stripe 密钥（测试用），使路由不返回 501"""
    settings.STRIPE_SECRET_KEY = "sk_test_mock_key_for_testing"
    settings.STRIPE_WEBHOOK_SECRET = "whsec_mock_test_secret"


class StripeMockMixin:
    """提供 mock Stripe 对象的辅助方法"""

    @staticmethod
    def mock_subscription(**kwargs):
        """创建一个模拟的 Stripe Subscription 对象"""
        sub = MagicMock()
        sub.id = kwargs.get("id", "sub_mock_123")
        sub.status = kwargs.get("status", "active")
        sub.current_period_end = kwargs.get(
            "current_period_end",
            int((datetime.now(timezone.utc) + timedelta(days=30)).timestamp()),
        )
        sub.cancel_at_period_end = kwargs.get("cancel_at_period_end", False)
        sub.metadata = kwargs.get("metadata", {"user_id": "1"})
        sub.items = MagicMock()
        sub.items.data = []
        return sub

    @staticmethod
    def mock_checkout_session(**kwargs):
        """创建一个模拟的 Stripe Checkout Session"""
        session = MagicMock()
        session.id = kwargs.get("id", "cs_mock_123")
        session.url = kwargs.get("url", "https://checkout.stripe.com/c/pay/cs_mock_123")
        session.customer = kwargs.get("customer", "cus_mock_123")
        session.subscription = kwargs.get("subscription", "sub_mock_123")
        session.metadata = kwargs.get("metadata", {"user_id": "1"})
        session.mode = "subscription"
        return session

    @staticmethod
    def mock_invoice(**kwargs):
        """创建一个模拟的 Stripe Invoice"""
        return {
            "id": kwargs.get("id", "in_mock_123"),
            "subscription": kwargs.get("subscription", "sub_mock_123"),
            "customer": kwargs.get("customer", "cus_mock_123"),
            "payment_intent": kwargs.get("payment_intent", "pi_mock_123"),
            "amount_paid": kwargs.get("amount_paid", 2900),
            "amount_due": kwargs.get("amount_due", 2900),
            "currency": kwargs.get("currency", "cny"),
            "status": kwargs.get("status", "paid"),
        }


class TestCreateSubscription(StripeMockMixin):
    """创建订阅测试"""

    def _register_and_auth(self, client):
        email = f"sub_test_{_ts}@example.com"
        resp = client.post("/api/auth/register", json={
            "email": email,
            "password": "testpass123",
        })
        token = resp.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    @patch("services.payment.stripe.checkout.Session.create")
    @patch("services.payment.stripe.Customer.create")
    def test_create_subscription_success(self, mock_customer_create, mock_session_create, client):
        """正常创建订阅 → 返回 checkout URL"""
        _enable_stripe()
        auth = self._register_and_auth(client)

        mock_customer = MagicMock()
        mock_customer.id = "cus_mock_123"
        mock_customer_create.return_value = mock_customer

        mock_session = self.mock_checkout_session()
        mock_session_create.return_value = mock_session

        resp = client.post("/api/billing/create-subscription", json={
            "price_id": settings.STRIPE_PRICE_MONTHLY,
            "success_url": "http://localhost:3000/dashboard",
            "cancel_url": "http://localhost:3000/billing",
        }, headers=auth)

        assert resp.status_code == 200
        data = resp.json()
        assert "url" in data
        assert "checkout.stripe.com" in data["url"]
        assert data["session_id"] == "cs_mock_123"

        mock_session_create.assert_called_once()
        call_kwargs = mock_session_create.call_args.kwargs
        assert call_kwargs["mode"] == "subscription"
        assert call_kwargs["line_items"][0]["price"] == settings.STRIPE_PRICE_MONTHLY

    @patch("services.payment.stripe.checkout.Session.create")
    @patch("services.payment.stripe.Customer.create")
    def test_customer_not_created_twice(self, mock_customer_create, mock_session_create, client):
        """已有 stripe_customer_id 的用户不应重复创建 Customer"""
        _enable_stripe()
        auth = self._register_and_auth(client)

        # 通过测试数据库设置 stripe_customer_id
        db = _get_test_db()
        try:
            user = db.query(User).first()
            user.stripe_customer_id = "cus_existing_456"
            db.commit()
        finally:
            db.close()

        mock_session = self.mock_checkout_session()
        mock_session_create.return_value = mock_session

        resp = client.post("/api/billing/create-subscription", json={
            "price_id": settings.STRIPE_PRICE_MONTHLY,
            "success_url": "http://localhost:3000/dashboard",
            "cancel_url": "http://localhost:3000/billing",
        }, headers=auth)

        assert resp.status_code == 200
        mock_customer_create.assert_not_called()

    @patch("services.payment.stripe.checkout.Session.create")
    @patch("services.payment.stripe.Customer.create")
    def test_stripe_error_returns_502(self, mock_customer_create, mock_session_create, client):
        """Stripe 服务异常 → 502"""
        _enable_stripe()
        import stripe as stripe_module
        mock_customer = MagicMock()
        mock_customer.id = "cus_mock_502"
        mock_customer_create.return_value = mock_customer
        auth = self._register_and_auth(client)

        mock_session_create.side_effect = stripe_module.error.StripeError("Service unavailable")

        resp = client.post("/api/billing/create-subscription", json={
            "price_id": settings.STRIPE_PRICE_MONTHLY,
            "success_url": "http://localhost:3000/dashboard",
            "cancel_url": "http://localhost:3000/billing",
        }, headers=auth)

        assert resp.status_code == 502

    def test_requires_auth(self, client):
        """未认证 → 401"""
        resp = client.post("/api/billing/create-subscription", json={
            "price_id": "price_xxx",
            "success_url": "http://localhost:3000/dashboard",
            "cancel_url": "http://localhost:3000/billing",
        })
        assert resp.status_code == 401

    def test_unconfigured_stripe(self, client):
        """STRIPE_SECRET_KEY 为空 → 501"""
        auth = self._register_and_auth(client)

        original_key = settings.STRIPE_SECRET_KEY
        settings.STRIPE_SECRET_KEY = ""
        try:
            resp = client.post("/api/billing/create-subscription", json={
                "price_id": "price_xxx",
                "success_url": "http://localhost:3000/dashboard",
                "cancel_url": "http://localhost:3000/billing",
            }, headers=auth)
            assert resp.status_code == 501
        finally:
            settings.STRIPE_SECRET_KEY = original_key


class TestSubscriptionStatus(StripeMockMixin):
    """订阅状态查询测试"""

    def _setup_user_with_subscription(self):
        """创建一个带 Stripe 订阅的用户"""
        db = _get_test_db()
        try:
            user = db.query(User).filter(User.email == f"status_test_{_ts}@example.com").first()
            if not user:
                return None
            user.tier = "pro"
            user.stripe_customer_id = "cus_mock_789"
            user.stripe_subscription_id = "sub_mock_789"
            user.subscription_status = "active"
            user.subscription_current_period_end = datetime.now(timezone.utc) + timedelta(days=30)
            db.commit()
            return user
        finally:
            db.close()

    def test_free_user_status(self, client):
        """免费用户状态"""
        email = f"status_test_{_ts}@example.com"
        resp = client.post("/api/auth/register", json={
            "email": email,
            "password": "testpass123",
        })
        token = resp.json()["access_token"]

        resp = client.get("/api/billing/subscription", headers={
            "Authorization": f"Bearer {token}"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["tier"] == "free"
        assert data["is_active"] is False

    def test_pro_user_status(self, client):
        """专业版用户状态"""
        client.post("/api/auth/register", json={
            "email": f"status_test_{_ts}@example.com",
            "password": "testpass123",
        })
        login_resp = client.post("/api/auth/login", json={
            "email": f"status_test_{_ts}@example.com",
            "password": "testpass123",
        })
        token = login_resp.json()["access_token"]

        self._setup_user_with_subscription()

        resp = client.get("/api/billing/subscription", headers={
            "Authorization": f"Bearer {token}"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["tier"] == "pro"
        assert data["is_active"] is True

    @patch("services.payment.stripe.Subscription.retrieve")
    def test_cancel_at_period_end(self, mock_sub_retrieve, client):
        """周期结束取消标志正确返回"""
        client.post("/api/auth/register", json={
            "email": f"status_test_cancel_{_ts}@example.com",
            "password": "testpass123",
        })
        login_resp = client.post("/api/auth/login", json={
            "email": f"status_test_cancel_{_ts}@example.com",
            "password": "testpass123",
        })
        token = login_resp.json()["access_token"]

        db = _get_test_db()
        try:
            user = db.query(User).first()
            user.tier = "pro"
            user.stripe_customer_id = "cus_cancel_1"
            user.stripe_subscription_id = "sub_cancel_1"
            user.subscription_status = "active"
            db.commit()
        finally:
            db.close()

        mock_sub = self.mock_subscription(id="sub_cancel_1", cancel_at_period_end=True)
        mock_sub_retrieve.return_value = mock_sub

        resp = client.get("/api/billing/subscription", headers={
            "Authorization": f"Bearer {token}"
        })
        assert resp.status_code == 200
        assert resp.json()["cancel_at_period_end"] is True


class TestCancelSubscription(StripeMockMixin):
    """取消订阅测试"""

    def test_cancel_without_subscription(self, client):
        """无订阅时取消 → 400"""
        email = f"cancel_no_sub_{_ts}@example.com"
        resp = client.post("/api/auth/register", json={
            "email": email,
            "password": "testpass123",
        })
        token = resp.json()["access_token"]

        resp = client.post("/api/billing/cancel-subscription", headers={
            "Authorization": f"Bearer {token}"
        })
        assert resp.status_code == 400


class TestPaymentHistory:
    """支付历史测试"""

    def _seed_payments(self, user_id: int):
        db = _get_test_db()
        try:
            payments = [
                Payment(
                    user_id=user_id,
                    amount=2900,
                    currency="cny",
                    status="succeeded",
                    plan_type="monthly",
                    stripe_invoice_id=f"in_{_ts}_{i}",
                )
                for i in range(3)
            ]
            for p in payments:
                db.add(p)
            db.commit()
        finally:
            db.close()

    def test_payment_history(self, client):
        """支付历史返回有序列表"""
        email = f"pay_hist_{_ts}@example.com"
        resp = client.post("/api/auth/register", json={
            "email": email,
            "password": "testpass123",
        })
        token = resp.json()["access_token"]
        user_id = resp.json()["user_id"]

        self._seed_payments(user_id)

        resp = client.get("/api/billing/payments", headers={
            "Authorization": f"Bearer {token}"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "payments" in data
        assert len(data["payments"]) == 3
        for p in data["payments"]:
            assert p["status"] == "succeeded"
            assert p["amount"] == 2900


class TestPortal(StripeMockMixin):
    """Customer Portal 测试"""

    @patch("services.payment.stripe.billing_portal.Session.create")
    def test_portal_url(self, mock_portal_create, client):
        """获取管理门户 URL"""
        email = f"portal_test_{_ts}@example.com"
        resp = client.post("/api/auth/register", json={
            "email": email,
            "password": "testpass123",
        })
        token = resp.json()["access_token"]

        db = _get_test_db()
        try:
            user = db.query(User).first()
            user.stripe_customer_id = "cus_portal_1"
            db.commit()
        finally:
            db.close()

        mock_portal = MagicMock()
        mock_portal.url = "https://billing.stripe.com/p/session_123"
        mock_portal_create.return_value = mock_portal

        resp = client.post("/api/billing/portal", headers={
            "Authorization": f"Bearer {token}"
        })
        assert resp.status_code == 200
        assert "billing.stripe.com" in resp.json()["url"]

    def test_portal_without_customer(self, client):
        """无 customer_id 时 → 400"""
        email = f"portal_no_cus_{_ts}@example.com"
        resp = client.post("/api/auth/register", json={
            "email": email,
            "password": "testpass123",
        })
        token = resp.json()["access_token"]

        resp = client.post("/api/billing/portal", headers={
            "Authorization": f"Bearer {token}"
        })
        assert resp.status_code == 400


class TestWebhook(StripeMockMixin):
    """Stripe Webhook 测试"""

    def test_webhook_no_signature(self, client):
        """缺少 stripe-signature → 400"""
        _enable_stripe()
        resp = client.post(
            "/api/billing/webhook",
            content="{}",
            headers={"Content-Type": "application/json"},
        )
        assert resp.status_code == 400

    def test_webhook_unconfigured(self, client):
        """未配置 WEBHOOK_SECRET → 501"""
        original = settings.STRIPE_WEBHOOK_SECRET
        settings.STRIPE_WEBHOOK_SECRET = ""
        settings.STRIPE_SECRET_KEY = "sk_has_value_but_webhook_empty"
        try:
            resp = client.post(
                "/api/billing/webhook",
                content="{}",
                headers={
                    "Content-Type": "application/json",
                    "stripe-signature": "t=123,v1=abc",
                },
            )
            assert resp.status_code == 501
        finally:
            settings.STRIPE_WEBHOOK_SECRET = original

    @patch("services.payment.stripe.Webhook.construct_event")
    @patch("routers.billing.handle_checkout_completed")
    def test_webhook_checkout_completed(
        self, mock_handler, mock_construct, client
    ):
        """checkout.session.completed 触发 handle_checkout_completed"""
        _enable_stripe()
        event = {
            "type": "checkout.session.completed",
            "data": {
                "object": {
                    "subscription": "sub_mock_wh",
                    "customer": "cus_mock_wh",
                    "metadata": {"user_id": "1"},
                }
            },
        }
        mock_construct.return_value = event

        resp = client.post(
            "/api/billing/webhook",
            content=json.dumps(event),
            headers={
                "Content-Type": "application/json",
                "stripe-signature": "t=123,v1=abc",
            },
        )
        assert resp.status_code == 200
        mock_handler.assert_called_once_with(
            subscription_id="sub_mock_wh",
            customer_id="cus_mock_wh",
            metadata={"user_id": "1"},
        )

    @patch("services.payment.stripe.Webhook.construct_event")
    @patch("services.payment.handle_invoice_paid")
    def test_webhook_invoice_paid(self, mock_handler, mock_construct, client):
        """invoice.paid 触发 handle_invoice_paid"""
        _enable_stripe()
        event = {
            "type": "invoice.paid",
            "data": {
                "object": {
                    "id": "in_mock_wh",
                    "subscription": "sub_mock_wh",
                    "customer": "cus_mock_wh",
                    "payment_intent": "pi_mock_wh",
                    "amount_paid": 2900,
                    "currency": "cny",
                }
            },
        }
        mock_construct.return_value = event

        resp = client.post(
            "/api/billing/webhook",
            content=json.dumps(event),
            headers={
                "Content-Type": "application/json",
                "stripe-signature": "t=123,v1=abc",
            },
        )
        assert resp.status_code == 200
        mock_handler.assert_called_once_with(ANY)

    @patch("services.payment.stripe.Webhook.construct_event")
    def test_webhook_unknown_event(self, mock_construct, client):
        """未处理的事件类型 → 200（静默忽略）"""
        _enable_stripe()
        event = {
            "type": "charge.succeeded",
            "data": {"object": {"id": "ch_mock"}},
        }
        mock_construct.return_value = event

        resp = client.post(
            "/api/billing/webhook",
            content=json.dumps(event),
            headers={
                "Content-Type": "application/json",
                "stripe-signature": "t=123,v1=abc",
            },
        )
        assert resp.status_code == 200

    @patch("services.payment.stripe.Webhook.construct_event")
    @patch("services.payment.handle_invoice_paid")
    def test_webhook_handler_exception_returns_200(
        self, mock_handler, mock_construct, client
    ):
        """业务 handler 抛出异常仍返回 200（避免 Stripe 重试）"""
        _enable_stripe()
        event = {
            "type": "invoice.paid",
            "data": {
                "object": {
                    "id": "in_mock_err",
                    "subscription": "sub_mock_err",
                    "customer": "cus_mock_err",
                    "payment_intent": "pi_mock_err",
                    "amount_paid": 2900,
                    "currency": "cny",
                }
            },
        }
        mock_construct.return_value = event
        mock_handler.side_effect = ValueError("DB error")

        resp = client.post(
            "/api/billing/webhook",
            content=json.dumps(event),
            headers={
                "Content-Type": "application/json",
                "stripe-signature": "t=123,v1=abc",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["received"] is True


class TestBillingBackwardCompatibility:
    """向后兼容性测试 — 不破坏现有功能"""

    def test_usage_endpoint_works(self, client):
        """GET /api/billing/usage 正常工作"""
        email = f"billing_compat_{_ts}@example.com"
        resp = client.post("/api/auth/register", json={
            "email": email,
            "password": "testpass123",
        })
        token = resp.json()["access_token"]

        resp = client.get("/api/billing/usage", headers={
            "Authorization": f"Bearer {token}"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert "fragments" in data
        assert "fusions" in data
        assert data["tier"] == "free"
        assert data["is_pro"] is False

    def test_trial_endpoint_works(self, client):
        """POST /api/billing/trial 正常工作"""
        email = f"trial_compat_{_ts}@example.com"
        resp = client.post("/api/auth/register", json={
            "email": email,
            "password": "testpass123",
        })
        token = resp.json()["access_token"]

        resp = client.post("/api/billing/trial", headers={
            "Authorization": f"Bearer {token}"
        })
        assert resp.status_code == 200
        data = resp.json()
        assert data["is_trial"] is True
        assert data["trial_days_left"] == 7
