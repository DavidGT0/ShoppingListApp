"""עזרים טהורים לקודי הזמנה לרשימה"""
import secrets

# בלי 0/O ו-1/I/L, כדי שאי אפשר יהיה להתבלבל בין תווים כשמקלידים קוד
INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
INVITE_CODE_LENGTH = 6


def generate_invite_code() -> str:
    return "".join(secrets.choice(INVITE_ALPHABET) for _ in range(INVITE_CODE_LENGTH))


def normalize_invite_code(raw: str) -> str:
    return raw.strip().upper()
