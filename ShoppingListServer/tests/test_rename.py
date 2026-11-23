"""שינוי שם משתמש בלי התנתקות"""


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _login_token(client, username):
    r = client.post("/token", data={"username": username, "password": "secret-pw"})
    return r.json()["access_token"]


def test_rename_returns_new_token_and_invalidates_old(client, register):
    old_headers = register("dana")
    r = client.patch("/users/me", json={"username": "  dana2  "}, headers=old_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["username"] == "dana2"
    assert body["token_type"] == "bearer"
    assert client.get("/users/me", headers=old_headers).status_code == 401
    me = client.get("/users/me", headers=_auth(body["access_token"]))
    assert me.status_code == 200
    assert me.json()["username"] == "dana2"


def test_rename_duplicate_case_insensitive(client, register):
    register("dana")
    headers = register("noam")
    r = client.patch("/users/me", json={"username": " DANA "}, headers=headers)
    assert r.status_code == 400
    assert r.json()["detail"] == "שם המשתמש כבר תפוס"


def test_rename_refuses_at(client, register):
    headers = register("dana")
    r = client.patch("/users/me", json={"username": "a@b"}, headers=headers)
    assert r.status_code == 400
    assert r.json()["detail"] == "שם המשתמש לא יכול להכיל @"


def test_rename_refuses_empty(client, register):
    headers = register("dana")
    r = client.patch("/users/me", json={"username": "   "}, headers=headers)
    assert r.status_code == 400


def test_rename_refuses_too_long(client, register):
    headers = register("dana")
    r = client.patch("/users/me", json={"username": "x" * 51}, headers=headers)
    assert r.status_code == 400


def test_rename_to_same_name_is_ok(client, register):
    headers = register("dana")
    r = client.patch("/users/me", json={"username": "dana"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["username"] == "dana"
    assert client.get("/users/me", headers=_auth(r.json()["access_token"])).status_code == 200


def test_rename_to_different_case_of_own_name_is_ok(client, register):
    headers = register("dana")
    r = client.patch("/users/me", json={"username": "Dana"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["username"] == "Dana"
