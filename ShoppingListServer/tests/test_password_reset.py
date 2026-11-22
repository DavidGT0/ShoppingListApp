"""איפוס סיסמה דרך המייל"""
import re
from datetime import datetime, timedelta

import models

GENERIC_PATH = "/password-reset/request"


def _request_reset(client, email):
    return client.post(GENERIC_PATH, json={"email": email})


def _token_from(email):
    match = re.search(r"/reset-password\?token=([A-Za-z0-9_\-]+)", email["html"])
    assert match, "no reset link in email"
    return match.group(1)


def _reset(client, token, password, confirm=None):
    return client.post("/reset-password", data={"token": token, "password": password,
                                                 "confirm": confirm if confirm is not None else password})


def _can_login(client, username, password):
    return client.post("/token", data={"username": username, "password": password}).status_code == 200


# --- בקשת איפוס ---

def test_request_for_registered_email_sends_one_link_to_that_address(client, register, sent_emails):
    register("alice", "old-pw", email="alice@example.com")
    r = _request_reset(client, "alice@example.com")
    assert r.status_code == 200
    assert len(sent_emails) == 1
    assert sent_emails[0]["to"] == "alice@example.com"
    _token_from(sent_emails[0])


def test_request_for_unknown_email_gives_same_answer_and_sends_nothing(client, register, sent_emails):
    register("alice", email="alice@example.com")
    known = _request_reset(client, "alice@example.com")
    unknown = _request_reset(client, "nobody@example.com")
    assert unknown.status_code == known.status_code == 200
    assert unknown.json() == known.json()  # אי אפשר לגלות אילו מיילים רשומים
    assert len(sent_emails) == 1


def test_email_lookup_ignores_case_and_spaces(client, register, sent_emails):
    register("alice", email="alice@example.com")
    _request_reset(client, "  Alice@Example.COM ")
    assert len(sent_emails) == 1


def test_second_request_within_a_minute_does_not_send_again(client, register, sent_emails):
    register("alice", email="alice@example.com")
    _request_reset(client, "alice@example.com")
    _request_reset(client, "alice@example.com")
    assert len(sent_emails) == 1


def test_new_request_invalidates_the_previous_link(client, register, sent_emails, db):
    register("alice", "old-pw", email="alice@example.com")
    _request_reset(client, "alice@example.com")
    first = _token_from(sent_emails[0])
    # מדמים שעברה דקה, כדי שבקשה שנייה תישלח
    for t in db.query(models.PasswordResetToken).all():
        t.created_at -= timedelta(minutes=2)
    db.commit()
    _request_reset(client, "alice@example.com")
    assert len(sent_emails) == 2
    assert _reset(client, first, "new-pw").status_code == 400
    assert _reset(client, _token_from(sent_emails[1]), "new-pw").status_code == 200


def test_reset_token_is_not_stored_in_plain_text(client, register, sent_emails, db):
    register("alice", email="alice@example.com")
    _request_reset(client, "alice@example.com")
    token = _token_from(sent_emails[0])
    stored = [t.token_hash for t in db.query(models.PasswordResetToken).all()]
    assert stored and token not in stored


# --- דף הגדרת סיסמה חדשה ---

def test_reset_page_with_valid_token_shows_password_form(client, register, sent_emails):
    register("alice", email="alice@example.com")
    _request_reset(client, "alice@example.com")
    r = client.get(f"/reset-password?token={_token_from(sent_emails[0])}")
    assert r.status_code == 200
    assert 'name="password"' in r.text and 'name="confirm"' in r.text


def test_reset_page_with_bad_token_shows_error(client):
    r = client.get("/reset-password?token=not-a-real-token")
    assert r.status_code == 400
    assert 'name="password"' not in r.text
    assert 'href="/forgot-password"' in r.text  # אפשר לבקש קישור חדש


def test_valid_reset_changes_password(client, register, sent_emails):
    register("alice", "old-pw", email="alice@example.com")
    _request_reset(client, "alice@example.com")
    r = _reset(client, _token_from(sent_emails[0]), "brand-new-pw")
    assert r.status_code == 200
    assert _can_login(client, "alice", "brand-new-pw")
    assert not _can_login(client, "alice", "old-pw")


def test_link_works_only_once(client, register, sent_emails):
    register("alice", "old-pw", email="alice@example.com")
    _request_reset(client, "alice@example.com")
    token = _token_from(sent_emails[0])
    assert _reset(client, token, "first-new").status_code == 200
    assert _reset(client, token, "second-new").status_code == 400
    assert _can_login(client, "alice", "first-new")


def test_expired_link_is_rejected(client, register, sent_emails, db):
    register("alice", "old-pw", email="alice@example.com")
    _request_reset(client, "alice@example.com")
    for t in db.query(models.PasswordResetToken).all():
        t.expires_at = datetime.utcnow() - timedelta(minutes=1)
    db.commit()
    assert _reset(client, _token_from(sent_emails[0]), "new-pw").status_code == 400
    assert _can_login(client, "alice", "old-pw")


def test_mismatched_or_too_short_password_is_rejected_and_link_stays_usable(client, register, sent_emails):
    register("alice", "old-pw", email="alice@example.com")
    _request_reset(client, "alice@example.com")
    token = _token_from(sent_emails[0])
    assert _reset(client, token, "new-pw-1", confirm="new-pw-2").status_code == 400
    assert _reset(client, token, "abc").status_code == 400  # קצרה מדי (מינימום 4, כמו בשינוי סיסמה)
    assert _can_login(client, "alice", "old-pw")
    assert _reset(client, token, "new-pw").status_code == 200


# --- דפי אינטרנט ---

def test_forgot_password_web_form_sends_link(client, register, sent_emails):
    register("alice", email="alice@example.com")
    page = client.get("/forgot-password")
    assert page.status_code == 200 and 'name="email"' in page.text
    r = client.post("/forgot-password", data={"email": "alice@example.com"})
    assert r.status_code == 200
    assert len(sent_emails) == 1


def test_delete_account_page_links_to_forgot_password(client):
    assert 'href="/forgot-password"' in client.get("/delete-account").text


# --- מחיקת חשבון מוחקת גם בקשות איפוס ---

def test_deleting_account_removes_its_reset_tokens(client, register, sent_emails, db):
    alice = register("alice", "pw-a", email="alice@example.com")
    _request_reset(client, "alice@example.com")
    client.request("DELETE", "/users/me", json={"password": "pw-a"}, headers=alice)
    assert db.query(models.PasswordResetToken).count() == 0
