"""הוספת עמודות חסרות לטבלאות קיימות בהפעלת השרת (בלי למחוק או לשנות נתונים)."""
from sqlalchemy import inspect, text

# (טבלה, עמודה, הגדרת טיפוס) - כולן nullable וללא ברירת מחדל בשרת
REQUIRED_COLUMNS = [
    ("items", "unit", "VARCHAR(10)"),
    ("items", "note", "VARCHAR(100)"),
    ("items", "category", "VARCHAR(40)"),
    ("items", "added_by_id", "INTEGER REFERENCES users(id) ON DELETE SET NULL"),
    ("item_history", "category", "VARCHAR(40)"),
]


def ensure_columns(engine):
    """מוסיף עמודות חסרות. מחזיר רשימת "table.column" שנוספו. הרצה חוזרת היא no-op."""
    added = []
    inspector = inspect(engine)
    existing_tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        if engine.dialect.name == "postgresql":
            # נעילה תקועה תכשיל את ההפעלה במקום להיתקע
            conn.execute(text("SET LOCAL lock_timeout = '10s'"))
        for table, column, ddl in REQUIRED_COLUMNS:
            if table not in existing_tables:
                continue  # create_all יוצר אותה במלואה
            have = {c["name"] for c in inspect(conn).get_columns(table)}
            if column in have:
                continue
            conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
            added.append(f"{table}.{column}")
    return added
