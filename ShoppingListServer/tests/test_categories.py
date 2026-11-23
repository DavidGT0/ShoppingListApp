"""מחלקות: מחלקות מותאמות לרשימה, בחירה ידנית, למידה"""
import models

PALETTE = ["#8E44AD", "#16A085", "#D35400", "#2C3E50", "#C0392B", "#7F8C8D", "#27AE60", "#2980B9"]


def _make_list(client, headers, name="Home"):
    return client.post("/lists", json={"name": name}, headers=headers).json()["id"]


def _cat(client, headers, list_id, name):
    r = client.post(f"/lists/{list_id}/categories", json={"name": name}, headers=headers)
    assert r.status_code == 201, r.text
    return r.json()


def _add(client, headers, list_id, name, **extra):
    return client.post("/items", json={"name": name, "amount": 1, "list_id": list_id, **extra}, headers=headers)


def test_create_and_list_categories_in_order_with_colors(client, register):
    alice = register("alice")
    lid = _make_list(client, alice)
    a = _cat(client, alice, lid, "  Pets ")
    b = _cat(client, alice, lid, "Garden")
    assert a["name"] == "Pets"
    assert a["color"] == PALETTE[0] and b["color"] == PALETTE[1]
    got = client.get(f"/lists/{lid}/categories", headers=alice).json()
    assert got["custom"] == [a, b]


def test_color_cycles_after_palette_is_used(client, register):
    alice = register("alice")
    lid = _make_list(client, alice)
    colors = [_cat(client, alice, lid, f"c{i}")["color"] for i in range(9)]
    assert colors[:8] == PALETTE
    assert colors[8] == PALETTE[0]


def test_duplicate_name_is_400(client, register):
    alice = register("alice")
    lid = _make_list(client, alice)
    _cat(client, alice, lid, "Pets")
    r = client.post(f"/lists/{lid}/categories", json={"name": "Pets"}, headers=alice)
    assert r.status_code == 400
    assert r.json()["detail"] == "המחלקה כבר קיימת ברשימה"


def test_name_length_validated(client, register):
    alice = register("alice")
    lid = _make_list(client, alice)
    assert client.post(f"/lists/{lid}/categories", json={"name": "   "}, headers=alice).status_code in (400, 422)
    assert client.post(f"/lists/{lid}/categories", json={"name": "x" * 31}, headers=alice).status_code in (400, 422)
    assert client.post(f"/lists/{lid}/categories", json={"name": "x" * 30}, headers=alice).status_code == 201


def test_access_rules(client, register):
    alice = register("alice")
    bob = register("bob")
    carol = register("carol")
    lid = _make_list(client, alice)
    other = _make_list(client, alice, "Other")
    client.post("/lists/share", json={"list_id": lid, "username": "bob"}, headers=alice)
    assert client.post(f"/lists/{lid}/categories", json={"name": "Pets"}, headers=bob).status_code == 201
    assert client.get(f"/lists/{lid}/categories", headers=carol).status_code == 403
    assert client.post(f"/lists/{lid}/categories", json={"name": "x"}, headers=carol).status_code == 403
    assert client.get("/lists/9999/categories", headers=alice).status_code == 404
    foreign = _cat(client, alice, other, "Foreign")
    r = client.delete(f"/lists/{lid}/categories/{foreign['id']}", headers=alice)
    assert r.status_code == 404
    assert r.json()["detail"] == "המחלקה לא נמצאה"
    assert client.delete(f"/lists/{lid}/categories/1", headers=carol).status_code == 403


def test_item_category_validation(client, register):
    alice = register("alice")
    lid = _make_list(client, alice)
    other = _make_list(client, alice, "Other")
    foreign = _cat(client, alice, other, "Foreign")
    ok = _add(client, alice, lid, "Milk", category="dairy")
    assert ok.status_code == 200 and ok.json()["category"] == "dairy"
    bad = _add(client, alice, lid, "X", category="bogus")
    assert bad.status_code == 400 and bad.json()["detail"] == "מחלקה לא תקינה"
    assert _add(client, alice, lid, "Y", category=f"custom:{foreign['id']}").status_code == 400
    assert _add(client, alice, lid, "Z", category="custom:abc").status_code == 400
    item_id = ok.json()["id"]
    assert client.put(f"/items/{item_id}", json={"category": "nope"}, headers=alice).status_code == 400
    assert client.put(f"/items/{item_id}", json={"category": f"custom:{foreign['id']}"}, headers=alice).status_code == 400
    items = client.get("/items", params={"list_id": lid}, headers=alice).json()
    assert items[0]["category"] == "dairy"


def test_update_category_absent_keeps_and_null_resets(client, register):
    alice = register("alice")
    lid = _make_list(client, alice)
    item = _add(client, alice, lid, "Milk", category="dairy").json()
    r = client.put(f"/items/{item['id']}", json={"amount": 3}, headers=alice)
    assert r.json()["category"] == "dairy"
    r = client.put(f"/items/{item['id']}", json={"category": None}, headers=alice)
    assert r.status_code == 200 and r.json()["category"] is None


def test_builtin_category_is_learned_across_lists(client, register):
    alice = register("alice")
    l1 = _make_list(client, alice, "A")
    l2 = _make_list(client, alice, "B")
    item = _add(client, alice, l1, "Milk").json()
    assert item["category"] is None
    client.put(f"/items/{item['id']}", json={"category": "dairy"}, headers=alice)
    assert _add(client, alice, l2, "milk").json()["category"] == "dairy"
    # קטגוריה מפורשת גוברת על למידה
    assert _add(client, alice, l2, "MILK", category="drinks").json()["category"] == "drinks"


def test_learning_is_per_user(client, register):
    alice = register("alice")
    bob = register("bob")
    l1 = _make_list(client, alice, "A")
    l2 = _make_list(client, bob, "B")
    item = _add(client, alice, l1, "Milk").json()
    client.put(f"/items/{item['id']}", json={"category": "dairy"}, headers=alice)
    assert _add(client, bob, l2, "Milk").json()["category"] is None


def test_custom_category_learned_only_within_same_list(client, register):
    alice = register("alice")
    l1 = _make_list(client, alice, "A")
    l2 = _make_list(client, alice, "B")
    cat = _cat(client, alice, l1, "Pets")
    item = _add(client, alice, l1, "Dog food").json()
    client.put(f"/items/{item['id']}", json={"category": f"custom:{cat['id']}"}, headers=alice)
    other = _add(client, alice, l2, "Dog food").json()
    assert other["category"] is None
    client.delete(f"/items/{item['id']}", headers=alice)
    again = _add(client, alice, l1, "dog food").json()
    assert again["category"] == f"custom:{cat['id']}"


def test_clearing_category_clears_learning(client, register):
    alice = register("alice")
    l1 = _make_list(client, alice)
    item = _add(client, alice, l1, "Milk").json()
    client.put(f"/items/{item['id']}", json={"category": "dairy"}, headers=alice)
    client.put(f"/items/{item['id']}", json={"category": None}, headers=alice)
    client.delete(f"/items/{item['id']}", headers=alice)
    assert _add(client, alice, l1, "Milk").json()["category"] is None


def test_revive_keeps_existing_category(client, register):
    alice = register("alice")
    lid = _make_list(client, alice)
    item = _add(client, alice, lid, "Milk", category="dairy").json()
    client.put(f"/items/{item['id']}", json={"purchased": True}, headers=alice)
    client.put(f"/items/{item['id']}", json={"category": "drinks"}, headers=alice)
    again = _add(client, alice, lid, "Milk").json()
    assert again["id"] == item["id"] and again["category"] == "drinks"


def test_delete_category_nulls_items_and_history(client, register, db):
    alice = register("alice")
    lid = _make_list(client, alice)
    cat = _cat(client, alice, lid, "Pets")
    keep = _cat(client, alice, lid, "Keep")
    value = f"custom:{cat['id']}"
    item = _add(client, alice, lid, "Dog food", category=value).json()
    kept = _add(client, alice, lid, "Toy", category=f"custom:{keep['id']}").json()
    client.put(f"/items/{item['id']}", json={"category": value}, headers=alice)
    assert db.query(models.ItemHistory).filter_by(category=value).count() == 1
    r = client.delete(f"/lists/{lid}/categories/{cat['id']}", headers=alice)
    assert r.status_code == 200
    db.expire_all()
    assert db.query(models.ItemHistory).filter_by(category=value).count() == 0
    items = {i["id"]: i for i in client.get("/items", params={"list_id": lid}, headers=alice).json()}
    assert items[item["id"]]["category"] is None
    assert items[kept["id"]]["category"] == f"custom:{keep['id']}"
    assert [c["id"] for c in client.get(f"/lists/{lid}/categories", headers=alice).json()["custom"]] == [keep["id"]]


def test_non_canonical_custom_ids_rejected(client, register):
    alice = register("alice")
    lid = _make_list(client, alice)
    cat = _cat(client, alice, lid, "Pets")
    for bad in (f"custom:0{cat['id']}", "custom:" + "1" * 25, "custom:-1", "custom:+1", "custom: 1"):
        r = _add(client, alice, lid, "Bad", category=bad)
        assert r.status_code == 400, bad
        assert r.json()["detail"] == "מחלקה לא תקינה"
    item = _add(client, alice, lid, "Ok", category=f"custom:{cat['id']}").json()
    r = client.put(f"/items/{item['id']}", json={"category": f"custom:0{cat['id']}"}, headers=alice)
    assert r.status_code == 400


def test_delete_category_matches_exactly(client, register):
    alice = register("alice")
    lid = _make_list(client, alice)
    cats = [_cat(client, alice, lid, f"c{i}") for i in range(12)]
    first, twelfth = cats[0], cats[11]
    assert (first["id"], twelfth["id"]) == (first["id"], first["id"] + 11)
    one = _add(client, alice, lid, "One", category=f"custom:{first['id']}").json()
    other = _add(client, alice, lid, "Other", category=f"custom:{twelfth['id']}").json()
    client.delete(f"/lists/{lid}/categories/{first['id']}", headers=alice)
    items = {i["id"]: i["category"] for i in client.get("/items", params={"list_id": lid}, headers=alice).json()}
    assert items[one["id"]] is None
    assert items[other["id"]] == f"custom:{twelfth['id']}"
