"""קודי הזמנה לרשימה: יצירה, קבלה ואיפוס"""
import models
import sharing


def _make_list(client, headers, name="Family"):
    return client.post("/lists", json={"name": name}, headers=headers).json()["id"]


def test_generated_code_uses_only_unambiguous_characters():
    for _ in range(200):
        code = sharing.generate_invite_code()
        assert len(code) == 6
        assert all(ch in sharing.INVITE_ALPHABET for ch in code)
        assert not set(code) & set("0O1IL")


def test_owner_gets_a_stable_invite_code(client, register):
    alice = register("alice")
    list_id = _make_list(client, alice)

    first = client.post(f"/lists/{list_id}/invite", headers=alice)
    second = client.post(f"/lists/{list_id}/invite", headers=alice)

    assert first.status_code == 200
    assert second.status_code == 200
    assert first.json()["code"] == second.json()["code"]


def test_reset_replaces_the_code(client, register):
    alice = register("alice")
    list_id = _make_list(client, alice)
    old = client.post(f"/lists/{list_id}/invite", headers=alice).json()["code"]

    reset = client.post(f"/lists/{list_id}/invite/reset", headers=alice)
    current = client.post(f"/lists/{list_id}/invite", headers=alice)

    assert reset.status_code == 200
    assert reset.json()["code"] != old
    assert current.json()["code"] == reset.json()["code"]


def test_only_the_owner_can_get_or_reset_the_code(client, register):
    alice = register("alice")
    bob = register("bob")
    carol = register("carol")
    list_id = _make_list(client, alice)
    client.post("/lists/share", json={"list_id": list_id, "username": "bob"}, headers=alice)

    for headers in (bob, carol):
        assert client.post(f"/lists/{list_id}/invite", headers=headers).status_code == 403
        assert client.post(f"/lists/{list_id}/invite/reset", headers=headers).status_code == 403


def test_invite_for_a_missing_list_is_404(client, register):
    alice = register("alice")
    assert client.post("/lists/9999/invite", headers=alice).status_code == 404
    assert client.post("/lists/9999/invite/reset", headers=alice).status_code == 404


def test_deleting_a_list_deletes_its_invite(client, register, db):
    alice = register("alice")
    list_id = _make_list(client, alice)
    client.post(f"/lists/{list_id}/invite", headers=alice)
    assert db.query(models.ListInvite).filter_by(list_id=list_id).count() == 1

    assert client.delete(f"/lists/{list_id}", headers=alice).status_code == 200

    db.expire_all()
    assert db.query(models.ListInvite).filter_by(list_id=list_id).count() == 0


def test_normalize_invite_code_strips_and_uppercases():
    assert sharing.normalize_invite_code("  ab3k9x \n") == "AB3K9X"


def _invite_code(client, headers, list_id):
    return client.post(f"/lists/{list_id}/invite", headers=headers).json()["code"]


def test_join_with_code_adds_me_as_member(client, register):
    alice = register("alice")
    bob = register("bob")
    list_id = _make_list(client, alice)
    code = _invite_code(client, alice, list_id)

    r = client.post("/lists/join", json={"code": code}, headers=bob)

    assert r.status_code == 200
    assert r.json()["id"] == list_id
    assert r.json()["is_owner"] is False
    mine = client.get("/lists", headers=bob).json()
    assert (list_id, False) in [(l["id"], l["is_owner"]) for l in mine]


def test_join_ignores_case_and_spaces(client, register):
    alice = register("alice")
    bob = register("bob")
    list_id = _make_list(client, alice)
    code = _invite_code(client, alice, list_id)

    r = client.post("/lists/join", json={"code": f"  {code.lower()}  "}, headers=bob)

    assert r.status_code == 200


def test_joining_twice_does_not_duplicate(client, register, db):
    alice = register("alice")
    bob = register("bob")
    list_id = _make_list(client, alice)
    code = _invite_code(client, alice, list_id)

    assert client.post("/lists/join", json={"code": code}, headers=bob).status_code == 200
    assert client.post("/lists/join", json={"code": code}, headers=bob).status_code == 200

    rows = db.execute(models.shared_lists.select().where(models.shared_lists.c.list_id == list_id)).fetchall()
    assert len(rows) == 1


def test_owner_joining_own_list_gets_400(client, register):
    alice = register("alice")
    list_id = _make_list(client, alice)
    code = _invite_code(client, alice, list_id)

    r = client.post("/lists/join", json={"code": code}, headers=alice)

    assert r.status_code == 400
    assert r.json()["detail"] == "זו הרשימה שלך"


def test_unknown_code_gets_404(client, register):
    bob = register("bob")

    r = client.post("/lists/join", json={"code": "ZZZZZZ"}, headers=bob)

    assert r.status_code == 404
    assert r.json()["detail"] == "קוד ההזמנה לא נמצא"


def test_old_code_stops_working_after_reset(client, register):
    alice = register("alice")
    bob = register("bob")
    list_id = _make_list(client, alice)
    old_code = _invite_code(client, alice, list_id)
    client.post(f"/lists/{list_id}/invite/reset", headers=alice)

    r = client.post("/lists/join", json={"code": old_code}, headers=bob)

    assert r.status_code == 404


def test_too_many_wrong_codes_get_429(client, register):
    alice = register("alice")
    bob = register("bob")
    carol = register("carol")
    list_id = _make_list(client, alice)
    code = _invite_code(client, alice, list_id)

    for _ in range(10):
        assert client.post("/lists/join", json={"code": "ZZZZZZ"}, headers=bob).status_code == 404

    r = client.post("/lists/join", json={"code": code}, headers=bob)
    assert r.status_code == 429
    assert r.json()["detail"] == "יותר מדי ניסיונות, נסה שוב בעוד כמה דקות"
    assert client.post("/lists/join", json={"code": code}, headers=carol).status_code == 200


def test_limiter_forgets_old_failures():
    limiter = sharing.JoinAttemptLimiter(max_failures=10, window_seconds=600)
    for _ in range(10):
        limiter.record_failure(1, now=1000.0)
    assert limiter.is_blocked(1, now=1000.0)
    assert limiter.is_blocked(1, now=1599.0)
    assert not limiter.is_blocked(1, now=1601.0)
    assert not limiter.is_blocked(2, now=1000.0)
