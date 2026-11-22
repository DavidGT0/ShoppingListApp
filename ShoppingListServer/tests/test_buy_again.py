"""קנייה חוזרת: הוספת שם של מוצר שנקנה מחזירה אותו לרשימה דרך השרת"""
import models


def _make_list(client, headers, name="Home"):
    return client.post("/lists", json={"name": name}, headers=headers).json()["id"]


def _add(client, headers, list_id, name):
    r = client.post("/items", json={"name": name, "amount": 1, "list_id": list_id}, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


def _buy(client, headers, item_id):
    r = client.put(f"/items/{item_id}", json={"purchased": True}, headers=headers)
    assert r.status_code == 200, r.text


def test_adding_bought_name_revives_same_item_at_top(client, register, db):
    alice = register("alice")
    list_id = _make_list(client, alice)
    milk = _add(client, alice, list_id, "Milk")
    bread = _add(client, alice, list_id, "Bread")
    _buy(client, alice, milk["id"])
    client.put(f"/items/{milk['id']}", json={"amount": 3}, headers=alice)

    again = _add(client, alice, list_id, "  milk ")

    assert again["id"] == milk["id"]
    assert again["purchased"] is False
    assert again["amount"] == 3
    assert again["position"] == min(milk["position"], bread["position"]) - 1
    assert db.query(models.ShoppingItem).filter_by(list_id=list_id).count() == 2


def test_buy_again_increments_history(client, register, db):
    alice = register("alice")
    list_id = _make_list(client, alice)
    milk = _add(client, alice, list_id, "Milk")
    _buy(client, alice, milk["id"])
    _add(client, alice, list_id, "milk")

    rows = db.query(models.ItemHistory).all()
    assert len(rows) == 1
    assert rows[0].use_count == 2


def test_bought_item_of_another_list_is_not_revived(client, register):
    alice = register("alice")
    list_a = _make_list(client, alice, "A")
    list_b = _make_list(client, alice, "B")
    milk = _add(client, alice, list_a, "Milk")
    _buy(client, alice, milk["id"])

    other = _add(client, alice, list_b, "Milk")

    assert other["id"] != milk["id"]
    assert other["list_id"] == list_b


def test_open_item_with_same_name_still_adds_new_row(client, register):
    alice = register("alice")
    list_id = _make_list(client, alice)
    first = _add(client, alice, list_id, "Milk")
    second = _add(client, alice, list_id, "milk")
    assert second["id"] != first["id"]


def test_history_conflict_does_not_fail_the_add(client, register, db, monkeypatch):
    alice = register("alice")
    list_id = _make_list(client, alice)
    user = db.query(models.User).filter_by(username="alice").first()
    # שורת היסטוריה שכבר קיימת, בזמן שהקוד חושב שאין (כמו הוספה מקבילה)
    from datetime import datetime
    db.add(models.ItemHistory(user_id=user.id, name="Milk", name_key="milk",
                              use_count=1, last_used=datetime(2026, 1, 1)))
    db.commit()

    import main
    real = main._find_history
    calls = []

    def blind_first(session, user_id, name_key):
        calls.append(1)
        return None if len(calls) == 1 else real(session, user_id, name_key)

    monkeypatch.setattr(main, "_find_history", blind_first)

    r = client.post("/items", json={"name": "Milk", "amount": 1, "list_id": list_id}, headers=alice)

    assert r.status_code == 200, r.text
    assert db.query(models.ShoppingItem).filter_by(list_id=list_id).count() == 1
    db.expire_all()
    assert db.query(models.ItemHistory).one().use_count == 2
