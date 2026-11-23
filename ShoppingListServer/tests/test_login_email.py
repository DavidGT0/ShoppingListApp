"""התחברות עם אימייל, איסור @ בשם משתמש, ולוגים בלי כתובות מייל"""
import logging

import email_sender
import models


def _login(client, ident, password="secret-pw"):
    return client.post("/token", data={"username": ident, "password": password})


def test_login_by_email_returns_real_username(client, register):
    register("dana")
    r = _login(client, "dana@example.com")
    assert r.status_code == 200
    assert r.json()["username"] == "dana"
    assert r.json()["token_type"] == "bearer"


def test_login_by_email_mixed_case_and_spaces(client, register):
    register("dana")
    r = _login(client, "  Dana@Example.COM  ")
    assert r.status_code == 200
    assert r.json()["username"] == "dana"


def test_login_by_email_wrong_password(client, register):
    register("dana")
    r = _login(client, "dana@example.com", "wrong-password")
    assert r.status_code == 401
    assert r.json()["detail"] == "שם משתמש או סיסמה שגויים"


def test_login_by_username_returns_username(client, register):
    register("dana")
    assert _login(client, "dana").json()["username"] == "dana"


def test_legacy_username_with_at_still_logs_in(client, db):
    import main
    db.add(models.User(username="old@name", email="legacy@example.com",
                       hashed_password=main.get_password_hash("secret-pw")))
    db.commit()
    r = _login(client, "old@name")
    assert r.status_code == 200
    assert r.json()["username"] == "old@name"


def test_register_refuses_at_in_username(client):
    r = client.post("/register", json={"username": "a@b", "email": "ab@example.com", "password": "secret-pw"})
    assert r.status_code == 400
    assert r.json()["detail"] == "שם המשתמש לא יכול להכיל @"


def test_send_email_without_key_does_not_log_address(monkeypatch, caplog):
    monkeypatch.delenv("RESEND_API_KEY", raising=False)
    with caplog.at_level(logging.DEBUG):
        assert email_sender.send_email("secret.person@example.com", "s", "<p>h</p>") is False
    assert caplog.records
    assert all("secret.person@example.com" not in r.getMessage() for r in caplog.records)
