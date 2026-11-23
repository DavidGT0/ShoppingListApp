// גוונים מצבע של מחלקה: שקיפות (rgba) או ערבוב על רקע לצבע אטום.
// צבע שאינו hex (למשל ערך לא צפוי מהשרת) מחזיר null, והקורא בוחר צבע מהערכה.

// אחוז השקיפות של רקע סמל המחלקה בכל ערכה
export const STATION_TINT_LIGHT = 0.18;
export const STATION_TINT_DARK = 0.35;

const parseHex = value => {
  if (typeof value !== 'string') return null;
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value.trim());
  if (!match) return null;
  let hex = match[1];
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map(ch => ch + ch)
      .join('');
  }
  return [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
};

const toHex = rgb =>
  `#${rgb
    .map(v => Math.round(Math.min(255, Math.max(0, v))))
    .map(v => v.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`;

export const withAlpha = (color, alpha) => {
  const rgb = parseHex(color);
  if (!rgb) return null;
  return `rgba(${rgb.join(', ')}, ${alpha})`;
};

// הצבע בשקיפות alpha מעל רקע base, כצבע אטום (כדי שקו המסלול לא ייראה דרכו)
export const mixOver = (color, alpha, base) => {
  const rgb = parseHex(color);
  const under = parseHex(base);
  if (!rgb || !under) return null;
  return toHex(rgb.map((v, i) => v * alpha + under[i] * (1 - alpha)));
};

// רקע הסמל העגול של מחלקה במסלול: פסטל בהיר (על המשטח הלבן) בערכה הבהירה,
// כמו בעיצוב, וגוון עמוק (על הרקע הכהה) בכהה
export const stationTint = (color, colors, isDark) =>
  (isDark
    ? mixOver(color, STATION_TINT_DARK, colors.background)
    : mixOver(color, STATION_TINT_LIGHT, colors.surface)) ||
  colors.surfaceHighlight;
