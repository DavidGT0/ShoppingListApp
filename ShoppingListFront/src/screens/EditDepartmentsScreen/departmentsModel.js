// מצב מסך עריכת המחלקות: השורות עם השינויים (שם/אייקון, null = ברירת המחדל)
// והסדר של כל המחלקות (בלי "אחר", שתמיד אחרונה)
import { BUILTIN_CATEGORIES, customKey } from '../../services/categories';

export const OTHER_KEY = 'other';
export const DEFAULT_ICON = '🛒';
export const MAX_NAME = 30;

const customRow = c => ({
  key: customKey(c.id),
  name: null,
  icon: null,
  defaultName: c.name,
  defaultIcon: c.icon || DEFAULT_ICON,
  color: c.color,
  isCustom: true,
  catId: c.id,
});

export const newCustomRow = customRow;

export const displayName = row => row.name || row.defaultName;
export const displayIcon = row => row.icon || row.defaultIcon;

const byPosition = layout =>
  [...layout]
    .filter(Boolean)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

// מהתשובה של GET: {custom, layout}. כל המחלקות מוצגות (גם מובנות בלי מוצרים),
// כדי שאפשר יהיה לתכנן את המסלול מראש
export const buildEditorState = ({ custom = [], layout = [] } = {}) => {
  const defaults = new Map();
  BUILTIN_CATEGORIES.forEach(c =>
    defaults.set(c.key, {
      key: c.key,
      name: null,
      icon: null,
      defaultName: c.name,
      defaultIcon: c.icon || DEFAULT_ICON,
      color: c.color,
      isCustom: false,
      catId: null,
    }),
  );
  custom.forEach(c => defaults.set(customKey(c.id), customRow(c)));

  const rows = {};
  const keys = [];
  byPosition(layout)
    .filter(e => defaults.has(e.key))
    .forEach(e => {
      if (rows[e.key]) return;
      rows[e.key] = {
        ...defaults.get(e.key),
        name: e.name || null,
        icon: e.icon || null,
      };
      keys.push(e.key);
    });
  // מחלקה שחסרה בפריסה: בסוף, בסדר ברירת המחדל
  defaults.forEach((row, key) => {
    if (!rows[key]) {
      rows[key] = row;
      keys.push(key);
    }
  });
  return { rows, order: keys.filter(k => k !== OTHER_KEY) };
};

const entryOf = (key, row) => ({
  key,
  name: row.name || null,
  icon: row.icon || null,
});

// גוף הבקשה של PUT: כל המפתחות בסדר החדש, עם השם והאייקון (null = ברירת המחדל).
// extra: רשומות מוכנות שנוספות לפני "אחר" (מחלקות שמשתתף אחר הוסיף בינתיים)
export const layoutPayload = (order, rows, extra = []) => [
  ...order.filter(key => rows[key]).map(key => entryOf(key, rows[key])),
  ...extra,
  entryOf(OTHER_KEY, rows[OTHER_KEY] || {}),
];

// האם יש שינוי שלא נשמר לעומת נקודת ההשוואה (הסדר, או שם/אייקון של שורה)
export const isDirty = (baseline, order, rows) => {
  if (!baseline) return false;
  if (order.length !== baseline.order.length) return true;
  if (order.some((key, i) => key !== baseline.order[i])) return true;
  return Object.keys(rows).some(key => {
    const before = baseline.rows[key];
    return (
      !before ||
      (before.name || null) !== (rows[key].name || null) ||
      (before.icon || null) !== (rows[key].icon || null)
    );
  });
};

// חתימת המחלקות בשרת, בלי המפתחות שאני הוספתי או מחקתי (הם כבר חלים בשרת)
const signature = ({ custom = [], layout = [] } = {}, mine) =>
  JSON.stringify({
    layout: byPosition(layout)
      .filter(e => !mine.has(e.key))
      .map(e => [e.key, e.name || null, e.icon || null]),
    custom: custom
      .filter(c => !mine.has(customKey(c.id)))
      .map(c => [c.id, c.name, c.icon || null])
      .sort((a, b) => a[0] - b[0]),
  });

// האם משתתף אחר שינה את המחלקות מאז שהמסך נטען (שם, אייקון, סדר, הוספה או מחיקה)
export const serverChanged = (snapshot, fresh, mine = new Set()) =>
  signature(snapshot, mine) !== signature(fresh, mine);

// מחלקות שקיימות בשרת ואין לי (משתתף אחר הוסיף), כרשומות לשמירה
export const serverOnlyEntries = (fresh, rows) => {
  const layout = new Map(
    byPosition(fresh?.layout || []).map(e => [e.key, e]),
  );
  return (fresh?.custom || [])
    .map(c => customKey(c.id))
    .filter(key => !rows[key])
    .map(key => {
      const e = layout.get(key);
      return { key, name: e?.name || null, icon: e?.icon || null };
    });
};

const normalizeName = value => (value || '').trim().toLowerCase();

// המחלקה (אחרת) שכבר מוצגת בשם הזה, לפי השם המוצג ולא השם הגולמי
export const findClash = (rows, name, exceptKey = null) => {
  const wanted = normalizeName(name);
  return (
    Object.values(rows).find(
      row => row.key !== exceptKey && normalizeName(displayName(row)) === wanted,
    ) || null
  );
};

// השם שנשלח אחרי עריכה: ריק או זהה לברירת המחדל = null (חזרה לשם המקורי)
export const nameOverride = (row, text) => {
  const trimmed = (text || '').trim();
  if (!trimmed || trimmed === row.defaultName) return null;
  return trimmed;
};

// הזזת מחלקה בצעד אחד (פעולות קורא המסך)
export const moveKey = (order, key, delta) => {
  const from = order.indexOf(key);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= order.length) return order;
  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, key);
  return next;
};
