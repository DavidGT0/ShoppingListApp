// האותיות והספרות של קודי ההזמנה (בלי I, L, O, 0, 1 שקל לבלבל ביניהם)
const CODE_PATTERN = /\b[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}\b/g;

/**
 * חילוץ קוד הזמנה מטקסט חופשי (למשל הודעת וואטסאפ שלמה שהודבקה).
 * מחזיר את המופע האחרון של קוד תקין; אם אין, את הטקסט כפי שהוא באותיות גדולות.
 */
export const extractInviteCode = text => {
  const upper = String(text ?? '').toUpperCase();
  const matches = upper.match(CODE_PATTERN);
  return matches ? matches[matches.length - 1] : upper.trim();
};
