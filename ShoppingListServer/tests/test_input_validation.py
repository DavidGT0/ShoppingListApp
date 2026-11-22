"""בדיקת קלט בשרת: שמות, כמויות, סידור מחדש, אורך סיסמה בהרשמה, ומיקום מוצר חדש"""
import pytest


@pytest.fixture
def alice(register):
    return register("alice")


@pytest.fixture
def list_id(client, alice):
    return client.get("/lists", headers=alice).json()[0]["id"]


def _add(client, headers, list_id, name, amount=1):
    return client.post("/items", json={"name": name, "amount": amount, "list_id": list_id}, headers=headers)


# --- שמות רשימות ---

@pytest.mark.parametrize("bad_name", ["", "   ", "x" * 101])
def test_list_name_must_be_1_to_100_characters(client, alice, bad_name):
    assert client.post("/lists", json={"name": bad_name}, headers=alice).status_code == 422


def test_list_name_is_trimmed(client, alice):
    assert client.post("/lists", json={"name": "  קניות לשבת  "}, headers=alice).json()["name"] == "קניות לשבת"


def test_renaming_a_list_to_blank_is_rejected(client, alice, list_id):
    assert client.put(f"/lists/{list_id}", json={"name": "  "}, headers=alice).status_code == 422


# --- מוצרים ---

@pytest.mark.parametrize("bad_name", ["", "   ", "x" * 101])
def test_item_name_must_be_1_to_100_characters(client, alice, list_id, bad_name):
    assert _add(client, alice, list_id, bad_name).status_code == 422


@pytest.mark.parametrize("bad_amount", [0, -3, 1000])
def test_item_amount_must_be_1_to_999(client, alice, list_id, bad_amount):
    assert _add(client, alice, list_id, "חלב", bad_amount).status_code == 422


def test_item_name_is_trimmed(client, alice, list_id):
    assert _add(client, alice, list_id, "  חלב ").json()["name"] == "חלב"


def test_updating_an_item_with_bad_values_is_rejected(client, alice, list_id):
    item_id = _add(client, alice, list_id, "חלב").json()["id"]
    assert client.put(f"/items/{item_id}", json={"amount": 0}, headers=alice).status_code == 422
    assert client.put(f"/items/{item_id}", json={"name": "  "}, headers=alice).status_code == 422
    assert client.put(f"/items/{item_id}", json={"name": " לחם ", "amount": 2}, headers=alice).json()["name"] == "לחם"


# --- סידור מחדש ---

def test_reorder_with_missing_fields_returns_422_instead_of_crashing(client, alice, list_id):
    _add(client, alice, list_id, "חלב")
    r = client.post("/items/reorder", json=[{"position": 0}], headers=alice)
    assert r.status_code == 422


def test_reorder_with_valid_data_still_works(client, alice, list_id):
    a = _add(client, alice, list_id, "א").json()["id"]
    b = _add(client, alice, list_id, "ב").json()["id"]
    r = client.post("/items/reorder", json=[{"id": a, "position": 0}, {"id": b, "position": 1}], headers=alice)
    assert r.status_code == 200
    assert [i["name"] for i in client.get(f"/items?list_id={list_id}", headers=alice).json()] == ["א", "ב"]


# --- מוצר חדש נכנס לראש הרשימה (בלי בקשת סידור נוספת מהאפליקציה) ---

def test_new_item_appears_first(client, alice, list_id):
    for name in ["ראשון", "שני", "שלישי"]:
        _add(client, alice, list_id, name)
    names = [i["name"] for i in client.get(f"/items?list_id={list_id}", headers=alice).json()]
    assert names == ["שלישי", "שני", "ראשון"]


# --- אורך סיסמה בהרשמה ---

def test_register_requires_at_least_4_character_password(client):
    r = client.post("/register", json={"username": "bob", "email": "bob@example.com", "password": "abc"})
    assert r.status_code == 400
    assert r.json()["detail"] == "הסיסמה חייבת להכיל לפחות 4 תווים"
    ok = client.post("/register", json={"username": "bob", "email": "bob@example.com", "password": "abcd"})
    assert ok.status_code == 201
