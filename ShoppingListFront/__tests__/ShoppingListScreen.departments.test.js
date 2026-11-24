/* global jest, test, expect, beforeEach, afterEach */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ShoppingListScreen from '../src/screens/ShoppingListScreen/ShoppingListScreen';
import { getShoppingList, getListCategories } from '../src/services/api';
import { saveCache, cacheKeys } from '../src/services/offlineCache';

// כפתור "עריכת מחלקות" ליד מתג המיון, והחזרה מהעריכה

jest.mock('react-native-gesture-handler', () => ({
  ...jest.requireActual('react-native-gesture-handler'),
  ScrollView: ({ children, testID }) =>
    require('react').createElement(
      require('react-native').View,
      { testID: `${testID}_inner` },
      children,
    ),
}));

jest.mock('react-native-draggable-flatlist', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  const MockDraggableFlatList = props =>
    ReactLib.createElement(
      View,
      { testID: 'draggable' },
      props.data.map(row =>
        ReactLib.createElement(
          ReactLib.Fragment,
          { key: row.id },
          props.renderItem({ item: row, drag: () => {}, isActive: false }),
        ),
      ),
    );
  const MockNestableScrollContainer = ({ children }) =>
    ReactLib.createElement(View, { testID: 'nestable_scroll' }, children);
  return {
    __esModule: true,
    default: MockDraggableFlatList,
    NestableDraggableFlatList: MockDraggableFlatList,
    NestableScrollContainer: MockNestableScrollContainer,
  };
});

jest.mock('../src/hooks/useLiveRefresh', () => ({
  __esModule: true,
  default: jest.fn(refresh => {
    global.__liveRefresh = refresh;
  }),
}));

jest.mock('../src/services/api', () => ({
  getShoppingList: jest.fn(),
  addItem: jest.fn(),
  updateItem: jest.fn(),
  deleteItem: jest.fn(),
  reorderItems: jest.fn(),
  getListMembers: jest.fn(() => Promise.resolve([])),
  getInviteCode: jest.fn(),
  resetInviteCode: jest.fn(),
  removeListMember: jest.fn(),
  leaveList: jest.fn(),
  restorePurchased: jest.fn(),
  clearPurchased: jest.fn(),
  getListCategories: jest.fn(),
  createListCategory: jest.fn(),
  deleteListCategory: jest.fn(),
  getSuggestions: jest.fn(() => Promise.resolve([])),
}));

const { act } = ReactTestRenderer;
const BLOCKED = ['אין חיבור לאינטרנט', 'אפשר רק לצפות ברשימה עד שהחיבור יחזור'];

const item = (id, name, extra = {}) => ({
  id,
  name,
  amount: 1,
  purchased: false,
  position: id,
  category: null,
  ...extra,
});
const ITEMS = [
  item(1, 'עגבניות', { purchased: true }),
  item(2, 'חלב'),
  item(4, 'לחם'),
];

const trees = [];
let alertSpy;
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  getShoppingList.mockReset();
  getShoppingList.mockResolvedValue(ITEMS);
  getListCategories.mockReset();
  getListCategories.mockResolvedValue({ custom: [], layout: [] });
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(async () => {
  await act(async () => {
    trees.splice(0).forEach(t => t.unmount());
  });
  alertSpy.mockRestore();
});

const mount = async ({ mode = 'category' } = {}) => {
  await AsyncStorage.setItem('@sort_mode_7', mode);
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <GestureHandlerRootView>
        <ShoppingListScreen
          route={{ params: { listId: 7, listName: 'רשימה' } }}
          navigation={navigation}
        />
      </GestureHandlerRootView>,
    );
  });
  trees.push(tree);
  return { tree, navigation };
};

const host = (root, id) =>
  root.findAll(n => n.props.testID === id && typeof n.type === 'string');
const pressable = (root, id) =>
  root.findAll(
    n => n.props.testID === id && typeof n.props.onPress === 'function',
  )[0];
const headerKeys = tree =>
  tree.root
    .findAll(
      n =>
        typeof n.type === 'string' &&
        typeof n.props.testID === 'string' &&
        n.props.testID.startsWith('category_header_'),
    )
    .map(n => n.props.testID.replace('category_header_', ''));

test('the ✎ button shows next to the segments in לפי מחלקות mode only', async () => {
  const { tree } = await mount();
  const button = pressable(tree.root, 'edit_departments_button');
  expect(button).toBeDefined();
  expect(button.props.accessibilityLabel).toBe('עריכת מחלקות');
  expect(button.props.accessibilityRole).toBe('button');
  expect(host(tree.root, 'sort_segments')).toHaveLength(1);
  expect(
    button.findAll(n => n.type === 'Icon').map(n => n.props.name),
  ).toEqual(['pencil-outline']);

  const manual = await mount({ mode: 'manual' });
  expect(host(manual.tree.root, 'edit_departments_button')).toHaveLength(0);
});

test('the ✎ button opens the editor with the list id', async () => {
  const { tree, navigation } = await mount();
  await act(async () => pressable(tree.root, 'edit_departments_button').props.onPress());
  expect(navigation.navigate).toHaveBeenCalledTimes(1);
  const [name, params] = navigation.navigate.mock.calls[0];
  expect(name).toBe('EditDepartments');
  // העורך מציג את כל המחלקות, ולכן לא צריך לדעת באילו יש מוצרים
  expect(params).toEqual({ listId: 7, listName: 'רשימה' });
});

test('offline, the ✎ button shows the existing alert and does not navigate', async () => {
  await saveCache(cacheKeys.items(7), ITEMS);
  await saveCache(cacheKeys.categories(7), { custom: [], layout: [] });
  getShoppingList.mockRejectedValue(Object.assign(new Error('x'), { network: true }));
  getListCategories.mockRejectedValue(Object.assign(new Error('x'), { network: true }));
  const { tree, navigation } = await mount();
  const button = pressable(tree.root, 'edit_departments_button');
  expect(button.props.accessibilityState?.disabled).toBeFalsy();
  expect(button.props.accessibilityHint).toBe('לא זמין ללא חיבור לאינטרנט');
  await act(async () => button.props.onPress());
  expect(alertSpy).toHaveBeenCalledWith(...BLOCKED);
  expect(navigation.navigate).not.toHaveBeenCalled();
});

// בחזרה מהעריכה המסך חוזר לפוקוס, והרענון החי רץ מיד (useFocusEffect, ראו
// useLiveRefresh.focus.test.js). כאן: הרענון מביא את הפריסה החדשה והמסלול מתעדכן
test('the refresh on return shows the new department order and names', async () => {
  const { tree } = await mount();
  expect(headerKeys(tree)).toEqual(['produce', 'dairy', 'bakery']);
  getListCategories.mockResolvedValue({
    custom: [],
    layout: [
      { key: 'bakery', name: 'לחמים', icon: '🍞', position: 0 },
      { key: 'dairy', name: null, icon: null, position: 1 },
      { key: 'produce', name: null, icon: null, position: 2 },
    ],
  });
  await act(async () => global.__liveRefresh());
  expect(headerKeys(tree)).toEqual(['bakery', 'dairy', 'produce']);
  const focus = host(tree.root, 'focus_card_title')[0];
  expect(focus.props.accessibilityLabel).toBe('עכשיו במחלקה לחמים');
});
