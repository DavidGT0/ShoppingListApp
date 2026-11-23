"""פריסת מחלקות לכל רשימה: שמות, אייקונים וסדר, משותפים לכל המשתתפים"""
import models

DEFAULT_KEYS = [
    "produce", "dairy", "bakery", "meat", "pantry", "frozen",
    "drinks", "snacks", "cleaning", "care", "other",
]


def _make_list(client, headers, name="Home"):
    return client.post("/lists", json={"name": name}, headers=headers).json()["id"]


def _get(client, headers, lid):
    r = client.get(f"/lists/{lid}/categories", headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


def _put(client, headers, lid, layout):
    return client.put(f"/lists/{lid}/categories/layout", json={"layout": layout}, headers=headers)


def _keys(payload):
    return [e["key"] for e in payload["layout"]]


def test_get_defaults_for_new_list(client, register):
    alice = register("alice")
    lid = _make_list(client, alice)
    got = _get(client, alice, lid)
    assert got["custom"] == []
    assert got["layout"] == [
        {"key": k, "name": None, "icon": None, "position": i} for i, k in enumerate(DEFAULT_KEYS)
    ]


def test_put_get_round_trip(client, register):
    alice = register("alice")
    lid = _make_list(client, alice)
    r = _put(client, alice, lid, [
        {"key": "dairy", "name": "  Milk shelf ", "icon": "🥛"},
        {"key": "produce"},
        {"key": "other", "name": "Misc"},
    ])
    assert r.status_code == 200, r.text
    expected = [
        {"key": "dairy", "name": "Milk shelf", "icon": "🥛", "position": 0},
        {"key": "produce", "name": None, "icon": None, "position": 1},
        {"key": "bakery", "name": None, "icon": None, "position": 2},
    ]
    layout = _get(client, alice, lid)["layout"]
    assert layout[:3] == expected
    assert layout[-1] == {"key": "other", "name": "Misc", "icon": None, "position": 10}
    assert r.json() == _get(client, alice, lid)
    assert _keys(_get(client, alice, lid)) == ["dairy", "produce"] + [
        k for k in DEFAULT_KEYS if k not in ("dairy", "produce", "other")] + ["other"]


def test_put_replaces_previous_settings(client, register):
    alice = register("alice")
    lid = _make_list(client, alice)
    _put(client, alice, lid, [{"key": "dairy", "name": "A", "icon": "x"}])
    _put(client, alice, lid, [{"key": "meat"}])
    layout = _get(client, alice, lid)["layout"]
    assert layout[0] == {"key": "meat", "name": None, "icon": None, "position": 0}
    assert all(e["name"] is None for e in layout)


def test_member_can_save_and_owner_sees_it(client, register):
    alice = register("alice")
    bob = register("bob")
    lid = _make_list(client, alice)
    client.post("/lists/share", json={"list_id": lid, "username": "bob"}, headers=alice)
    assert _put(client, bob, lid, [{"key": "frozen", "name": "Ice"}]).status_code == 200
    assert _get(client, alice, lid)["layout"][0]["key"] == "frozen"
    assert _get(client, alice, lid)["layout"][0]["name"] == "Ice"


def test_stranger_and_missing_list(client, register):
    alice = register("alice")
    carol = register("carol")
    lid = _make_list(client, alice)
    assert _put(client, carol, lid, [{"key": "dairy"}]).status_code == 403
    assert client.get(f"/lists/{lid}/categories", headers=carol).status_code == 403
    assert _put(client, alice, 9999, [{"key": "dairy"}]).status_code == 404
    assert _get(client, alice, lid)["layout"][0]["key"] == "produce"


def test_unknown_key_is_400(client, register):
    alice = register("alice")
    lid = _make_list(client, alice)
    for bad in ("nope", "custom:", "custom:abc", "custom:01", ""):
        r = _put(client, alice, lid, [{"key": bad}])
        assert r.status_code == 400, bad
        assert r.json()["detail"] == "מחלקה לא מוכרת"


def test_bad_name_is_400(client, register):
    alice = register("alice")
    lid = _make_list(client, alice)
    for bad in ("", "   ", "x" * 31):
        r = _put(client, alice, lid, [{"key": "dairy", "name": bad}])
        assert r.status_code == 400, repr(bad)
        assert r.json()["detail"] == "שם המחלקה חייב להכיל 1-30 תווים"
    assert _put(client, alice, lid, [{"key": "dairy", "name": "x" * 30}]).status_code == 200


def test_long_icon_is_400(client, register):
    alice = register("alice")
    lid = _make_list(client, alice)
    assert _put(client, alice, lid, [{"key": "dairy", "icon": "x" * 17}]).status_code == 400
    assert _put(client, alice, lid, [{"key": "dairy", "icon": "x" * 16}]).status_code == 200


def test_other_must_be_last(client, register):
    alice = register("alice")
    lid = _make_list(client, alice)
    r = _put(client, alice, lid, [{"key": "other"}, {"key": "dairy"}])
    assert r.status_code == 400
    assert r.json()["detail"] == '"אחר" חייבת להיות המחלקה האחרונה'
    # בלי "other" בבקשה: היא נשארת אחרונה בתגובה
    assert _put(client, alice, lid, [{"key": "dairy"}]).status_code == 200
    assert _get(client, alice, lid)["layout"][-1]["key"] == "other"


def test_missing_keys_appended_in_default_order_and_custom_included(client, register):
    alice = register("alice")
    lid = _make_list(client, alice)
    cat = client.post(f"/lists/{lid}/categories", json={"name": "Pets"}, headers=alice).json()
    key = f"custom:{cat['id']}"
    assert _keys(_get(client, alice, lid)) == DEFAULT_KEYS[:-1] + [key, "other"]
    assert _put(client, alice, lid, [{"key": key, "icon": "🐶"}, {"key": "meat"}]).status_code == 200
    got = _get(client, alice, lid)
    assert _keys(got)[:2] == [key, "meat"]
    assert got["layout"][0]["icon"] == "🐶"
    assert _keys(got)[-1] == "other"


def test_vanished_custom_keys_are_ignored(client, register, db):
    alice = register("alice")
    lid = _make_list(client, alice)
    other = _make_list(client, alice, "Other")
    foreign = client.post(f"/lists/{other}/categories", json={"name": "Pets"}, headers=alice).json()
    r = _put(client, alice, lid, [{"key": "custom:99999"}, {"key": f"custom:{foreign['id']}"}, {"key": "dairy"}])
    assert r.status_code == 200
    assert _keys(r.json()) == ["dairy"] + [k for k in DEFAULT_KEYS if k != "dairy"]
    assert db.query(models.ListCategorySetting).filter_by(list_id=lid).count() == 1


def test_create_category_icon_default_and_custom(client, register):
    alice = register("alice")
    lid = _make_list(client, alice)
    a = client.post(f"/lists/{lid}/categories", json={"name": "Pets"}, headers=alice).json()
    b = client.post(f"/lists/{lid}/categories", json={"name": "Garden", "icon": " 🌱 "}, headers=alice).json()
    assert a["icon"] == "🛒" and b["icon"] == "🌱"
    got = _get(client, alice, lid)
    assert [c["icon"] for c in got["custom"]] == ["🛒", "🌱"]
    assert client.post(f"/lists/{lid}/categories", json={"name": "Z", "icon": "x" * 17}, headers=alice).status_code == 400


def test_delete_custom_category_removes_layout_row(client, register, db):
    alice = register("alice")
    lid = _make_list(client, alice)
    cat = client.post(f"/lists/{lid}/categories", json={"name": "Pets"}, headers=alice).json()
    key = f"custom:{cat['id']}"
    _put(client, alice, lid, [{"key": key, "name": "Dogs"}, {"key": "dairy"}])
    assert db.query(models.ListCategorySetting).filter_by(key=key).count() == 1
    assert client.delete(f"/lists/{lid}/categories/{cat['id']}", headers=alice).status_code == 200
    db.expire_all()
    assert db.query(models.ListCategorySetting).filter_by(key=key).count() == 0
    got = _get(client, alice, lid)
    assert key not in _keys(got) and got["custom"] == []
    assert _keys(got)[0] == "dairy"


def test_duplicate_copies_layout_and_remaps_custom(client, register):
    alice = register("alice")
    lid = _make_list(client, alice)
    cat = client.post(f"/lists/{lid}/categories", json={"name": "Pets", "icon": "🐶"}, headers=alice).json()
    old_key = f"custom:{cat['id']}"
    _put(client, alice, lid, [
        {"key": "meat", "name": "Butcher", "icon": "🥩"}, {"key": old_key, "name": "Dogs"}, {"key": "dairy"},
    ])
    new_id = client.post(f"/lists/{lid}/duplicate", headers=alice).json()["id"]
    new = _get(client, alice, new_id)
    new_cat = new["custom"][0]
    assert new_cat["id"] != cat["id"] and new_cat["icon"] == "🐶"
    new_key = f"custom:{new_cat['id']}"
    assert _keys(new)[:3] == ["meat", new_key, "dairy"]
    assert new["layout"][0] == {"key": "meat", "name": "Butcher", "icon": "🥩", "position": 0}
    assert new["layout"][1]["name"] == "Dogs"
    # המקור לא השתנה
    assert _keys(_get(client, alice, lid))[:3] == ["meat", old_key, "dairy"]


def test_repeat_save_of_same_keys_and_get_layout_round_trips(client, register):
    alice = register("alice")
    lid = _make_list(client, alice)
    body = [{"key": "dairy", "name": "Milk"}, {"key": "produce", "icon": "🍎"}, {"key": "other"}]
    assert _put(client, alice, lid, body).status_code == 200
    assert _put(client, alice, lid, body).status_code == 200
    # תגובת ה-GET המלאה נשלחת בחזרה כגוף ה-PUT
    layout = _get(client, alice, lid)["layout"]
    r = _put(client, alice, lid, layout)
    assert r.status_code == 200, r.text
    assert _keys(r.json()) == _keys({"layout": layout})
    assert _put(client, alice, lid, _get(client, alice, lid)["layout"]).status_code == 200


def test_concurrent_save_conflict_returns_409(client, register, monkeypatch):
    from sqlalchemy.exc import IntegrityError
    from sqlalchemy.orm import Session
    alice = register("alice")
    lid = _make_list(client, alice)
    real_commit = Session.commit

    def boom(self):
        raise IntegrityError("stmt", {}, Exception("unique"))

    monkeypatch.setattr(Session, "commit", boom)
    r = _put(client, alice, lid, [{"key": "dairy"}])
    monkeypatch.setattr(Session, "commit", real_commit)
    assert r.status_code == 409
    assert r.json()["detail"] == "המחלקות עודכנו במקביל, נסה שוב"
    assert _put(client, alice, lid, [{"key": "dairy"}]).status_code == 200


def test_deleting_list_removes_layout_rows(client, register, db):
    alice = register("alice")
    lid = _make_list(client, alice)
    _put(client, alice, lid, [{"key": "dairy", "name": "Milk"}, {"key": "meat"}])
    assert db.query(models.ListCategorySetting).filter_by(list_id=lid).count() == 2
    assert client.delete(f"/lists/{lid}", headers=alice).status_code == 200
    db.expire_all()
    assert db.query(models.ListCategorySetting).filter_by(list_id=lid).count() == 0
