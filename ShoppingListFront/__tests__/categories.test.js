/* global test, expect, describe */
import {
  BUILTIN_CATEGORIES,
  categorize,
  resolveCategory,
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
