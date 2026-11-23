// מחלקות מוצרים: מילון אוטומטי בעברית + מחלקות מותאמות של הרשימה.
// הסדר ברשימה הוא סדר המעברים בסופר.

export const BUILTIN_CATEGORIES = [
  { key: 'produce', name: 'פירות וירקות', color: '#4CAF50', icon: '🥦' },
  { key: 'dairy', name: 'מוצרי חלב וביצים', color: '#64B5F6', icon: '🥛' },
  { key: 'bakery', name: 'מאפים ולחם', color: '#D4A056', icon: '🥖' },
  { key: 'meat', name: 'בשר ודגים', color: '#E57373', icon: '🥩' },
  { key: 'pantry', name: 'יבשים ושימורים', color: '#A1887F', icon: '🥫' },
  { key: 'frozen', name: 'קפואים', color: '#4DD0E1', icon: '🧊' },
  { key: 'drinks', name: 'משקאות', color: '#7986CB', icon: '🥤' },
  { key: 'snacks', name: 'חטיפים ומתוקים', color: '#FF8A65', icon: '🍫' },
  { key: 'cleaning', name: 'ניקיון ובית', color: '#26A69A', icon: '🧽' },
  { key: 'care', name: 'טיפוח ותינוקות', color: '#BA68C8', icon: '🧴' },
  { key: 'other', name: 'אחר', color: '#9E9E9E', icon: '🛒' },
];

const KEYWORDS = {
  produce: [
    'עגבניה',
    'עגבניות',
    'מלפפון',
    'חסה',
    'גזר',
    'בצל',
    'שום',
    'תפוח אדמה',
    'תפוחי אדמה',
    'תפוח',
    'בננה',
    'תפוז',
    'לימון',
    'אבוקדו',
    'פלפל',
    'חציל',
    'קישוא',
    'כרוב',
    'כרובית',
    'ברוקולי',
    'פטרוזיליה',
    'כוסברה',
    'נענע',
    'שמיר',
    'ענבים',
    'אבטיח',
    'מלון',
    'תות',
    'אפרסק',
    'שזיף',
    'אגס',
    'בטטה',
    'פטריות',
    'סלק',
    'צנונית',
    'קלמנטינה',
    'אשכולית',
    'מנגו',
    'פירות',
    'ירקות',
  ],
  dairy: [
    'חלב',
    'גבינה',
    'גבינת',
    'קוטג',
    'יוגורט',
    'שמנת',
    'חמאה',
    'ביצים',
    'ביצי',
    'ביצה',
    'לבן',
    'לאבנה',
    'מוצרלה',
    'פרמזן',
    'גבינה צהובה',
    'שמנת חמוצה',
    'שמנת מתוקה',
    'מילקי',
    'דנונה',
    'אקטיביה',
    'ריקוטה',
    'בולגרית',
    'גבינה לבנה',
  ],
  bakery: [
    'לחם',
    'לחמניה',
    'לחמנייה',
    'פיתה',
    'חלה',
    'בגט',
    'באגט',
    'טוסט',
    'עוגה',
    'בורקס',
    'קרואסון',
    'מאפה',
    'מאפים',
    'בייגלה',
    'רוגלך',
    'שקדיה',
    'לאפה',
    'טורטייה',
    'פוקאצה',
  ],
  meat: [
    'עוף',
    'חזה עוף',
    'שניצל',
    'בשר',
    'בקר',
    'טחון',
    'בשר טחון',
    'סטייק',
    'אנטריקוט',
    'כבד',
    'נקניק',
    'נקניקיות',
    'סלמון',
    'דג',
    'דגים',
    'פילה',
    'המבורגר',
    'קבב',
    'כנפיים',
    'שוק עוף',
    'הודו',
    'פרגיות',
    'אסאדו',
    'בייקון',
    'לברק',
    'דניס',
    'אמנון',
  ],
  pantry: [
    'אורז',
    'פסטה',
    'ספגטי',
    'קמח',
    'סוכר',
    'מלח',
    'שמן',
    'שמן זית',
    'קטשופ',
    'מיונז',
    'חומוס',
    'טחינה',
    'שימורים',
    'זיתים',
    'אפונה',
    'טונה',
    'תירס',
    'עדשים',
    'שעועית',
    'קוסקוס',
    'בורגול',
    'דגני בוקר',
    'קורנפלקס',
    'ריבה',
    'דבש',
    'חרדל',
    'רוטב',
    'רסק עגבניות',
    'אבקת אפייה',
    'קפה',
    'תה',
    'אגוזים',
    'פתיתים',
    'נודלס',
    'מרק',
  ],
  frozen: [
    'קפוא',
    'קפואים',
    'קפואה',
    'גלידה',
    'פיצה קפואה',
    'פיצה',
    'ירקות קפואים',
    'שלגון',
    'בצק עלים',
    'נאגטס',
    'מלוואח',
    'ג׳חנון',
    'בורקס קפוא',
    'אפונה קפואה',
    'סורבה',
    'המבורגר קפוא',
    'צ׳יפס קפוא',
    'פירות קפואים',
  ],
  drinks: [
    'מים',
    'מי עדן',
    'סודה',
    'קולה',
    'פפסי',
    'ספרייט',
    'פאנטה',
    'מיץ',
    'בירה',
    'יין',
    'וודקה',
    'ויסקי',
    'משקה',
    'משקאות',
    'תמר הינדי',
    'לימונדה',
    'נביעות',
    'קוקה קולה',
    'שוופס',
    'אייס טי',
    'מים מינרלים',
    'שמפניה',
    'ערק',
  ],
  snacks: [
    'במבה',
    'ביסלי',
    'שוקולד',
    'חטיף',
    'חטיפים',
    'צ׳יפס',
    'פופקורן',
    'סוכריות',
    'ממתק',
    'ממתקים',
    'וופל',
    'ופלים',
    'עוגיות',
    'מסטיק',
    'חלווה',
    'קליק',
    'פיצוחים',
    'גרעינים',
    'דוריטוס',
    'תפוצ׳יפס',
    'שוקולד חלב',
    'מרשמלו',
    'אוראו',
  ],
  cleaning: [
    'סבון כלים',
    'אקונומיקה',
    'נייר טואלט',
    'מגבות נייר',
    'שקיות זבל',
    'מרכך כביסה',
    'אבקת כביסה',
    'נוזל כביסה',
    'מנקה',
    'ספוג',
    'מטליות',
    'נייר אלומיניום',
    'נייר אפייה',
    'מפיות',
    'סבון רצפה',
    'חומר ניקוי',
    'מסיר שומנים',
    'כפפות',
    'מטאטא',
    'סקוטש',
    'מבשם אוויר',
    'טבליות למדיח',
  ],
  care: [
    'שמפו',
    'מרכך שיער',
    'סבון גוף',
    'משחת שיניים',
    'מברשת שיניים',
    'דאודורנט',
    'חיתולים',
    'מגבונים לחים',
    'מגבונים',
    'טישו',
    'סבון ידיים',
    'קרם',
    'קרם ידיים',
    'גילוח',
    'סכיני גילוח',
    'תחבושות',
    'טמפונים',
    'מטרנה',
    'תמ״ל',
    'קרם הגנה',
    'מי פה',
    'צמר גפן',
    'מקלון',
    'בושם',
    'לק',
    'קרם פנים',
  ],
};

const PREFIXES = ['ה', 'ו', 'ב', 'ל', 'מ', 'כ', 'ש', 'וה', 'לה', 'מה', 'בה'];

const FINAL_FOLD = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' };

const normalize = text =>
  String(text || '')
    .toLowerCase()
    .replace(/["'״׳]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    // אותיות סופיות לצורה רגילה, כדי שגזירת ריבוי (מלפפונים -> מלפפונ) תתאים למילת המפתח
    .replace(/[ךםןףץ]/g, ch => FINAL_FOLD[ch]);

// מילון מוכן פעם אחת: [{kw, words, key}] כשהמילים מנורמלות
const ENTRIES = Object.entries(KEYWORDS).flatMap(([key, list]) =>
  list.map(word => {
    const kw = normalize(word);
    return { kw, words: kw.split(' '), key };
  }),
);

// מילה במוצר מתאימה למילת מפתח: זהה, או מתחילה בה (ריבוי/סיומת), גם אחרי תחילית כמו ה/ב/ל.
// מילות מפתח קצרות (עד 3 אותיות) דורשות התאמה מלאה, כדי ש"דג" לא יתפוס "דגנים"
const tokenMatches = (token, kw) => {
  const bases = [token];
  // ריבוי: בננות -> בננה, פיתות -> פיתה, ביצים -> ביצ
  if (token.endsWith('ות')) {
    bases.push(token.slice(0, -2) + 'ה', token.slice(0, -2));
  } else if (token.endsWith('ימ')) {
    bases.push(token.slice(0, -2));
  }
  const candidates = bases.flatMap(base => [
    base,
    ...PREFIXES.map(p => base.startsWith(p) && base.slice(p.length)),
  ]);
  return candidates.some(
    c => c && (c === kw || (kw.length > 3 && c.startsWith(kw))),
  );
};

// ההתאמה הארוכה גוברת. מילה ראשונה בשם היא לרוב העיקר (מיץ תפוזים), לכן מקבלת בונוס
const FIRST_WORD_BONUS = 3;

const cache = new Map();
const CACHE_LIMIT = 2000;

const computeCategory = name => {
  const text = normalize(name);
  if (!text) return 'other';
  const tokens = text.split(' ');
  // מילה שמתחילה ב"קפוא" גוברת: ברוקולי קפוא הוא קפוא ולא ירק
  if (tokens.some(t => t.startsWith('קפוא'))) return 'frozen';
  let best = null;
  for (const { kw, words, key } of ENTRIES) {
    let score = 0;
    for (let i = 0; i + words.length <= tokens.length; i++) {
      if (words.every((w, j) => tokenMatches(tokens[i + j], w))) {
        score = kw.length + (i === 0 ? FIRST_WORD_BONUS : 0);
        break;
      }
    }
    if (score && (!best || score > best.score)) {
      best = { score, key };
    }
  }
  return best ? best.key : 'other';
};

// זיכרון לפי השם המנורמל - המסך מציג מחדש לעתים קרובות
export const categorize = name => {
  const text = normalize(name);
  let key = cache.get(text);
  if (key === undefined) {
    key = computeCategory(text);
    if (cache.size >= CACHE_LIMIT) cache.clear();
    cache.set(text, key);
  }
  return key;
};

const DEFAULT_ICON = '🛒';
const EMPTY = [];

export const customKey = id => `custom:${id}`;

// תשובת המחלקות בשני צורות: הישנה (מערך מחלקות מותאמות, גם מהמטמון) והחדשה {custom, layout}
export const normalizeCategories = value => {
  if (Array.isArray(value)) return { custom: value, layout: EMPTY };
  return {
    custom: Array.isArray(value?.custom) ? value.custom : EMPTY,
    layout: Array.isArray(value?.layout) ? value.layout : EMPTY,
  };
};

// כל המחלקות בסדר ברירת המחדל: מובנות, מותאמות לפי יצירה, אחר
const defaultDepartments = custom => [
  ...BUILTIN_CATEGORIES.filter(c => c.key !== 'other'),
  ...custom.map(c => ({
    key: customKey(c.id),
    name: c.name,
    color: c.color,
    icon: c.icon || DEFAULT_ICON,
  })),
  ...BUILTIN_CATEGORIES.filter(c => c.key === 'other'),
];

// זיכרון לפי זהות המערכים - המסך מחשב מחדש רק כשהמחלקות או הפריסה מתחלפות
const departmentCache = new WeakMap();
const mapCache = new WeakMap();

// המחלקות בסדר הפריסה של הרשימה, עם שמות וסמלים מעודכנים. מחלקה שחסרה בפריסה
// נוספת בסוף לפי סדר ברירת המחדל, ו"אחר" תמיד אחרונה
export const orderedDepartments = (custom = EMPTY, layout = EMPTY) => {
  const customList = Array.isArray(custom) ? custom : EMPTY;
  const layoutList = Array.isArray(layout) ? layout : EMPTY;
  let byLayout = departmentCache.get(customList);
  if (!byLayout) {
    byLayout = new WeakMap();
    departmentCache.set(customList, byLayout);
  }
  const hit = byLayout.get(layoutList);
  if (hit) return hit;

  const defaults = defaultDepartments(customList);
  const known = new Map(defaults.map(d => [d.key, d]));
  const overrides = new Map();
  [...layoutList]
    .filter(entry => entry && known.has(entry.key))
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .forEach(entry => {
      if (!overrides.has(entry.key)) overrides.set(entry.key, entry);
    });
  const placed = [...overrides.keys()].filter(key => key !== 'other');
  const rest = defaults
    .map(d => d.key)
    .filter(key => key !== 'other' && !overrides.has(key));
  const keys = [...placed, ...rest, 'other'];

  const result = keys.map((key, index) => {
    const base = known.get(key);
    const entry = overrides.get(key);
    return {
      ...base,
      name: entry?.name || base.name,
      icon: entry?.icon || base.icon || DEFAULT_ICON,
      order: index,
    };
  });
  byLayout.set(layoutList, result);
  return result;
};

const departmentMap = (custom, layout) => {
  const list = orderedDepartments(custom, layout);
  let map = mapCache.get(list);
  if (!map) {
    map = new Map(list.map(d => [d.key, d]));
    mapCache.set(list, map);
  }
  return map;
};

// המחלקה של מוצר: בחירה ידנית תקפה, אחרת אוטומטית. הפניה לא קיימת חוזרת לאוטומטי.
// מחזיר {key, name, color, icon, order} עם שמות, סמלים וסדר לפי פריסת הרשימה
export const resolveCategory = (
  item,
  customCategories = EMPTY,
  layout = EMPTY,
) => {
  const map = departmentMap(customCategories, layout);
  const value = item && item.category;
  if (value && map.has(value)) return map.get(value);
  return map.get(categorize(item && item.name));
};
