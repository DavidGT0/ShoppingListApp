/* global jest, describe, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { dark } from '../src/theme/palettes';
import MyListsScreen from '../src/screens/MyListsScreen/MyListsScreen';
import ShoppingListScreen from '../src/screens/ShoppingListScreen/ShoppingListScreen';
import SettingsScreen from '../src/screens/SettingsScreen/SettingsScreen';
import LoginScreen from '../src/screens/LoginScreen/LoginScreen';
import UndoBar from '../src/components/UndoBar/UndoBar';
import OfflineBanner from '../src/components/OfflineBanner/OfflineBanner';
import JoinListModal from '../src/components/JoinListModal/JoinListModal';
import ListActionsMenu from '../src/components/ListActionsMenu/ListActionsMenu';

jest.mock('react-native-draggable-flatlist', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  return {
    __esModule: true,
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
jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => {
  const R = require('react');
  return {
    __esModule: true,
    default: R.forwardRef(({ children }, _ref) => <>{children}</>),
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

const failures = (json, name) => {
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
  [].concat(json).forEach(n => visit(n, dark.background));
  return out;
};

const renderDark = async element => {
  await AsyncStorage.setItem('@theme_mode', 'dark');
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });
  await act(async () => {});
  return tree;
};

const nav = { navigate: jest.fn(), setOptions: jest.fn(), goBack: jest.fn() };
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
      const json = tree.toJSON();
      expect(json).not.toBeNull();
      if (name === 'ShoppingList') expect(JSON.stringify(json)).toContain('חלב');
      expect(failures(json, name)).toEqual([]);
    });
  });
});
