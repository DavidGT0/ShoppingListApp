"""שכפול רשימה: הרשימה החדשה שייכת למשתמש המשכפל"""
import models


def _make_list(client, headers, name="Groceries"):
    return client.post("/lists", json={"name": name}, headers=headers).json()["id"]


def _add_item(client, headers, list_id, name, amount=1):
    response = client.post(
        "/items", json={"name": name, "amount": amount, "list_id": list_id}, headers=headers
    )
    assert response.status_code in (200, 201)
    return response.json()["id"]


def _items(client, headers, list_id):
    return client.get("/items", params={"list_id": list_id}, headers=headers).json()


def test_owner_duplicates_a_list(client, register):
    alice = register("alice")
    list_id = _make_list(client, alice)

    response = client.post(f"/lists/{list_id}/duplicate", headers=alice)

    assert response.status_code in (200, 201)
    body = response.json()
    assert body["id"] != list_id
    assert body["name"] == "Groceries (עותק)"
    assert body["is_owner"] is True


def test_member_duplicate_is_owned_by_the_member(client, register, db):
    alice = register("alice")
    bob = register("bob")
    list_id = _make_list(client, alice)
    _add_item(client, alice, list_id, "Milk")
    client.post("/lists/share", json={"list_id": list_id, "username": "bob"}, headers=alice)

    response = client.post(f"/lists/{list_id}/duplicate", headers=bob)

    assert response.status_code in (200, 201)
    body = response.json()
    assert body["is_owner"] is True
    bob_user = db.query(models.User).filter(models.User.username == "bob").first()
    assert body["owner_id"] == bob_user.id
    original = db.query(models.ShoppingList).filter(models.ShoppingList.id == list_id).first()
    assert original.name == "Groceries"
    assert original.owner_id != bob_user.id
    assert len(original.items) == 1
    assert [u.username for u in original.shared_users] == ["bob"]


def test_stranger_gets_403_and_missing_list_404(client, register):
    alice = register("alice")
    carol = register("carol")
    list_id = _make_list(client, alice)

    assert client.post(f"/lists/{list_id}/duplicate", headers=carol).status_code == 403
    assert client.post("/lists/9999/duplicate", headers=alice).status_code == 404


def test_items_are_copied_unpurchased_in_order(client, register):
    alice = register("alice")
    list_id = _make_list(client, alice)
    milk = _add_item(client, alice, list_id, "Milk", 2)
    _add_item(client, alice, list_id, "Bread", 1)
    _add_item(client, alice, list_id, "Eggs", 12)
    client.put(f"/items/{milk}", json={"purchased": True}, headers=alice)

    new_id = client.post(f"/lists/{list_id}/duplicate", headers=alice).json()["id"]

    original = _items(client, alice, list_id)
    copy = _items(client, alice, new_id)
    assert [(i["name"], i["amount"], i["position"]) for i in copy] == [
        (i["name"], i["amount"], i["position"]) for i in original
    ]
    assert [i["name"] for i in copy] == [i["name"] for i in original]
    assert {i["name"] for i in copy} == {"Milk", "Bread", "Eggs"}
    assert all(i["purchased"] is False for i in copy)
    assert {i["id"] for i in copy}.isdisjoint({i["id"] for i in original})
    assert any(i["purchased"] for i in original)


def test_long_name_is_truncated_to_100(client, register):
    alice = register("alice")
    list_id = _make_list(client, alice, name="א" * 100)

    body = client.post(f"/lists/{list_id}/duplicate", headers=alice).json()

    assert len(body["name"]) == 100
    assert body["name"].endswith(" (עותק)")


def test_shares_and_invite_are_not_copied(client, register, db):
    alice = register("alice")
    register("bob")
    list_id = _make_list(client, alice)
    client.post("/lists/share", json={"list_id": list_id, "username": "bob"}, headers=alice)
    client.post(f"/lists/{list_id}/invite", headers=alice)

    new_id = client.post(f"/lists/{list_id}/duplicate", headers=alice).json()["id"]

    copy = db.query(models.ShoppingList).filter(models.ShoppingList.id == new_id).first()
    assert copy.shared_users == []
    assert copy.invite is None
