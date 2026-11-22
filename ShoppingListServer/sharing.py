"""עזרים טהורים לקודי הזמנה לרשימה"""
import secrets

# בלי 0/O ו-1/I/L, כדי שאי אפשר יהיה להתבלבל בין תווים כשמקלידים קוד
INVITE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
INVITE_CODE_LENGTH = 6


def generate_invite_code() -> str:
    return "".join(secrets.choice(INVITE_ALPHABET) for _ in range(INVITE_CODE_LENGTH))


def normalize_invite_code(raw: str) -> str:
    return raw.strip().upper()


class JoinAttemptLimiter:
    """מגביל ניסיונות הצטרפות כושלים לכל משתמש, בחלון זמן נע. נשמר בזיכרון בלבד"""

    def __init__(self, max_failures: int = 10, window_seconds: int = 600):
        self.max_failures = max_failures
        self.window_seconds = window_seconds
        self._failures: dict[int, list[float]] = {}

    def _recent(self, user_id: int, now: float) -> list[float]:
        recent = [t for t in self._failures.get(user_id, []) if now - t < self.window_seconds]
        if recent:
            self._failures[user_id] = recent
        else:
            self._failures.pop(user_id, None)
        return recent

    def is_blocked(self, user_id: int, now: float) -> bool:
        return len(self._recent(user_id, now)) >= self.max_failures

    def record_failure(self, user_id: int, now: float) -> None:
        recent = self._recent(user_id, now)
        recent.append(now)
        self._failures[user_id] = recent

    def reset(self) -> None:
        self._failures.clear()
