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
