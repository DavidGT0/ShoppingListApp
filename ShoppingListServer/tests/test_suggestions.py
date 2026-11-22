"""היסטוריית מוצרים והצעות השלמה"""
from datetime import datetime

import models


def _make_list(client, headers, name="Home"):
    return client.post("/lists", json={"name": name}, headers=headers).json()["id"]


def _add(client, headers, list_id, name):
    r = client.post("/items", json={"name": name, "amount": 1, "list_id": list_id}, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


def _suggest(client, headers, **params):
    return client.get("/items/suggestions", params=params, headers=headers)


def _set_history(db, username, name, use_count, last_used=None):
    user = db.query(models.User).filter(models.User.username == username).first()
    db.add(models.ItemHistory(
        user_id=user.id, name=name, name_key=name.strip().lower(),
        use_count=use_count, last_used=last_used or datetime(2026, 1, 1),
    ))
    db.commit()


def test_adding_item_records_history_and_counts_repeats(client, register, db):
    alice = register("alice")
    list_id = _make_list(client, alice)
    _add(client, alice, list_id, "Milk")
    _add(client, alice, list_id, "  milk ")

    rows = db.query(models.ItemHistory).all()
    assert len(rows) == 1
    assert rows[0].use_count == 2
    assert rows[0].name_key == "milk"


def test_prefix_matches_come_before_contains_matches(client, register, db):
    alice = register("alice")
    _set_history(db, "alice", "Chocolate milk", 50)
    _set_history(db, "alice", "Milk", 1)
    _set_history(db, "alice", "Almond milk", 30)

    r = _suggest(client, alice, q="mil")
    assert r.status_code == 200
    assert r.json() == ["Milk", "Chocolate milk", "Almond milk"]


def test_order_within_group_is_count_then_recency(client, register, db):
    alice = register("alice")
    _set_history(db, "alice", "Apple", 3, datetime(2026, 1, 1))
    _set_history(db, "alice", "Apricot", 3, datetime(2026, 2, 1))
    _set_history(db, "alice", "Avocado", 9, datetime(2025, 1, 1))

    assert _suggest(client, alice, q="a").json() == ["Avocado", "Apricot", "Apple"]


def test_at_most_eight_suggestions(client, register, db):
    alice = register("alice")
    for i in range(12):
        _set_history(db, "alice", f"Item {i}", i + 1)

    assert len(_suggest(client, alice, q="item").json()) == 8


def test_empty_query_returns_most_used(client, register, db):
    alice = register("alice")
    for i in range(10):
        _set_history(db, "alice", f"Item {i}", i + 1)

    result = _suggest(client, alice, q="").json()
    assert result == [f"Item {i}" for i in range(9, 1, -1)]
    assert _suggest(client, alice).json() == result


def test_excludes_open_items_of_the_list_only(client, register, db):
    alice = register("alice")
    list_id = _make_list(client, alice)
    _set_history(db, "alice", "Milk", 5)
    _set_history(db, "alice", "Bread", 4)
    _set_history(db, "alice", "Eggs", 3)
    _add(client, alice, list_id, " MILK ")
    bought = _add(client, alice, list_id, "Bread")
    client.put(f"/items/{bought['id']}", json={"purchased": True}, headers=alice)

    result = _suggest(client, alice, q="", list_id=list_id).json()
    assert "Milk" not in result
    assert "Bread" in result  # פריט שנקנה כבר לא "פתוח" ברשימה
    assert "Eggs" in result


def test_other_users_history_is_never_returned(client, register, db):
    alice = register("alice")
    bob = register("bob")
    _set_history(db, "bob", "Secret snack", 10)

    assert _suggest(client, alice, q="").json() == []
    assert _suggest(client, alice, q="secret").json() == []
    assert _suggest(client, bob, q="secret").json() == ["Secret snack"]


def test_member_adding_records_history_for_the_member(client, register):
    alice = register("alice")
    bob = register("bob")
    list_id = _make_list(client, alice)
    code = client.post(f"/lists/{list_id}/invite", headers=alice).json()["code"]
    assert client.post("/lists/join", json={"code": code}, headers=bob).status_code == 200
    _add(client, bob, list_id, "Tea")

    assert _suggest(client, bob, q="t").json() == ["Tea"]
    assert _suggest(client, alice, q="t").json() == []


def test_stranger_list_id_is_forbidden_and_missing_is_404(client, register):
    alice = register("alice")
    mallory = register("mallory")
    list_id = _make_list(client, alice)

    assert _suggest(client, mallory, q="a", list_id=list_id).status_code == 403
    assert _suggest(client, alice, q="a", list_id=9999).status_code == 404


def test_suggestions_require_login(client):
    assert _suggest(client, {}, q="a").status_code == 401


def test_deleting_account_removes_history(client, register, db):
    alice = register("alice")
    list_id = _make_list(client, alice)
    _add(client, alice, list_id, "Milk")
    assert db.query(models.ItemHistory).count() == 1

    r = client.request("DELETE", "/users/me", json={"password": "secret-pw"}, headers=alice)
    assert r.status_code == 200, r.text
    db.expire_all()
    assert db.query(models.ItemHistory).count() == 0
