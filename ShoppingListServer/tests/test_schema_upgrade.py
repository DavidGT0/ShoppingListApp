import os
import tempfile

from sqlalchemy import create_engine, inspect, text

from schema_upgrade import ensure_columns

EXPECTED = [
    "items.unit",
    "items.note",
    "items.category",
    "items.added_by_id",
    "item_history.category",
]


def make_old_engine():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    engine = create_engine(f"sqlite:///{path}")
    with engine.begin() as c:
        c.execute(text("CREATE TABLE users (id INTEGER PRIMARY KEY, username VARCHAR NOT NULL, email VARCHAR NOT NULL, hashed_password VARCHAR NOT NULL, is_active BOOLEAN)"))
        c.execute(text("CREATE TABLE shopping_lists (id INTEGER PRIMARY KEY, name VARCHAR NOT NULL, owner_id INTEGER REFERENCES users(id))"))
        c.execute(text("CREATE TABLE items (id INTEGER PRIMARY KEY, name VARCHAR NOT NULL, amount INTEGER, purchased BOOLEAN, position INTEGER, list_id INTEGER REFERENCES shopping_lists(id))"))
        c.execute(text("CREATE TABLE item_history (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), name VARCHAR(100) NOT NULL, name_key VARCHAR(100) NOT NULL, use_count INTEGER NOT NULL, last_used DATETIME NOT NULL)"))
        c.execute(text("INSERT INTO users VALUES (1, 'u', 'u@example.com', 'x', 1)"))
        c.execute(text("INSERT INTO shopping_lists VALUES (1, 'L', 1)"))
        c.execute(text("INSERT INTO items VALUES (1, 'milk', 2, 0, 3, 1)"))
        c.execute(text("INSERT INTO item_history VALUES (1, 1, 'milk', 'milk', 4, '2026-01-01 00:00:00')"))
    return engine, path


def test_upgrades_old_schema_and_keeps_data():
    engine, path = make_old_engine()
    try:
        assert ensure_columns(engine) == EXPECTED
        insp = inspect(engine)
        item_cols = {c["name"] for c in insp.get_columns("items")}
        assert {"unit", "note", "category", "added_by_id"} <= item_cols
        assert "category" in {c["name"] for c in insp.get_columns("item_history")}
        with engine.connect() as c:
            row = c.execute(text("SELECT id, name, amount, purchased, position, list_id, unit, note, category, added_by_id FROM items")).one()
            assert tuple(row) == (1, "milk", 2, 0, 3, 1, None, None, None, None)
            h = c.execute(text("SELECT name, use_count, category FROM item_history")).one()
            assert tuple(h) == ("milk", 4, None)
            assert c.execute(text("SELECT count(*) FROM users")).scalar() == 1
    finally:
        engine.dispose()
        os.remove(path)


def assert_added_by_fk(engine):
    fks = inspect(engine).get_foreign_keys("items")
    fk = [f for f in fks if f["constrained_columns"] == ["added_by_id"]]
    assert len(fk) == 1
    assert fk[0]["referred_table"] == "users"
    assert fk[0].get("options", {}).get("ondelete") == "SET NULL"


def test_added_by_fk_on_delete_set_null_after_upgrade():
    engine, path = make_old_engine()
    try:
        ensure_columns(engine)
        # SQLAlchemy לא מפרש הגדרת FK inline של ADD COLUMN ב-SQLite, לכן בודקים ב-PRAGMA
        with engine.connect() as c:
            rows = c.execute(text("PRAGMA foreign_key_list(items)")).all()
        fk = [r for r in rows if r[3] == "added_by_id"]
        assert len(fk) == 1
        assert fk[0][2] == "users"
        assert fk[0][6] == "SET NULL"  # on_delete
    finally:
        engine.dispose()
        os.remove(path)


def test_added_by_fk_on_delete_set_null_after_create_all():
    import models
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    engine = create_engine(f"sqlite:///{path}")
    try:
        models.Base.metadata.create_all(bind=engine)
        assert_added_by_fk(engine)
    finally:
        engine.dispose()
        os.remove(path)


def test_second_call_is_noop():
    engine, path = make_old_engine()
    try:
        ensure_columns(engine)
        assert ensure_columns(engine) == []
    finally:
        engine.dispose()
        os.remove(path)


def test_fresh_create_all_db_is_noop(client):
    from database import engine
    assert ensure_columns(engine) == []


def test_missing_tables_are_skipped():
    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    engine = create_engine(f"sqlite:///{path}")
    try:
        assert ensure_columns(engine) == []
    finally:
        engine.dispose()
        os.remove(path)


def test_custom_category_list_fk_cascades_on_delete(client):
    from database import engine
    fks = inspect(engine).get_foreign_keys("custom_categories")
    fk = [f for f in fks if f["constrained_columns"] == ["list_id"]]
    assert len(fk) == 1
    assert fk[0]["referred_table"] == "shopping_lists"
    assert fk[0].get("options", {}).get("ondelete") == "CASCADE"
