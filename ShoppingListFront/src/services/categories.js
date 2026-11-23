// מחלקות מוצרים: מילון אוטומטי בעברית + מחלקות מותאמות של הרשימה.
// הסדר ברשימה הוא סדר המעברים בסופר.

export const BUILTIN_CATEGORIES = [
  { key: 'produce', name: 'פירות וירקות', color: '#4CAF50' },
  { key: 'dairy', name: 'מוצרי חלב וביצים', color: '#64B5F6' },
  { key: 'bakery', name: 'מאפים ולחם', color: '#D4A056' },
  { key: 'meat', name: 'בשר ודגים', color: '#E57373' },
  { key: 'pantry', name: 'יבשים ושימורים', color: '#A1887F' },
  { key: 'frozen', name: 'קפואים', color: '#4DD0E1' },
  { key: 'drinks', name: 'משקאות', color: '#7986CB' },
  { key: 'snacks', name: 'חטיפים ומתוקים', color: '#FF8A65' },
  { key: 'cleaning', name: 'ניקיון ובית', color: '#26A69A' },
  { key: 'care', name: 'טיפוח ותינוקות', color: '#BA68C8' },
  { key: 'other', name: 'אחר', color: '#9E9E9E' },
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

const OTHER_ORDER = 1000;
const CUSTOM_ORDER_BASE = 100;

const builtinByKey = Object.fromEntries(
  BUILTIN_CATEGORIES.map((c, index) => [
    c.key,
    { ...c, order: c.key === 'other' ? OTHER_ORDER : index },
  ]),
);

export const customKey = id => `custom:${id}`;

// המחלקה של מוצר: בחירה ידנית תקפה, אחרת אוטומטית. הפניה לא קיימת חוזרת לאוטומטי
export const resolveCategory = (item, customCategories = []) => {
  const value = item && item.category;
  if (value) {
    if (builtinByKey[value]) return builtinByKey[value];
    const index = customCategories.findIndex(c => customKey(c.id) === value);
    if (index !== -1) {
      const custom = customCategories[index];
      return {
        key: value,
        name: custom.name,
        color: custom.color,
        order: CUSTOM_ORDER_BASE + index,
      };
    }
  }
  return builtinByKey[categorize(item && item.name)];
};
