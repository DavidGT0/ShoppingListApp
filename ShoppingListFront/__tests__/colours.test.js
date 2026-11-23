/* global jest, describe, test, expect, beforeEach */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { light, dark } from '../src/theme/palettes';
import { stationTint, mixOver } from '../src/theme/tint';
import FocusCard from '../src/components/FocusCard/FocusCard';
import DepartmentRoute from '../src/components/DepartmentRoute/DepartmentRoute';
import { buildRoute } from '../src/components/DepartmentRoute/buildRoute';
import ShoppingListItem from '../src/components/ShoppingListItem/ShoppingListItem';
import ShoppingListScreen from '../src/screens/ShoppingListScreen/ShoppingListScreen';
import MyListsScreen from '../src/screens/MyListsScreen/MyListsScreen';
import { resolveCategory } from '../src/services/categories';

jest.mock('../src/hooks/useLiveRefresh', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('react-native-draggable-flatlist', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  const MockList = ({ data, renderItem }) =>
    ReactLib.createElement(
      View,
      null,
      data.map(item =>
        ReactLib.createElement(
          ReactLib.Fragment,
          { key: item.id },
          renderItem({ item, drag: () => {}, isActive: false }),
        ),
      ),
    );
  const MockContainer = ({ children }) =>
    ReactLib.createElement(View, null, children);
  return {
    __esModule: true,
    default: MockList,
    NestableDraggableFlatList: MockList,
    NestableScrollContainer: MockContainer,
  };
});
jest.mock('../src/services/api', () => ({
  getShoppingLists: jest.fn(async () => []),
  getShoppingList: jest.fn(async () => [
    { id: 1, name: 'חלב', amount: 1, purchased: false, position: 0 },
  ]),
  getListMembers: jest.fn(async () => []),
  getListCategories: jest.fn(async () => ({ custom: [], layout: [] })),
}));

const { act } = ReactTestRenderer;

const lum = hex => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const l = c.map(v =>
    v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const isHex = c => typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c);
const flat = n => StyleSheet.flatten(n.props.style) || {};

const render = async (element, mode = 'light') => {
  await AsyncStorage.setItem('@theme_mode', mode);
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });
  await act(async () => {});
  return tree;
};
const unmount = tree => act(async () => tree.unmount());

const gradients = tree => tree.root.findAllByType(LinearGradient);

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('palette', () => {
  test('gradient colours live in both palettes', () => {
    expect(light.headerGradient).toEqual(['#0F172A', '#1E6FE8']);
    expect(dark.headerGradient).toEqual(['#111A2E', '#14306A']);
    expect(light.focusGradient).toEqual(['#1E6FE8', '#1FC9A3']);
    expect(dark.focusGradient).toEqual(['#1E6FE8', '#1FC9A3']);
  });

  test('light background is the mockup #F4F7FB and its texts stay AA', () => {
    expect(light.background).toBe('#F4F7FB');
    [light.text.primary, light.text.secondary, light.primaryText].forEach(c => {
      expect(ratio(c, light.background)).toBeGreaterThanOrEqual(4.5);
      expect(ratio(c, light.surface)).toBeGreaterThanOrEqual(4.5);
    });
    // מוני המחלקות יושבים על borderLight
    expect(ratio(light.text.secondary, light.borderLight)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(dark.text.secondary, dark.borderLight)).toBeGreaterThanOrEqual(4.5);
  });

  test('white text passes on every point of both header gradients', () => {
    [...light.headerGradient, ...dark.headerGradient].forEach(c =>
      expect(ratio(light.text.inverse, c)).toBeGreaterThanOrEqual(4.5),
    );
  });
});

describe('gradient headers', () => {
  const headerOf = tree =>
    gradients(tree).find(g => g.props.testID === 'header_gradient');

  test.each(['light', 'dark'])(
    'the list screen header is the %s navy-to-blue gradient with rounded bottom corners',
    async mode => {
      const palette = mode === 'dark' ? dark : light;
      const tree = await render(
        <ShoppingListScreen
          route={{ params: { listId: 1, listName: 'רשימה' } }}
          navigation={{ goBack: jest.fn() }}
        />,
        mode,
      );
      try {
        const header = headerOf(tree);
        expect(header.props.colors).toEqual(palette.headerGradient);
        expect(header.props.useAngle).toBe(true);
        expect(header.props.angle).toBe(135);
        const style = flat(header);
        expect(style.borderBottomLeftRadius).toBe(32);
        expect(style.borderBottomRightRadius).toBe(32);
        expect(style.backgroundColor).toBeUndefined();
      } finally {
        await unmount(tree);
      }
    },
  );

  test('the lists screen header uses the same gradient', async () => {
    const tree = await render(
      <MyListsScreen navigation={{ navigate: jest.fn() }} />,
      'dark',
    );
    try {
      expect(headerOf(tree).props.colors).toEqual(dark.headerGradient);
    } finally {
      await unmount(tree);
    }
  });
});

const item = (id, name, extra = {}) => ({
  id,
  name,
  amount: 1,
  purchased: false,
  ...extra,
});
const ITEMS = [
  item(1, 'עגבניות', { purchased: true }),
  item(2, 'חלב', { note: '3%', added_by: 'dana' }),
  item(3, 'גבינה'),
  item(4, 'לחם'),
];
const plan = items =>
  buildRoute(items.map(i => ({ item: i, cat: resolveCategory(i) })));
const row = (r, { variant } = {}) => (
  <ShoppingListItem
    item={r}
    variant={variant}
    onTogglePurchased={jest.fn()}
    onEdit={jest.fn()}
    onDelete={jest.fn()}
    onUpdateAmount={jest.fn()}
    showAddedBy
    currentUsername="bob"
  />
);

describe('focus card gradient', () => {
  test.each(['light', 'dark'])(
    '%s: blue-to-teal top to bottom, all blue until measured, no stand-in bar',
    async mode => {
      const palette = mode === 'dark' ? dark : light;
      const station = plan(ITEMS).stations.find(s => s.key === 'dairy');
      const tree = await render(
        <FocusCard department={station} renderItem={row} />,
        mode,
      );
      try {
        const g = gradients(tree)[0];
        const [blue, teal] = palette.focusGradient;
        expect(g.props.colors).toEqual([blue, blue, teal]);
        // מעבר אנכי: לפני המדידה כולו כחול
        expect(g.props.start).toEqual({ x: 0.5, y: 0 });
        expect(g.props.end).toEqual({ x: 0.5, y: 1 });
        expect(g.props.locations).toEqual([0, 1, 1]);
        expect(tree.root.findAll(n => n.props.testID === 'focus_accent')).toHaveLength(0);
      } finally {
        await unmount(tree);
      }
    },
  );

  // כל טקסט בכרטיס יושב על משטח אטום משלו (הכותרת על הכחול, השורות על primaryDark,
  // התג על הטורקיז עם טקסט כהה), אף פעם לא ישירות על המעבר - כך הקצה הטורקיז
  // (לבן עליו 2.1:1) לא יכול להיות מאחורי טקסט
  test.each(['light', 'dark'])(
    '%s: no text sits directly on the gradient, and each passes AA on its surface',
    async mode => {
      const station = plan(ITEMS).stations.find(s => s.key === 'dairy');
      const tree = await render(
        <FocusCard department={station} renderItem={row} />,
        mode,
      );
      try {
        const g = gradients(tree)[0];
        const texts = g.findAll(
          n => n.type === 'Text' && isHex(flat(n).color),
        );
        expect(texts.length).toBeGreaterThan(3);
        texts.forEach(t => {
          let node = t.parent;
          let bg = null;
          while (node && node !== g) {
            if (typeof node.type === 'string' && isHex(flat(node).backgroundColor)) {
              bg = flat(node).backgroundColor;
              break;
            }
            node = node.parent;
          }
          const label = [].concat(t.props.children).join('');
          expect({ label, bg: bg !== null }).toEqual({ label, bg: true });
          expect(ratio(flat(t).color, bg)).toBeGreaterThanOrEqual(4.5);
        });
      } finally {
        await unmount(tree);
      }
    },
  );

  // בלי תפר: כל גובה שורת הכותרת (לכל הרוחב) כחול טהור, והטורקיז מתחיל רק מתחתיה,
  // כך שהמשטח הכחול של הכותרת יושב על כחול זהה ואין לו קצה נראה
  test('after layout the card stays pure blue across the full title row height', async () => {
    const station = plan(ITEMS).stations.find(s => s.key === 'dairy');
    const tree = await render(<FocusCard department={station} renderItem={row} />);
    try {
      const g = () => gradients(tree)[0];
      const titleRow = tree.root.findAll(
        n => n.props.testID === 'focus_card_title_row' && typeof n.type === 'string',
      )[0];
      await act(async () =>
        g().props.onLayout({ nativeEvent: { layout: { x: 0, y: 0, width: 290, height: 200 } } }),
      );
      await act(async () =>
        titleRow.props.onLayout({
          nativeEvent: { layout: { x: 10, y: 12, width: 270, height: 60 } },
        }),
      );
      const [, hold, end] = g().props.locations;
      expect(end).toBe(1);
      // תחתית השורה ב-72 מתוך 200, ועוד מרווח קטן
      expect(hold * 200).toBeGreaterThanOrEqual(72);
      expect(hold).toBeLessThan(0.5);
      // שורת כותרת גבוהה מהכרטיס (מדידה חלקית) - נשאר כחול, לא חורג מ-1
      await act(async () =>
        titleRow.props.onLayout({
          nativeEvent: { layout: { x: 10, y: 12, width: 270, height: 400 } },
        }),
      );
      expect(g().props.locations).toEqual([0, 1, 1]);
    } finally {
      await unmount(tree);
    }
  });

  test('the title block is painted with the blue end of the gradient', async () => {
    const station = plan(ITEMS).stations.find(s => s.key === 'dairy');
    const tree = await render(<FocusCard department={station} renderItem={row} />);
    try {
      const title = tree.root.findAll(
        n => n.props.testID === 'focus_card_title' && typeof n.type === 'string',
      )[0];
      expect(flat(title).backgroundColor).toBe(light.focusGradient[0]);
    } finally {
      await unmount(tree);
    }
  });

  test('the done card is teal with dark text (AA)', async () => {
    const tree = await render(<FocusCard department={null} />, 'dark');
    try {
      const done = tree.root.findAll(
        n => n.props.testID === 'focus_card_done' && typeof n.type === 'string',
      )[0];
      expect(flat(done).backgroundColor).toBe(dark.secondary);
      const text = done.findAll(n => n.type === 'Text')[0];
      expect(flat(text).color).toBe(dark.navy);
      expect(ratio(dark.navy, dark.secondary)).toBeGreaterThanOrEqual(4.5);
    } finally {
      await unmount(tree);
    }
  });
});

describe('route colours', () => {
  const pinBg = (tree, key) =>
    flat(
      tree.root.findAll(
        n => n.props.testID === `department_pin_${key}` && typeof n.type === 'string',
      )[0],
    ).backgroundColor;

  test('pins are pale pastel tints in light, deep tints in dark', async () => {
    expect(stationTint('#4CAF50', light, false)).toBe(
      mixOver('#4CAF50', 0.18, light.surface),
    );
    expect(stationTint('#4CAF50', dark, true)).toBe(
      mixOver('#4CAF50', 0.35, dark.background),
    );
    const tree = await render(<DepartmentRoute plan={plan(ITEMS)} renderItem={row} />);
    try {
      expect(pinBg(tree, 'bakery')).toBe(stationTint('#D4A056', light, false));
      // פסטל: בהיר מאוד, כמו בעיצוב
      expect(lum(pinBg(tree, 'bakery'))).toBeGreaterThan(0.8);
    } finally {
      await unmount(tree);
    }
  });

  test.each(['light', 'dark'])(
    '%s: count chips are flat (no border) on borderLight, the line uses routeLine',
    async mode => {
      const palette = mode === 'dark' ? dark : light;
      const tree = await render(
        <DepartmentRoute plan={plan(ITEMS)} renderItem={row} />,
        mode,
      );
      try {
        const chip = tree.root.findAll(
          n => n.props.testID === 'department_count_bakery' && typeof n.type === 'string',
        )[0];
        expect(flat(chip).backgroundColor).toBe(palette.borderLight);
        expect(flat(chip).borderWidth || 0).toBe(0);
        const line = tree.root.findAll(
          n => n.props.testID === 'route_line' && typeof n.type === 'string',
        )[0];
        expect(flat(line).borderColor).toBe(palette.routeLine);
      } finally {
        await unmount(tree);
      }
    },
  );

  test.each(['light', 'dark'])(
    '%s: item rows are surface cards with a soft shadow and no border',
    async mode => {
      const palette = mode === 'dark' ? dark : light;
      const tree = await render(row(item(9, 'אורז')), mode);
      try {
        const card = flat({ props: { style: tree.toJSON().props.style } });
        expect(card.backgroundColor).toBe(palette.surface);
        expect(card.borderWidth || 0).toBe(0);
        expect(card.elevation).toBeLessThanOrEqual(3);
        expect(card.shadowOpacity).toBeLessThanOrEqual(0.1);
        expect(card.borderRadius).toBeLessThanOrEqual(16);
      } finally {
        await unmount(tree);
      }
    },
  );
});

describe('jest mock', () => {
  test('LinearGradient renders a view that keeps its props', async () => {
    const tree = await render(
      <LinearGradient colors={['#000000', '#FFFFFF']} testID="g">
        <Text>x</Text>
      </LinearGradient>,
    );
    try {
      const host = tree.root.findAll(
        n => n.props.testID === 'g' && typeof n.type === 'string',
      )[0];
      expect(host.props.colors).toEqual(['#000000', '#FFFFFF']);
      expect(host.findAllByType(Text)).toHaveLength(1);
    } finally {
      await unmount(tree);
    }
  });
});
