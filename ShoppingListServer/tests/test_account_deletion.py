"""מחיקת חשבון (מהאפליקציה ומדף האינטרנט) ומדיניות פרטיות"""
import models


def _counts(db):
    return {
        "users": db.query(models.User).count(),
        "lists": db.query(models.ShoppingList).count(),
        "items": db.query(models.ShoppingItem).count(),
        "shares": len(db.execute(models.shared_lists.select()).fetchall()),
    }


def _setup_two_users_sharing(client, register):
    """alice ו-bob, כל אחד משתף רשימה עם השני, עם מוצרים בשתי הרשימות"""
    alice = register("alice", "pw-a")
    bob = register("bob", "pw-b")
    a_list = client.post("/lists", json={"name": "A extra"}, headers=alice).json()["id"]
    client.post("/items", json={"name": "milk", "list_id": a_list}, headers=alice)
    client.post("/items", json={"name": "eggs", "list_id": a_list}, headers=alice)
    b_list = client.get("/lists", headers=bob).json()[0]["id"]
    client.post("/items", json={"name": "bread", "list_id": b_list}, headers=bob)
    client.post("/lists/share", json={"list_id": a_list, "username": "bob"}, headers=alice)
    client.post("/lists/share", json={"list_id": b_list, "username": "alice"}, headers=bob)
    return alice, bob, b_list


def test_delete_with_wrong_password_returns_400_and_keeps_user(client, register, db):
    alice = register("alice", "pw-a")
    r = client.request("DELETE", "/users/me", json={"password": "wrong"}, headers=alice)
    # 400 ולא 401 - אחרת האפליקציה תחשוב שההתחברות פגה ותנתק את המשתמש
    assert r.status_code == 400
    assert _counts(db)["users"] == 1


def test_delete_removes_user_lists_items_and_shares_but_not_other_users_data(client, register, db):
    alice, bob, b_list = _setup_two_users_sharing(client, register)
    assert _counts(db) == {"users": 2, "lists": 3, "items": 3, "shares": 2}

    r = client.request("DELETE", "/users/me", json={"password": "pw-a"}, headers=alice)

    assert r.status_code == 200
    assert _counts(db) == {"users": 1, "lists": 1, "items": 1, "shares": 0}
    assert [lst["id"] for lst in client.get("/lists", headers=bob).json()] == [b_list]
    assert [i["name"] for i in client.get(f"/items?list_id={b_list}", headers=bob).json()] == ["bread"]


def test_deleted_users_token_and_login_stop_working(client, register):
    alice = register("alice", "pw-a")
    client.request("DELETE", "/users/me", json={"password": "pw-a"}, headers=alice)
    assert client.get("/users/me", headers=alice).status_code == 401
    assert client.post("/token", data={"username": "alice", "password": "pw-a"}).status_code == 401


def test_web_delete_page_renders_rtl_form(client):
    r = client.get("/delete-account")
    assert r.status_code == 200
    assert 'action="/delete-account"' in r.text
    assert 'dir="rtl"' in r.text


def test_web_delete_with_wrong_credentials_returns_400_and_keeps_user(client, register, db):
    register("bob", "pw-b")
    for username, password in [("bob", "wrong"), ("nobody", "x")]:
        r = client.post("/delete-account", data={"username": username, "password": password})
        assert r.status_code == 400
        assert "שגויים" in r.text
    assert _counts(db)["users"] == 1


def test_web_delete_with_correct_credentials_deletes_everything(client, register, db):
    _setup_two_users_sharing(client, register)
    client.post("/delete-account", data={"username": "alice", "password": "pw-a"})
    r = client.post("/delete-account", data={"username": "bob", "password": "pw-b"})
    assert r.status_code == 200
    assert "החשבון נמחק" in r.text
    assert _counts(db) == {"users": 0, "lists": 0, "items": 0, "shares": 0}


def test_privacy_page_has_contact_email_and_delete_link(client):
    r = client.get("/privacy")
    assert r.status_code == 200
    assert "david.app.programing@gmail.com" in r.text
    assert 'href="/delete-account"' in r.text
