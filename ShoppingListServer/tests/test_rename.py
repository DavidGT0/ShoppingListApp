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


def _token_for(sub, uid=None):
    import main
    from datetime import timedelta
    data = {"sub": sub}
    if uid is not None:
        data["uid"] = uid
    return main.create_access_token(data, timedelta(minutes=5))


def test_old_token_not_inherited_by_new_owner_of_old_name(client, register):
    old_headers = register("dana")
    new_token = client.patch("/users/me", json={"username": "dana2"}, headers=old_headers).json()["access_token"]
    register("dana", email="other@example.com")
    assert client.get("/users/me", headers=old_headers).status_code == 401
    me = client.get("/users/me", headers=_auth(new_token))
    assert me.status_code == 200 and me.json()["username"] == "dana2"


def test_token_without_uid_rejected(client, register):
    register("dana")
    assert client.get("/users/me", headers=_auth(_token_for("dana"))).status_code == 401


def test_token_with_uid_of_other_user_rejected(client, register, db):
    import models
    register("dana")
    register("noam")
    dana = db.query(models.User).filter_by(username="dana").one()
    noam = db.query(models.User).filter_by(username="noam").one()
    assert client.get("/users/me", headers=_auth(_token_for("dana", dana.id))).status_code == 200
    assert client.get("/users/me", headers=_auth(_token_for("dana", noam.id))).status_code == 401


def test_rename_race_integrity_error_gives_400(client, register, db, monkeypatch):
    headers = register("dana")
    register("noam")
    import main
    from sqlalchemy.orm import Session
    # מדלגים על בדיקת הכפילות המוקדמת, כך שרק אילוץ המסד יתפוס את הכפילות
    real_query = Session.query

    def fake_query(self, *args, **kwargs):
        q = real_query(self, *args, **kwargs)
        if args and args[0] is main.models.User:
            class NoDup:
                def filter(self, *a, **k):
                    class R:
                        def first(_):
                            return None
                    return R() if len(a) == 2 else q.filter(*a, **k)
            return NoDup()
        return q

    monkeypatch.setattr(Session, "query", fake_query)
    r = client.patch("/users/me", json={"username": "noam"}, headers=headers)
    assert r.status_code == 400
    assert r.json()["detail"] == "שם המשתמש כבר תפוס"
