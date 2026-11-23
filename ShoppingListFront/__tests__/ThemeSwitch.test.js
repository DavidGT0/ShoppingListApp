/* global jest, describe, beforeEach, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, StyleSheet, useColorScheme } from 'react-native';
import { ThemeProvider } from '../src/theme/ThemeContext';
import ShoppingListScreen from '../src/screens/ShoppingListScreen/ShoppingListScreen';
import SettingsScreen from '../src/screens/SettingsScreen/SettingsScreen';
import { getShoppingList, getListCategories } from '../src/services/api';
import { saveCache, cacheKeys } from '../src/services/offlineCache';

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));
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
    default: ({ data, renderItem }) =>
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
      ),
  };
});
jest.mock('../src/components/ShoppingListItem/ShoppingListItem', () => {
  const ReactLib = require('react');
  const { Text: RNText } = require('react-native');
  return {
    __esModule: true,
    default: ({ item }) => ReactLib.createElement(RNText, null, item.name),
  };
});
jest.mock('../src/hooks/useLiveRefresh', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../src/services/api', () => ({
  getShoppingList: jest.fn(),
  getListMembers: jest.fn(() => Promise.resolve([])),
  getListCategories: jest.fn(),
}));
jest.mock('../src/services/auth', () => ({
  logout: jest.fn(),
  getCurrentUser: jest.fn(async () => ({
    username: 'bob',
    email: 'bob@example.com',
  })),
  changePassword: jest.fn(),
  changeUsername: jest.fn(),
  deleteAccount: jest.fn(),
}));

const { act } = ReactTestRenderer;
const byId = (tree, id) => tree.root.findAll(n => n.props.testID === id)[0];
const press = async (tree, id) => {
  await act(async () => {
    byId(tree, id).props.onPress();
  });
};
const rootBg = tree => {
  const out = [];
  const visit = n => {
    if (!n || typeof n === 'string') return;
    const bg = StyleSheet.flatten(n.props && n.props.style)?.backgroundColor;
    if (bg) out.push(bg);
    (n.children || []).forEach(visit);
  };
  visit(tree.toJSON());
  return out;
};

const renderList = async () => {
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <GestureHandlerRootView>
          <ShoppingListScreen
            route={{ params: { listId: 7, listName: 'רשימה' } }}
            navigation={{ goBack: jest.fn() }}
          />
        </GestureHandlerRootView>
      </ThemeProvider>,
    );
  });
  await act(async () => {});
  return tree;
};

const renderSettings = async () => {
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <ThemeProvider>
        <SettingsScreen navigation={{ goBack: jest.fn() }} onLogout={jest.fn()} />
      </ThemeProvider>,
    );
  });
  await act(async () => {});
  return tree;
};

const iconName = tree =>
  byId(tree, 'theme_toggle').findAll(n => n.props.name)[0].props.name;

let alertSpy;
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  useColorScheme.mockReturnValue('light');
  getShoppingList.mockReset();
  getShoppingList.mockResolvedValue([]);
  getListCategories.mockReset();
  getListCategories.mockResolvedValue([]);
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});

describe('header toggle', () => {
  test('light mode shows weather-night and switches to dark', async () => {
    const tree = await renderList();
    const toggle = byId(tree, 'theme_toggle');
    expect(toggle.props.accessibilityRole).toBe('button');
    expect(toggle.props.accessibilityLabel).toBe('מצב כהה');
    expect(iconName(tree)).toBe('weather-night');
    expect(rootBg(tree)).toContain('#F8F9FA');
    await press(tree, 'theme_toggle');
    expect(await AsyncStorage.getItem('@theme_mode')).toBe('dark');
    expect(rootBg(tree)).toContain('#0B1220');
    expect(byId(tree, 'theme_toggle').props.accessibilityLabel).toBe('מצב בהיר');
    expect(iconName(tree)).toBe('white-balance-sunny');
    await press(tree, 'theme_toggle');
    expect(await AsyncStorage.getItem('@theme_mode')).toBe('light');
    expect(rootBg(tree)).toContain('#F8F9FA');
  });

  test('system mode flips to the opposite of the current scheme', async () => {
    useColorScheme.mockReturnValue('dark');
    const tree = await renderList();
    expect(iconName(tree)).toBe('white-balance-sunny');
    await press(tree, 'theme_toggle');
    expect(await AsyncStorage.getItem('@theme_mode')).toBe('light');
    expect(rootBg(tree)).toContain('#F8F9FA');
  });

  test('works offline: no alert, theme still changes', async () => {
    await saveCache(cacheKeys.items(7), [
      { id: 1, name: 'חלב', amount: 1, purchased: false, position: 0 },
    ]);
    await saveCache(cacheKeys.categories(7), []);
    getShoppingList.mockRejectedValue(
      Object.assign(new Error('אין חיבור'), { network: true }),
    );
    const tree = await renderList();
    expect(byId(tree, 'offline_banner')).toBeDefined();
    await press(tree, 'theme_toggle');
    expect(alertSpy).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem('@theme_mode')).toBe('dark');
    expect(rootBg(tree)).toContain('#0B1220');
  });
});

describe('settings segments', () => {
  test('three segments with labels, roles and selected state', async () => {
    const tree = await renderSettings();
    const expected = {
      theme_light: 'בהיר',
      theme_dark: 'כהה',
      theme_system: 'לפי הטלפון',
    };
    Object.entries(expected).forEach(([id, label]) => {
      const seg = byId(tree, id);
      expect(seg.props.accessibilityRole).toBe('button');
      expect(seg.props.accessibilityLabel).toBe(label);
    });
    expect(byId(tree, 'theme_system').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(byId(tree, 'theme_dark').props.accessibilityState).toEqual({
      selected: false,
    });
  });

  test('pressing a segment sets and persists the mode', async () => {
    const tree = await renderSettings();
    await press(tree, 'theme_dark');
    expect(await AsyncStorage.getItem('@theme_mode')).toBe('dark');
    expect(byId(tree, 'theme_dark').props.accessibilityState).toEqual({
      selected: true,
    });
    expect(byId(tree, 'theme_system').props.accessibilityState).toEqual({
      selected: false,
    });
    expect(rootBg(tree)).toContain('#0B1220');
    await press(tree, 'theme_light');
    expect(await AsyncStorage.getItem('@theme_mode')).toBe('light');
    expect(rootBg(tree)).toContain('#F8F9FA');
  });
});
