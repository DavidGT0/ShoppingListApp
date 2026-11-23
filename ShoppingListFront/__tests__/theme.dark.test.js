/* global jest, describe, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../src/theme/ThemeContext';
import MyListsScreen from '../src/screens/MyListsScreen/MyListsScreen';
import ShoppingListScreen from '../src/screens/ShoppingListScreen/ShoppingListScreen';
import SettingsScreen from '../src/screens/SettingsScreen/SettingsScreen';
import OfflineBanner from '../src/components/OfflineBanner/OfflineBanner';
import { dark } from '../src/theme/palettes';
import LoginScreen from '../src/screens/LoginScreen/LoginScreen';

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
  getShoppingLists: jest.fn(async () => []),
  getShoppingList: jest.fn(async () => ({
    id: 1,
    name: 'רשימה',
    items: [],
    owner_id: 1,
  })),
  getListMembers: jest.fn(async () => []),
}));
jest.mock('../src/services/auth', () => ({
  getCurrentUser: jest.fn(async () => ({
    username: 'bob',
    email: 'b@example.com',
  })),
  login: jest.fn(),
  register: jest.fn(),
  requestPasswordReset: jest.fn(),
}));

const { act } = ReactTestRenderer;
const WHITES = ['#FFFFFF', '#ffffff', '#fff', 'white'];

const collectBackgrounds = node => {
  const out = [];
  const visit = n => {
    if (!n || typeof n === 'string') return;
    const bg = StyleSheet.flatten(n.props && n.props.style)?.backgroundColor;
    if (bg) out.push(bg);
    (n.children || []).forEach(visit);
  };
  [].concat(node).forEach(visit);
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

const screens = {
  MyLists: <MyListsScreen navigation={{ navigate: jest.fn() }} />,
  ShoppingList: (
    <ShoppingListScreen
      route={{ params: { listId: 1, listName: 'רשימה' } }}
      navigation={{
        setOptions: jest.fn(),
        goBack: jest.fn(),
        navigate: jest.fn(),
      }}
    />
  ),
  Settings: (
    <SettingsScreen navigation={{ goBack: jest.fn() }} onLogout={jest.fn()} />
  ),
  Login: <LoginScreen onLoginSuccess={jest.fn()} />,
};

describe('dark mode screens', () => {
  Object.entries(screens).forEach(([name, element]) => {
    test(`${name}: root is the dark background and no white surfaces`, async () => {
      const tree = await renderDark(element);
      const bgs = collectBackgrounds(tree.toJSON());
      expect(bgs).toContain('#0B1220');
      expect(bgs.filter(b => WHITES.includes(b))).toEqual([]);
    });
  });

  // תיבת הטיפ הוסרה (אין בעיצוב, והייתה נראית כפס ריק). תווית "מוצרים לקנייה" נשארת
  test('ShoppingList section label uses the dark secondary text colour', async () => {
    const api = require('../src/services/api');
    api.getShoppingList.mockResolvedValueOnce([
      { id: 1, name: 'חלב', amount: 1, purchased: false, position: 0 },
    ]);
    const tree = await renderDark(screens.ShoppingList);
    try {
      const label = tree.root.findAll(
        n => n.props.children === 'מוצרים לקנייה' && n.props.style,
      )[0];
      expect(StyleSheet.flatten(label.props.style).color).toBe(
        dark.text.secondary,
      );
      expect(
        tree.root.findAll(n => n.props.children === '💡 טיפ שימושי:'),
      ).toHaveLength(0);
    } finally {
      // פירוק בתוך act כדי שאנימציית השורה לא תמשיך אחרי הבדיקה
      await act(async () => tree.unmount());
    }
  });

  test('offline banner text stays dark on the warning background', async () => {
    const tree = await renderDark(<OfflineBanner visible />);
    const text = tree.root.findAll(
      n => typeof n.props.children === 'string' && n.props.style,
    )[0];
    expect(StyleSheet.flatten(text.props.style).color).toBe(dark.onWarning);
    expect(dark.onWarning).toBe('#212529');
  });
});
