"""שליחת מייל דרך Resend (בלי רשת אמיתית)"""
import json

import email_sender


class _FakeResponse:
    status = 200

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self):
        return b'{"id": "test"}'


def test_without_api_key_nothing_is_sent(monkeypatch):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    calls = []
    monkeypatch.setattr(email_sender.urllib.request, "urlopen", lambda *a, **k: calls.append(a))
    assert email_sender.send_email("a@example.com", "subject", "<p>hi</p>") is False
    assert calls == []


def test_with_api_key_posts_message_to_resend(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    monkeypatch.setenv("EMAIL_FROM", "ShopLi <noreply@example.com>")
    captured = {}

    def fake_urlopen(request, timeout=None):
        captured["url"] = request.full_url
        captured["auth"] = request.get_header("Authorization")
        captured["body"] = json.loads(request.data)
        return _FakeResponse()

    monkeypatch.setattr(email_sender.urllib.request, "urlopen", fake_urlopen)

    assert email_sender.send_email("a@example.com", "subject", "<p>hi</p>") is True
    assert captured["url"] == "https://api.resend.com/emails"
    assert captured["auth"] == "Bearer re_test_key"
    assert captured["body"] == {"from": "ShopLi <noreply@example.com>", "to": ["a@example.com"],
                                "subject": "subject", "html": "<p>hi</p>"}


def test_network_error_returns_false_instead_of_crashing(monkeypatch):
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")

    def boom(*a, **k):
        raise OSError("network down")

    monkeypatch.setattr(email_sender.urllib.request, "urlopen", boom)
    assert email_sender.send_email("a@example.com", "s", "h") is False


def test_request_identifies_itself_with_a_user_agent(monkeypatch):
    """בלי User-Agent, ה-API של Resend (מאחורי Cloudflare) מחזיר 403 לבקשות של Python-urllib"""
    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")
    captured = {}

    def fake_urlopen(request, timeout=None):
        captured["ua"] = request.get_header("User-agent")
        return _FakeResponse()

    monkeypatch.setattr(email_sender.urllib.request, "urlopen", fake_urlopen)
    assert email_sender.send_email("a@example.com", "s", "h") is True
    assert captured["ua"] and "Python-urllib" not in captured["ua"]


def test_http_error_logs_status_and_reason_without_the_address(monkeypatch, caplog):
    import io
    import logging
    import urllib.error

    monkeypatch.setenv("RESEND_API_KEY", "re_test_key")

    def forbidden(request, timeout=None):
        raise urllib.error.HTTPError(
            request.full_url, 403, "Forbidden", {}, io.BytesIO(b'{"message": "domain is not verified"}')
        )

    monkeypatch.setattr(email_sender.urllib.request, "urlopen", forbidden)
    with caplog.at_level(logging.WARNING):
        assert email_sender.send_email("secret.person@example.com", "s", "h") is False
    messages = " ".join(r.getMessage() for r in caplog.records)
    assert "403" in messages and "domain is not verified" in messages
    assert "secret.person@example.com" not in caplog.text
