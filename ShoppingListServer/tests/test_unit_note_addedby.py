"""יחידות, הערות ו"נוסף ע״י" על מוצרים"""
import models


def _make_list(client, headers, name="Groceries"):
    return client.post("/lists", json={"name": name}, headers=headers).json()["id"]


def _add(client, headers, list_id, name="Milk", **extra):
    return client.post("/items", json={"name": name, "list_id": list_id, **extra}, headers=headers)


def _walk(value):
    """כל המפתחות בכל עומק של JSON"""
    if isinstance(value, dict):
        for k, v in value.items():
            yield k
            yield from _walk(v)
    elif isinstance(value, list):
        for v in value:
            yield from _walk(v)


def test_new_item_defaults_are_null(client, register):
    alice = register("alice")
    list_id = _make_list(client, alice)
    body = _add(client, alice, list_id).json()
    assert body["unit"] is None
    assert body["note"] is None
    assert body["added_by"] == "alice"


def test_unit_accepts_allowed_values_and_rejects_others(client, register):
    alice = register("alice")
    list_id = _make_list(client, alice)
    for unit in ["יח׳", "ק״ג", "גרם", "ליטר", "חבילה"]:
        r = _add(client, alice, list_id, name=f"i-{unit}", unit=unit)
        assert r.status_code == 200, r.text
        assert r.json()["unit"] == unit
    assert _add(client, alice, list_id, name="bad", unit="מטר").status_code == 422
    item_id = _add(client, alice, list_id, name="ok").json()["id"]
    assert client.put(f"/items/{item_id}", json={"unit": "x"}, headers=alice).status_code == 422


def test_unit_update_sets_keeps_and_clears(client, register):
    alice = register("alice")
    list_id = _make_list(client, alice)
    item_id = _add(client, alice, list_id).json()["id"]
    r = client.put(f"/items/{item_id}", json={"unit": "ליטר"}, headers=alice)
    assert r.json()["unit"] == "ליטר"
    r = client.put(f"/items/{item_id}", json={"amount": 3}, headers=alice)
    assert r.json()["unit"] == "ליטר"
    r = client.put(f"/items/{item_id}", json={"unit": None}, headers=alice)
    assert r.json()["unit"] is None


def test_note_is_trimmed_and_empty_becomes_null(client, register):
    alice = register("alice")
    list_id = _make_list(client, alice)
    assert _add(client, alice, list_id, name="a", note="  בלי סוכר  ").json()["note"] == "בלי סוכר"
    assert _add(client, alice, list_id, name="b", note="   ").json()["note"] is None
    item_id = _add(client, alice, list_id, name="c", note="x").json()["id"]
    r = client.put(f"/items/{item_id}", json={"note": "  "}, headers=alice)
    assert r.json()["note"] is None


def test_note_length_limit(client, register):
    alice = register("alice")
    list_id = _make_list(client, alice)
    assert _add(client, alice, list_id, name="a", note="ש" * 100).status_code == 200
    assert _add(client, alice, list_id, name="b", note="ש" * 101).status_code == 422
    item_id = _add(client, alice, list_id, name="c").json()["id"]
    assert client.put(f"/items/{item_id}", json={"note": "ש" * 101}, headers=alice).status_code == 422
    # רווחים מסביב לא נספרים
    assert client.put(f"/items/{item_id}", json={"note": " " + "ש" * 100 + " "}, headers=alice).status_code == 200


def test_note_update_keeps_when_omitted_and_clears_on_null(client, register):
    alice = register("alice")
    list_id = _make_list(client, alice)
    item_id = _add(client, alice, list_id, note="חם").json()["id"]
    r = client.put(f"/items/{item_id}", json={"purchased": True}, headers=alice)
    assert r.json()["note"] == "חם"
    r = client.put(f"/items/{item_id}", json={"note": None}, headers=alice)
    assert r.json()["note"] is None


def test_added_by_is_username_without_private_fields(client, register):
    alice = register("alice")
    bob = register("bob")
    list_id = _make_list(client, alice)
    client.post("/lists/share", json={"list_id": list_id, "username": "bob"}, headers=alice)
    post_body = _add(client, bob, list_id).json()
    item_id = post_body["id"]
    put_body = client.put(f"/items/{item_id}", json={"amount": 2}, headers=bob).json()
    get_body = client.get("/items", params={"list_id": list_id}, headers=alice).json()
    for body in (post_body, put_body, get_body):
        keys = set(_walk(body))
        assert "email" not in keys
        assert "hashed_password" not in keys
        assert "added_by_id" not in keys
    assert post_body["added_by"] == "bob"
    assert put_body["added_by"] == "bob"
    assert get_body[0]["added_by"] == "bob"
    assert "example.com" not in str(get_body)


def test_revive_updates_added_by_and_applies_only_given_unit_note(client, register):
    alice = register("alice")
    bob = register("bob")
    list_id = _make_list(client, alice)
    client.post("/lists/share", json={"list_id": list_id, "username": "bob"}, headers=alice)
    item_id = _add(client, alice, list_id, name="Milk", unit="ליטר", note="קר").json()["id"]
    client.put(f"/items/{item_id}", json={"purchased": True}, headers=alice)

    r = _add(client, bob, list_id, name="milk")
    assert r.json()["id"] == item_id
    assert r.json()["added_by"] == "bob"
    assert r.json()["unit"] == "ליטר"
    assert r.json()["note"] == "קר"

    client.put(f"/items/{item_id}", json={"purchased": True}, headers=alice)
    r = _add(client, alice, list_id, name="Milk", unit="חבילה", note=None)
    assert r.json()["added_by"] == "alice"
    assert r.json()["unit"] == "חבילה"
    assert r.json()["note"] is None


def test_deleting_adder_keeps_item_with_null_added_by(client, register, db):
    alice = register("alice")
    bob = register("bob")
    list_id = _make_list(client, alice)
    client.post("/lists/share", json={"list_id": list_id, "username": "bob"}, headers=alice)
    _add(client, bob, list_id)

    r = client.request("DELETE", "/users/me", json={"password": "secret-pw"}, headers=bob)
    assert r.status_code == 200, r.text

    items = client.get("/items", params={"list_id": list_id}, headers=alice).json()
    assert len(items) == 1
    assert items[0]["added_by"] is None
    db.expire_all()
    assert db.query(models.ShoppingItem).one().added_by_id is None
