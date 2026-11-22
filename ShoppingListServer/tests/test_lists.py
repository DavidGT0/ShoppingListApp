"""רשימות: בעלות ורשימות משותפות"""


def test_lists_say_which_ones_i_own_and_which_are_shared_with_me(client, register):
    alice = register("alice")
    bob = register("bob")
    a_list = client.post("/lists", json={"name": "Alice groceries"}, headers=alice).json()["id"]
    client.post("/lists/share", json={"list_id": a_list, "username": "bob"}, headers=alice)

    alice_view = {lst["name"]: lst["is_owner"] for lst in client.get("/lists", headers=alice).json()}
    bob_view = {lst["name"]: lst["is_owner"] for lst in client.get("/lists", headers=bob).json()}

    assert alice_view == {"הרשימה שלי": True, "Alice groceries": True}
    assert bob_view == {"הרשימה שלי": True, "Alice groceries": False}


def test_created_and_renamed_lists_are_marked_as_owned(client, register):
    alice = register("alice")
    created = client.post("/lists", json={"name": "New"}, headers=alice).json()
    assert created["is_owner"] is True
    renamed = client.put(f"/lists/{created['id']}", json={"name": "Renamed"}, headers=alice).json()
    assert renamed["is_owner"] is True
