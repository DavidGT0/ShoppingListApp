// מצב מסך עריכת המחלקות: כל המפתחות של הפריסה (גם מחלקות שלא מוצגות), השורות
// עם השינויים (שם/אייקון, null = ברירת המחדל), והסדר של השורות המוצגות
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

// מהתשובה של GET: {custom, layout}. usedKeys = המחלקות שיש בהן מוצרים ברשימה
export const buildEditorState = ({ custom = [], layout = [] } = {}, usedKeys = []) => {
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
  [...layout]
    .filter(e => e && defaults.has(e.key))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
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
  const allKeys = [...keys.filter(k => k !== OTHER_KEY), OTHER_KEY];

  const used = new Set(usedKeys);
  const order = allKeys.filter(key => {
    if (key === OTHER_KEY) return false;
    const row = rows[key];
    return row.isCustom || used.has(key) || !!row.name || !!row.icon;
  });
  return { allKeys, rows, order };
};

// הסדר המלא לשמירה: המחלקות המוצגות חוזרות למקומות שלהן בסדר החדש, והמוסתרות
// נשארות במקומן. "אחר" תמיד אחרונה
export const mergeOrder = (allKeys, order) => {
  const shown = new Set(order);
  const result = [...allKeys];
  let next = 0;
  allKeys.forEach((key, index) => {
    if (shown.has(key)) result[index] = order[next++];
  });
  return [...result.filter(k => k !== OTHER_KEY), OTHER_KEY];
};

// גוף הבקשה של PUT: כל המפתחות, עם השם והאייקון (null = ברירת המחדל)
export const layoutPayload = (allKeys, order, rows) =>
  mergeOrder(allKeys, order).map(key => ({
    key,
    name: rows[key].name || null,
    icon: rows[key].icon || null,
  }));

const normalizeName = value => (value || '').trim().toLowerCase();

// האם השם כבר מוצג למחלקה אחרת (לפי השם המוצג, לא השם הגולמי)
export const nameTaken = (rows, name, exceptKey = null) => {
  const wanted = normalizeName(name);
  return Object.values(rows).some(
    row => row.key !== exceptKey && normalizeName(displayName(row)) === wanted,
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
