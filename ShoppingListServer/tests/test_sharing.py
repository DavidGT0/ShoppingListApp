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
