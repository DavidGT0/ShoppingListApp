"""שליחת מיילים דרך ה-API של Resend (HTTPS).

לא משתמשים ב-SMTP: בחבילה החינמית של Render הפורטים של SMTP חסומים.
משתני סביבה (מוגדרים ב-Render → Environment):
    RESEND_API_KEY - המפתח מ-resend.com
    EMAIL_FROM     - השולח, למשל: ShopLi <noreply@your-domain.com> (דומיין שאומת ב-Resend)
"""
import json
import logging
import os
import urllib.request

logger = logging.getLogger(__name__)

RESEND_URL = "https://api.resend.com/emails"


def send_email(to: str, subject: str, html: str) -> bool:
    """שולח מייל. מחזיר True אם נשלח; False אם לא מוגדר מפתח או שהשליחה נכשלה (בלי לקרוס)."""
    api_key = os.getenv("RESEND_API_KEY")
    if not api_key:
        logger.warning("RESEND_API_KEY is not set - email was not sent")
        return False

    payload = {
        "from": os.getenv("EMAIL_FROM", "ShopLi <onboarding@resend.dev>"),
        "to": [to],
        "subject": subject,
        "html": html,
    }
    request = urllib.request.Request(
        RESEND_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            return 200 <= response.status < 300
    except Exception:
        logger.exception("Failed to send email")
        return False
