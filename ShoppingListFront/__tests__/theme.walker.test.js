/* global jest, describe, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { View as HeaderBackground } from 'react-native';
import { dark, light } from '../src/theme/palettes';
import MyListsScreen from '../src/screens/MyListsScreen/MyListsScreen';
import ShoppingListScreen from '../src/screens/ShoppingListScreen/ShoppingListScreen';
import SettingsScreen from '../src/screens/SettingsScreen/SettingsScreen';
import LoginScreen from '../src/screens/LoginScreen/LoginScreen';
import UndoBar from '../src/components/UndoBar/UndoBar';
import OfflineBanner from '../src/components/OfflineBanner/OfflineBanner';
import JoinListModal from '../src/components/JoinListModal/JoinListModal';
import ListActionsMenu from '../src/components/ListActionsMenu/ListActionsMenu';
import ShoppingListItem from '../src/components/ShoppingListItem/ShoppingListItem';
import DepartmentRoute from '../src/components/DepartmentRoute/DepartmentRoute';
import { buildRoute } from '../src/components/DepartmentRoute/buildRoute';
import FocusCard from '../src/components/FocusCard/FocusCard';
import ProgressRing from '../src/components/ProgressRing/ProgressRing';
import { resolveCategory } from '../src/services/categories';

jest.mock('react-native-draggable-flatlist', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  // מצב ידני: רשימה נגררת מקוננת בתוך מיכל גלילה (עם המשיכה לריענון)
  const MockNestableScrollContainer = ({ children, ...rest }) => {
    global.__scrollProps = rest;
    return ReactLib.createElement(View, { testID: 'nestable_scroll' }, children);
  };
  return {
    __esModule: true,
    NestableScrollContainer: MockNestableScrollContainer,
    // הרשימה המקוננת זהה למוק של הרשימה הרגילה
    get NestableDraggableFlatList() {
      return this.default;
    },
    default: ({ data, renderItem, ListHeaderComponent }) =>
      ReactLib.createElement(
        View,
        null,
        ListHeaderComponent,
        data.map(item =>
          ReactLib.createElement(
            ReactLib.Fragment,
            { key: item.id },
            renderItem({ item, drag: () => {}, isActive: false }),
          ),
        ),
      ),
  };
});
jest.mock('../src/hooks/useLiveRefresh', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../src/services/api', () => ({
  getShoppingLists: jest.fn(async () => [
    { id: 1, name: 'שלי', owner_id: 1, is_owner: true },
  ]),
  getShoppingList: jest.fn(async () => [
    { id: 1, name: 'חלב', amount: 1, purchased: false, position: 0 },
    { id: 2, name: 'לחם', amount: 1, purchased: true, position: 1 },
  ]),
  getListMembers: jest.fn(async () => []),
}));
jest.mock('../src/services/auth', () => ({
  getCurrentUser: jest.fn(async () => ({ username: 'bob', email: 'b@example.com' })),
  login: jest.fn(),
  register: jest.fn(),
  requestPasswordReset: jest.fn(),
}));

const { act } = ReactTestRenderer;

const lum = hex => {
  const c = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const l = c.map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const isHex = c => typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c);
const up = c => c.toUpperCase();

// זוגות ידועים שנדחו בכוונה (ראו R6-final-review M11): לבן על אדום/ירוק, טקסט מושבת
const ALLOWED = new Set(
  [
    [dark.text.inverse, dark.danger],
    [dark.text.inverse, dark.success],
    [dark.text.disabled, dark.surface],
    [dark.text.disabled, dark.background],
    [dark.text.disabled, dark.raised],
    [dark.text.inverse, dark.warning],
  ].map(([a, b]) => `${up(a)}|${up(b)}`),
);

const failures = (json, name, base = dark.background) => {
  const out = [];
  const visit = (n, bg) => {
    if (!n || typeof n === 'string') return;
    const style = StyleSheet.flatten(n.props && n.props.style) || {};
    const ownBg = isHex(style.backgroundColor) ? style.backgroundColor : bg;
    if (n.type === 'Text' && isHex(style.color)) {
      const r = ratio(style.color, ownBg);
      if (r < 4.5 && !ALLOWED.has(`${up(style.color)}|${up(ownBg)}`)) {
        out.push(`${name}: ${style.color} on ${ownBg} = ${r.toFixed(2)}`);
      }
    }
    (n.children || []).forEach(c => visit(c, ownBg));
  };
  [].concat(json).forEach(n => visit(n, base));
  return out;
};

const renderDark = async (element, mode = 'dark') => {
  await AsyncStorage.setItem('@theme_mode', mode);
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });
  await act(async () => {});
  return tree;
};

const nav = { navigate: jest.fn(), setOptions: jest.fn(), goBack: jest.fn() };

// מסלול מחלקות עם מחלקה שהושלמה, כרטיס "עכשיו במחלקה" ושורות רגילות
const routeItems = [
  { id: 1, name: 'עגבניות', amount: 1, purchased: true },
  { id: 2, name: 'חלב', amount: 2, unit: 'ליטר', note: '3%', purchased: false },
  { id: 3, name: 'ביצים', amount: 1, purchased: true },
  { id: 4, name: 'לחם', amount: 1, purchased: false, added_by: 'dana' },
  { id: 5, name: 'שמפו', amount: 1, purchased: false },
];
const routeRow = (row, { variant } = {}) => (
  <ShoppingListItem
    item={row}
    variant={variant}
    onTogglePurchased={jest.fn()}
    onEdit={jest.fn()}
    onDelete={jest.fn()}
    onUpdateAmount={jest.fn()}
    showAddedBy
    currentUsername="bob"
  />
);
const routePlan = items =>
  buildRoute(items.map(i => ({ item: i, cat: resolveCategory(i) })));
const routeCases = {
  DepartmentRoute: (
    <DepartmentRoute plan={routePlan(routeItems)} renderItem={routeRow} />
  ),
  DepartmentRouteAllDone: (
    <DepartmentRoute
      plan={routePlan(routeItems.map(i => ({ ...i, purchased: true })))}
      renderItem={routeRow}
    />
  ),
  FocusCardDone: <FocusCard department={null} />,
};
// הטבעת יושבת על רקע הכותרת (הצבע הראשי בשתי הערכות)
const ringCase = palette => (
  <HeaderBackground style={{ backgroundColor: palette.primary }}>
    <ProgressRing done={3} total={12} />
  </HeaderBackground>
);
const cases = {
  MyLists: <MyListsScreen navigation={nav} />,
  ShoppingList: (
    <ShoppingListScreen
      route={{ params: { listId: 1, listName: 'רשימה' } }}
      navigation={nav}
    />
  ),
  Settings: <SettingsScreen navigation={nav} onLogout={jest.fn()} />,
  Login: <LoginScreen onLoginSuccess={jest.fn()} />,
  UndoBar: <UndoBar visible message="המוצר נמחק" onUndo={jest.fn()} />,
  OfflineBanner: <OfflineBanner visible />,
  JoinListModal: (
    <JoinListModal visible onClose={jest.fn()} onJoined={jest.fn()} />
  ),
  ...routeCases,
  ProgressRing: ringCase(dark),
  ListActionsMenu: (
    <ListActionsMenu
      visible
      list={{ id: 1, name: 'שלי', is_owner: true }}
      onClose={jest.fn()}
      onRename={jest.fn()}
      onDuplicate={jest.fn()}
      onShareText={jest.fn()}
      onDelete={jest.fn()}
    />
  ),
};

describe('dark mode contrast walker', () => {
  Object.entries(cases).forEach(([name, el]) => {
    test(`${name}: every text meets 4.5:1 on its background`, async () => {
      const tree = await renderDark(el);
      try {
        const json = tree.toJSON();
        expect(json).not.toBeNull();
        if (name === 'ShoppingList') expect(JSON.stringify(json)).toContain('חלב');
        expect(failures(json, name)).toEqual([]);
      } finally {
        // פירוק בתוך act כדי שאנימציות של השורות לא ימשיכו לרוץ אחרי הבדיקה
        await act(async () => tree.unmount());
      }
    });
  });
});

// גם בערכה הבהירה: הטקסט של המסלול, הכרטיס והטבעת עומד ב-AA
describe('light mode contrast walker: route, focus card and ring', () => {
  const lightCases = { ...routeCases, ProgressRing: ringCase(light) };
  Object.entries(lightCases).forEach(([name, el]) => {
    test(`${name}: every text meets 4.5:1 on its background`, async () => {
      const tree = await renderDark(el, 'light');
      try {
        expect(failures(tree.toJSON(), name, light.background)).toEqual([]);
      } finally {
        await act(async () => tree.unmount());
      }
    });
  });
});
