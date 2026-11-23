/* global test, expect, describe */
import {
  BUILTIN_CATEGORIES,
  categorize,
  resolveCategory,
  orderedDepartments,
  normalizeCategories,
} from '../src/services/categories';

const EXAMPLES = {
  produce: ['עגבניות', 'מלפפון', 'בננות', 'תפוחי אדמה', 'הלימון'],
  dairy: ['חלב 3%', 'קוטג', 'גבינה צהובה', 'ביצים', 'יוגורט'],
  bakery: ['לחם', 'פיתות', 'חלה', 'בגט', 'לחמניות'],
  meat: ['חזה עוף', 'בשר טחון', 'סלמון', 'שניצל', 'דגים'],
  pantry: ['אורז', 'פסטה', 'קמח', 'שמן זית', 'חומוס'],
  frozen: ['גלידה', 'ירקות קפואים', 'פיצה קפואה', 'שלגון', 'נאגטס'],
  drinks: ['קולה', 'מיץ תפוזים', 'בירה', 'יין', 'סודה'],
  snacks: ['במבה', 'שוקולד', 'חטיף', 'פופקורן', 'וופל'],
  cleaning: ['סבון כלים', 'נייר טואלט', 'אקונומיקה', 'שקיות זבל', 'ספוג'],
  care: ['שמפו', 'משחת שיניים', 'חיתולים', 'דאודורנט', 'קרם ידיים'],
};

describe('categorize', () => {
  Object.entries(EXAMPLES).forEach(([key, names]) => {
    test(`recognizes ${key}`, () => {
      names.forEach(name =>
        expect([name, categorize(name)]).toEqual([name, key]),
      );
    });
  });

  test('the longest keyword match wins', () => {
    expect(categorize('שמן זית')).toBe('pantry');
    expect(categorize('בורקס קפוא')).toBe('frozen');
    expect(categorize('נייר אפייה')).toBe('cleaning');
    expect(categorize('שמנת חמוצה')).toBe('dairy');
  });

  test('short keyword needs a whole word', () => {
    expect(categorize('דגנים')).not.toBe('meat');
    expect(categorize('דג')).toBe('meat');
  });

  test('plurals of keywords that end in a final letter', () => {
    expect(categorize('מלפפונים')).toBe('produce');
    expect(categorize('לימונים')).toBe('produce');
    expect(categorize('שזיפים')).toBe('produce');
    expect(categorize('עופות')).toBe('meat');
    expect(categorize('מיצים')).toBe('drinks');
  });

  test('a frozen word wins over the first-word bonus', () => {
    expect(categorize('ברוקולי קפוא')).toBe('frozen');
    expect(categorize('תירס קפוא')).toBe('frozen');
  });

  test('construct form and newly added words', () => {
    expect(categorize('ביצי חופש')).toBe('dairy');
    expect(categorize('פיצה')).toBe('frozen');
    expect(categorize('זיתים')).toBe('pantry');
    expect(categorize('אפונה')).toBe('pantry');
    expect(categorize('סבון ידיים')).toBe('care');
    expect(categorize('מגבונים')).toBe('care');
    expect(categorize('טישו')).toBe('care');
  });

  test('repeated calls give the same answer (memoized)', () => {
    expect(categorize('חלב')).toBe('dairy');
    expect(categorize('חלב')).toBe('dairy');
    expect(categorize('  חלב ')).toBe('dairy');
  });

  test('defaults to other', () => {
    expect(categorize('משהו לא מוכר')).toBe('other');
    expect(categorize('')).toBe('other');
    expect(categorize(null)).toBe('other');
  });
});

describe('resolveCategory', () => {
  const customs = [
    { id: 4, name: 'מתנות', color: '#111111' },
    { id: 9, name: 'חיות', color: '#222222' },
  ];

  test('has the 11 built-ins in aisle order', () => {
    expect(BUILTIN_CATEGORIES.map(c => c.key)).toEqual([
      'produce',
      'dairy',
      'bakery',
      'meat',
      'pantry',
      'frozen',
      'drinks',
      'snacks',
      'cleaning',
      'care',
      'other',
    ]);
  });

  test('uses the automatic category when none is set', () => {
    const r = resolveCategory({ name: 'חלב', category: null }, customs);
    expect(r.key).toBe('dairy');
    expect(r.name).toBe('מוצרי חלב וביצים');
    expect(r.color).toBeTruthy();
  });

  test('manual built-in override wins', () => {
    expect(
      resolveCategory({ name: 'חלב', category: 'snacks' }, customs).key,
    ).toBe('snacks');
  });

  test('custom override resolves to the custom category', () => {
    const r = resolveCategory({ name: 'חלב', category: 'custom:9' }, customs);
    expect(r).toMatchObject({
      key: 'custom:9',
      name: 'חיות',
      color: '#222222',
    });
  });

  test('a dangling custom reference falls back to automatic', () => {
    expect(
      resolveCategory({ name: 'חלב', category: 'custom:77' }, customs).key,
    ).toBe('dairy');
    expect(
      resolveCategory({ name: 'חלב', category: 'bogus' }, customs).key,
    ).toBe('dairy');
    expect(resolveCategory({ name: 'חלב', category: 'custom:4' }).key).toBe(
      'dairy',
    );
  });

  test('order: built-ins, then customs in creation order, then other last', () => {
    const order = key =>
      resolveCategory({ name: 'x', category: key }, customs).order;
    expect(order('produce')).toBeLessThan(order('care'));
    expect(order('care')).toBeLessThan(order('custom:4'));
    expect(order('custom:4')).toBeLessThan(order('custom:9'));
    expect(order('custom:9')).toBeLessThan(order('other'));
  });
});

describe('department layout', () => {
  const customs = [
    { id: 4, name: 'מתנות', color: '#111111', icon: '🎁' },
    { id: 9, name: 'חיות', color: '#222222' },
  ];
  const layout = [
    { key: 'custom:9', name: 'חיות מחמד', icon: '🐶', position: 0 },
    { key: 'dairy', name: 'חלבי', icon: '🧀', position: 1 },
    { key: 'produce', name: null, icon: null, position: 2 },
    { key: 'other', name: 'שונות', icon: null, position: 3 },
  ];

  test('every built-in has a default icon', () => {
    BUILTIN_CATEGORIES.forEach(c => expect(typeof c.icon).toBe('string'));
    expect(BUILTIN_CATEGORIES.find(c => c.key === 'produce').icon).toBe('🥦');
  });

  test('a missing layout falls back to the defaults', () => {
    const list = orderedDepartments(customs);
    expect(list.map(d => d.key)).toEqual([
      ...BUILTIN_CATEGORIES.filter(c => c.key !== 'other').map(c => c.key),
      'custom:4',
      'custom:9',
      'other',
    ]);
    expect(list.find(d => d.key === 'custom:4').icon).toBe('🎁');
    expect(list.find(d => d.key === 'custom:9').icon).toBe('🛒');
    expect(orderedDepartments(customs, [])).toEqual(list);
    expect(orderedDepartments(undefined, null).length).toBe(11);
  });

  test('overrides apply to name, icon and order', () => {
    const list = orderedDepartments(customs, layout);
    expect(list.slice(0, 3).map(d => d.key)).toEqual([
      'custom:9',
      'dairy',
      'produce',
    ]);
    expect(list[0]).toMatchObject({ name: 'חיות מחמד', icon: '🐶' });
    expect(list[1]).toMatchObject({ name: 'חלבי', icon: '🧀' });
    expect(list[2]).toMatchObject({ name: 'פירות וירקות', icon: '🥦' });
    // מחלקות שחסרות בפריסה נוספות בסוף לפי ברירת המחדל, ואחר אחרונה
    expect(list[3].key).toBe('bakery');
    expect(list[list.length - 1]).toMatchObject({ key: 'other', name: 'שונות' });
    expect(list.map(d => d.order)).toEqual(list.map((d, i) => i));
  });

  test('other stays last and unknown keys are ignored', () => {
    const list = orderedDepartments(customs, [
      { key: 'other', position: 0 },
      { key: 'gone', position: 1 },
      { key: 'meat', position: 2 },
    ]);
    expect(list[0].key).toBe('meat');
    expect(list[list.length - 1].key).toBe('other');
    expect(list.some(d => d.key === 'gone')).toBe(false);
  });

  test('resolveCategory uses the overrides', () => {
    const r = resolveCategory({ name: 'חלב', category: null }, customs, layout);
    expect(r).toMatchObject({ key: 'dairy', name: 'חלבי', icon: '🧀', order: 1 });
    const c = resolveCategory({ name: 'x', category: 'custom:9' }, customs, layout);
    expect(c).toMatchObject({ name: 'חיות מחמד', icon: '🐶', order: 0 });
    const plain = resolveCategory({ name: 'חלב', category: null }, customs);
    expect(plain).toMatchObject({ key: 'dairy', name: 'מוצרי חלב וביצים' });
    expect(plain.icon).toBe('🥛');
  });

  test('normalizeCategories accepts the old array and the new shape', () => {
    expect(normalizeCategories(customs)).toEqual({ custom: customs, layout: [] });
    expect(normalizeCategories({ custom: customs, layout })).toEqual({
      custom: customs,
      layout,
    });
    expect(normalizeCategories(null)).toEqual({ custom: [], layout: [] });
    expect(normalizeCategories({})).toEqual({ custom: [], layout: [] });
  });
});
