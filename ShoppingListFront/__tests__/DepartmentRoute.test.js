/* global describe, test, expect, beforeEach */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DepartmentRoute from '../src/components/DepartmentRoute/DepartmentRoute';
import { buildRoute } from '../src/components/DepartmentRoute/buildRoute';
import FocusCard from '../src/components/FocusCard/FocusCard';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { light, dark } from '../src/theme/palettes';
import { stationTint } from '../src/theme/tint';
import { resolveCategory } from '../src/services/categories';

const { act } = ReactTestRenderer;

const item = (id, name, extra = {}) => ({
  id,
  name,
  amount: 1,
  purchased: false,
  position: id,
  category: null,
  ...extra,
});

const entriesOf = (items, custom = [], layout = []) =>
  items.map(i => ({ item: i, cat: resolveCategory(i, custom, layout) }));

// עגבניות, מלפפון - פירות וירקות (שניהם נקנו); חלב, ביצים, גבינה - חלב (אחד נקנה);
// לחם - מאפים
const ITEMS = [
  item(1, 'עגבניות', { purchased: true }),
  item(2, 'מלפפון', { purchased: true }),
  item(3, 'חלב'),
  item(4, 'ביצים', { purchased: true }),
  item(5, 'גבינה'),
  item(6, 'לחם'),
];

const renderItem = (row, { variant } = {}) => (
  <Text testID={`row_${row.id}`} variant={variant || 'default'}>
    {row.name}
  </Text>
);

const render = async (element, mode = 'light') => {
  await AsyncStorage.setItem('@theme_mode', mode);
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });
  await act(async () => {});
  return tree;
};

const host = (root, id) =>
  root.findAll(n => n.props.testID === id && typeof n.type === 'string');
const one = (root, id) => {
  const found = host(root, id);
  if (!found.length) throw new Error(`missing ${id}`);
  return found[0];
};
// הטקסט של צומת: רק מחרוזות ומספרים מתוך רכיבי Text (כולל הצומת עצמו)
const textOf = node =>
  node
    .findAll(n => n.type === 'Text')
    .map(n =>
      []
        .concat(n.props.children)
        .filter(c => typeof c === 'string' || typeof c === 'number')
        .join(''),
    )
    .join('');
const headerKeys = tree =>
  tree.root
    .findAll(
      n =>
        typeof n.type === 'string' &&
        typeof n.props.testID === 'string' &&
        n.props.testID.startsWith('category_header_'),
    )
    .map(n => n.props.testID.replace('category_header_', ''));

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('buildRoute', () => {
  test('only departments with items, in layout order', () => {
    const plan = buildRoute(entriesOf(ITEMS));
    expect(plan.stations.map(s => s.key)).toEqual(['produce', 'dairy', 'bakery']);
  });

  test('counters count bought items, rows hold only unbought ones', () => {
    const plan = buildRoute(entriesOf(ITEMS));
    const dairy = plan.stations.find(s => s.key === 'dairy');
    expect(dairy.bought).toBe(1);
    expect(dairy.total).toBe(3);
    expect(dairy.items.map(i => i.id)).toEqual([3, 5]);
    expect(dairy.complete).toBe(false);
    const produce = plan.stations.find(s => s.key === 'produce');
    expect(produce).toMatchObject({ bought: 2, total: 2, complete: true });
    expect(produce.items).toEqual([]);
  });

  test('the focus is the first department in order that still has unbought items', () => {
    expect(buildRoute(entriesOf(ITEMS)).focusKey).toBe('dairy');
  });

  test('a saved layout changes the order and so the focus', () => {
    const layout = [
      { key: 'bakery', name: 'לחמים', icon: '🍞', position: 0 },
      { key: 'dairy', name: null, icon: null, position: 1 },
    ];
    const plan = buildRoute(entriesOf(ITEMS, [], layout));
    expect(plan.stations.map(s => s.key)).toEqual(['bakery', 'dairy', 'produce']);
    expect(plan.focusKey).toBe('bakery');
    expect(plan.stations[0]).toMatchObject({ name: 'לחמים', icon: '🍞' });
  });

  test('everything bought: no focus, all done', () => {
    const plan = buildRoute(
      entriesOf(ITEMS.map(i => ({ ...i, purchased: true }))),
    );
    expect(plan.focusKey).toBeNull();
    expect(plan.allDone).toBe(true);
    expect(plan.stations.every(s => s.complete)).toBe(true);
  });

  test('an empty list has no stations and is not "all done"', () => {
    const plan = buildRoute([]);
    expect(plan.stations).toEqual([]);
    expect(plan.focusKey).toBeNull();
    expect(plan.allDone).toBe(false);
  });
});

describe('DepartmentRoute', () => {
  const mount = (items = ITEMS, mode) =>
    render(
      <DepartmentRoute
        plan={buildRoute(entriesOf(items))}
        renderItem={renderItem}
      />,
      mode,
    );

  test('shows a station per department with items, in order', async () => {
    const tree = await mount();
    expect(headerKeys(tree)).toEqual(['produce', 'dairy', 'bakery']);
  });

  test('each department shows bought/total and a Hebrew header label', async () => {
    const tree = await mount();
    expect(textOf(one(tree.root, 'department_count_dairy'))).toBe('1/3');
    expect(textOf(one(tree.root, 'department_count_bakery'))).toBe('0/1');
    const header = one(tree.root, 'category_header_dairy');
    expect(header.props.accessibilityRole).toBe('header');
    expect(header.props.accessible).toBe(true);
    expect(header.props.accessibilityLabel).toBe(
      'מוצרי חלב וביצים, נקנו 1 מתוך 3',
    );
  });

  test('a completed department collapses to one line with ✓ and no rows', async () => {
    const tree = await mount();
    expect(host(tree.root, 'department_done_produce')).toHaveLength(1);
    expect(textOf(one(tree.root, 'department_count_produce'))).toBe('2/2 ✓');
    expect(host(tree.root, 'row_1')).toHaveLength(0);
    expect(host(tree.root, 'row_2')).toHaveLength(0);
    expect(host(tree.root, 'department_done_dairy')).toHaveLength(0);
  });

  test('the focus card replaces the rows of its department', async () => {
    const tree = await mount();
    const card = one(tree.root, 'focus_card');
    expect(host(card, 'row_3')).toHaveLength(1);
    expect(host(card, 'row_5')).toHaveLength(1);
    // אין כפילות: השורות של המחלקה מופיעות רק בכרטיס
    expect(host(tree.root, 'row_3')).toHaveLength(1);
    expect(one(card, 'row_3').props.variant).toBe('focus');
    // מחלקה אחרת מקבלת שורות רגילות מחוץ לכרטיס
    expect(host(card, 'row_6')).toHaveLength(0);
    expect(one(tree.root, 'row_6').props.variant).toBe('route');
  });

  test('the focus department keeps its highlighted pin row above the card', async () => {
    const tree = await mount();
    const station = one(tree.root, 'department_dairy');
    const ids = station
      .findAll(n => typeof n.type === 'string' && n.props.testID)
      .map(n => n.props.testID);
    expect(ids.indexOf('category_header_dairy')).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf('department_pin_dairy')).toBeGreaterThan(
      ids.indexOf('category_header_dairy'),
    );
    expect(ids.indexOf('focus_card')).toBeGreaterThan(
      ids.indexOf('department_pin_dairy'),
    );
  });

  test('the focus card is announced as now in the department', async () => {
    const tree = await mount();
    const title = one(tree.root, 'focus_card_title');
    expect(title.props.accessible).toBe(true);
    expect(title.props.accessibilityRole).toBe('header');
    expect(title.props.accessibilityLabel).toBe('עכשיו במחלקה מוצרי חלב וביצים');
    expect(textOf(title)).toContain('עכשיו במחלקה');
    expect(textOf(title)).toContain('מוצרי חלב וביצים');
  });

  test('when everything is bought the done card replaces the focus card', async () => {
    const tree = await mount(ITEMS.map(i => ({ ...i, purchased: true })));
    expect(host(tree.root, 'focus_card')).toHaveLength(0);
    expect(textOf(one(tree.root, 'focus_card_done'))).toBe('הכל בעגלה 🎉');
    expect(headerKeys(tree)).toEqual(['produce', 'dairy', 'bakery']);
  });

  test('an empty list renders no route', async () => {
    const tree = await mount([]);
    expect(host(tree.root, 'department_route')).toHaveLength(0);
    expect(host(tree.root, 'focus_card_done')).toHaveLength(0);
  });

  const pinBg = (tree, key) =>
    StyleSheet.flatten(one(tree.root, `department_pin_${key}`).props.style)
      .backgroundColor;

  test('station pins: a 20% tint of the department colour in light mode', async () => {
    const tree = await mount();
    expect(pinBg(tree, 'bakery')).toBe(stationTint('#D4A056', light, false));
    expect(pinBg(tree, 'produce')).toBe(stationTint('#4CAF50', light, false));
    // המחלקה הנוכחית מודגשת בצבע הראשי
    expect(pinBg(tree, 'dairy')).toBe(light.primary);
    expect(textOf(one(tree.root, 'department_pin_bakery'))).toBe('🥖');
  });

  test('station pins: a 35% tint in dark mode', async () => {
    const tree = await mount(ITEMS, 'dark');
    expect(pinBg(tree, 'bakery')).toBe(stationTint('#D4A056', dark, true));
    expect(pinBg(tree, 'bakery')).not.toBe(stationTint('#D4A056', light, false));
  });
});

describe('FocusCard', () => {
  test('large rows go through renderItem with the focus variant', async () => {
    const station = buildRoute(entriesOf(ITEMS)).stations[1];
    const tree = await render(
      <FocusCard department={station} renderItem={renderItem} />,
    );
    expect(
      host(tree.root, 'focus_card')[0]
        .findAll(n => typeof n.type === 'string' && n.props.variant === 'focus')
        .map(n => n.props.testID),
    ).toEqual(['row_3', 'row_5']);
  });

  test('without a department it is the done card', async () => {
    const tree = await render(<FocusCard department={null} />);
    const done = one(tree.root, 'focus_card_done');
    expect(done.props.accessible).toBe(true);
    expect(done.props.accessibilityLabel).toBe('הכל בעגלה 🎉');
  });
});
