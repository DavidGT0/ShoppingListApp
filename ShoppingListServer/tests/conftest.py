"""הגדרות משותפות לבדיקות השרת.

הבדיקות רצות מול מסד נתונים SQLite זמני - אף פעם לא מול מסד הנתונים האמיתי.
הרצה (מתוך התיקייה ShoppingListServer):
    pip install -r requirements-dev.txt
    pytest
"""
import os
import sys
import tempfile
from pathlib import Path

import pytest

# חייב לקרות לפני ש-main/database מיובאים: מסד נתונים זמני ומפתח בדיקה
_tmp_dir = tempfile.mkdtemp(prefix="shopli-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_tmp_dir) / 'test.db'}"
os.environ["SECRET_KEY"] = "test-secret-key"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from fastapi.testclient import TestClient  # noqa: E402
from passlib.context import CryptContext  # noqa: E402

import main  # noqa: E402
from database import Base, SessionLocal, engine  # noqa: E402

# הצפנה מהירה לבדיקות. בשרת עצמו נשאר bcrypt (בגרסה הנעולה 4.0.1 ב-requirements.txt);
# כאן זה לא משנה, וגם חוסך תלות בגרסת bcrypt שמותקנת מקומית.
main.pwd_context = CryptContext(schemes=["pbkdf2_sha256"])


@pytest.fixture
def client():
    """לקוח HTTP לשרת, עם מסד נתונים ריק בכל בדיקה"""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    return TestClient(main.app)


@pytest.fixture
def db():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture
def sent_emails(monkeypatch):
    """תופס מיילים במקום לשלוח אותם באמת. כל מייל: dict עם to, subject, html"""
    import email_sender

    outbox = []

    def fake_send_email(to, subject, html):
        outbox.append({"to": to, "subject": subject, "html": html})
        return True

    monkeypatch.setattr(email_sender, "send_email", fake_send_email)
    return outbox


@pytest.fixture
def register(client):
    """רישום + התחברות. מחזיר headers עם הטוקן"""
    def _register(username, password="secret-pw", email=None):
        email = email or f"{username}@example.com"
        r = client.post("/register", json={"username": username, "email": email, "password": password})
        assert r.status_code == 201, r.text
        r = client.post("/token", data={"username": username, "password": password})
        assert r.status_code == 200, r.text
        return {"Authorization": f"Bearer {r.json()['access_token']}"}
    return _register
