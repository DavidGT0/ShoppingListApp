"""קלט בהרשמה ובהתחברות: רווחים מיותרים והודעות שגיאה בעברית"""
import models


def _register(client, username, email, password="secret-pw"):
    return client.post("/register", json={"username": username, "email": email, "password": password})


def _login(client, username, password="secret-pw"):
    return client.post("/token", data={"username": username, "password": password})


def test_register_strips_spaces_from_username_and_email(client):
    r = _register(client, "  bob ", " bob@example.com  ")
    assert r.status_code == 201, r.text
    assert r.json()["username"] == "bob"
    assert r.json()["email"] == "bob@example.com"
    assert _login(client, "bob").status_code == 200


def test_username_with_extra_spaces_counts_as_taken(client):
    _register(client, "bob", "bob@example.com")
    r = _register(client, "bob ", "other@example.com")
    assert r.status_code == 400


def test_login_ignores_spaces_around_username(client):
    _register(client, "bob", "bob@example.com")
    assert _login(client, " bob  ").status_code == 200


def test_existing_user_registered_with_trailing_space_can_still_log_in(client, db):
    # משתמש ישן שנרשם לפני התיקון עם רווח בסוף השם
    client.post("/register", json={"username": "tmp", "email": "d@example.com", "password": "secret-pw"})
    user = db.query(models.User).filter_by(username="tmp").one()
    user.username = "david "
    db.commit()

    assert _login(client, "david").status_code == 200


def test_wrong_login_message_is_hebrew(client):
    _register(client, "bob", "bob@example.com")
    r = _login(client, "bob", "wrong-password")
    assert r.status_code == 401
    assert r.json()["detail"] == "שם משתמש או סיסמה שגויים"


def test_duplicate_username_and_email_messages_are_hebrew(client):
    _register(client, "bob", "bob@example.com")
    assert _register(client, "bob", "x@example.com").json()["detail"] == "שם המשתמש כבר תפוס"
    assert _register(client, "alice", "bob@example.com").json()["detail"] == "כתובת האימייל כבר רשומה"
