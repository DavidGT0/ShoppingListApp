import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# טעינה בטוחה של קובץ ה-.env מתוך התיקייה שבה נמצא קובץ ה-database.py עצמו
env_path = Path(__file__).resolve().parent / '.env'
load_dotenv(dotenv_path=env_path)

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

# אם עדיין ריק, נציג הודעה מדויקת באיזה נתיב חיפשנו את הקובץ
if not SQLALCHEMY_DATABASE_URL:
    raise ValueError(f"DATABASE_URL is not set. Please make sure a .env file exists at: {env_path}")

# תמיד משתמשים במפורש בדרייבר psycopg2.
# החל מ-SQLAlchemy 2.1 הכתובת postgresql:// מחפשת כברירת מחדל את psycopg (גרסה 3), שלא מותקן אצלנו.
for _prefix in ("postgres://", "postgresql://"):
    if SQLALCHEMY_DATABASE_URL.startswith(_prefix):
        SQLALCHEMY_DATABASE_URL = "postgresql+psycopg2://" + SQLALCHEMY_DATABASE_URL[len(_prefix):]
        break

engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# פונקציה שתספק לנו את החיבור למסד הנתונים בכל בקשה
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()