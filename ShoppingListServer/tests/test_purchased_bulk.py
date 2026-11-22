"""פעולות מרוכזות על מוצרים שנקנו"""


def _make_list(client, headers, name="Home"):
    return client.post("/lists", json={"name": name}, headers=headers).json()["id"]


def _fill(client, headers, list_id):
    """שלושה מוצרים: שניים שנקנו ואחד פתוח"""
    ids = []
    for name in ("A", "B", "C"):
        r = client.post("/items", json={"name": name, "amount": 1, "list_id": list_id}, headers=headers)
        ids.append(r.json()["id"])
    for item_id in ids[:2]:
        client.put(f"/items/{item_id}", json={"purchased": True}, headers=headers)
    return ids


def _items(client, headers, list_id):
    r = client.get("/items", params={"list_id": list_id}, headers=headers)
    return {i["name"]: i["purchased"] for i in r.json()}


def test_restore_unmarks_only_purchased_items(client, register):
    alice = register("alice")
    list_id = _make_list(client, alice)
    _fill(client, alice, list_id)

    r = client.post(f"/lists/{list_id}/purchased/restore", headers=alice)
    assert r.status_code == 200
    assert r.json() == {"restored": 2}
    assert _items(client, alice, list_id) == {"A": False, "B": False, "C": False}


def test_clear_deletes_only_purchased_items(client, register):
    alice = register("alice")
    list_id = _make_list(client, alice)
    _fill(client, alice, list_id)

    r = client.post(f"/lists/{list_id}/purchased/clear", headers=alice)
    assert r.status_code == 200
    assert r.json() == {"deleted": 2}
    assert _items(client, alice, list_id) == {"C": False}


def test_other_lists_are_untouched(client, register):
    alice = register("alice")
    first = _make_list(client, alice, "One")
    second = _make_list(client, alice, "Two")
    _fill(client, alice, first)
    _fill(client, alice, second)

    client.post(f"/lists/{first}/purchased/clear", headers=alice)
    assert _items(client, alice, second) == {"A": True, "B": True, "C": False}


def test_counts_are_zero_when_nothing_purchased(client, register):
    alice = register("alice")
    list_id = _make_list(client, alice)
    assert client.post(f"/lists/{list_id}/purchased/restore", headers=alice).json() == {"restored": 0}
    assert client.post(f"/lists/{list_id}/purchased/clear", headers=alice).json() == {"deleted": 0}


def test_member_can_restore_and_clear(client, register):
    alice = register("alice")
    bob = register("bob")
    list_id = _make_list(client, alice)
    code = client.post(f"/lists/{list_id}/invite", headers=alice).json()["code"]
    client.post("/lists/join", json={"code": code}, headers=bob)
    _fill(client, alice, list_id)

    assert client.post(f"/lists/{list_id}/purchased/restore", headers=bob).json() == {"restored": 2}
    for item in client.get("/items", params={"list_id": list_id}, headers=bob).json()[:2]:
        client.put(f"/items/{item['id']}", json={"purchased": True}, headers=bob)
    assert client.post(f"/lists/{list_id}/purchased/clear", headers=bob).json() == {"deleted": 2}


def test_stranger_gets_403_and_nothing_changes(client, register):
    alice = register("alice")
    mallory = register("mallory")
    list_id = _make_list(client, alice)
    _fill(client, alice, list_id)

    for action in ("restore", "clear"):
        r = client.post(f"/lists/{list_id}/purchased/{action}", headers=mallory)
        assert r.status_code == 403
        assert r.json()["detail"] == "אין לך גישה לרשימה הזו"
    assert _items(client, alice, list_id) == {"A": True, "B": True, "C": False}


def test_missing_list_gets_404(client, register):
    alice = register("alice")
    for action in ("restore", "clear"):
        r = client.post(f"/lists/9999/purchased/{action}", headers=alice)
        assert r.status_code == 404
        assert r.json()["detail"] == "הרשימה לא נמצאה"
