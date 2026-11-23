/* global jest, test, expect, beforeEach, afterEach */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import ShoppingListScreen from '../src/screens/ShoppingListScreen/ShoppingListScreen';
import EditItemModal from '../src/components/EditItemModal/EditItemModal';
import {
  getShoppingList,
  updateItem,
  getListCategories,
  createListCategory,
  deleteListCategory,
} from '../src/services/api';

// גרירה לא נבדקת כאן: הרשימה הנגררת מוחלפת ברכיב פשוט שרושם שהוא רונדר
jest.mock('react-native-draggable-flatlist', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  const MockDraggableFlatList = props => {
    global.__dragRendered = (global.__dragRendered || 0) + 1;
    return ReactLib.createElement(
      View,
      { testID: 'draggable' },
      props.ListHeaderComponent,
      props.data.map(item =>
        ReactLib.createElement(
          ReactLib.Fragment,
          { key: item.id },
          props.renderItem({ item, drag: () => {}, isActive: false }),
        ),
      ),
      props.ListFooterComponent,
    );
  };
  return { __esModule: true, default: MockDraggableFlatList };
});

jest.mock('../src/hooks/useLiveRefresh', () => ({
  __esModule: true,
  default: jest.fn((refresh, intervalMs, options) => {
    global.__live = { refresh, intervalMs, options };
  }),
}));

jest.mock('../src/components/ShoppingListItem/ShoppingListItem', () => {
  const ReactLib = require('react');
  const { Text: RNText } = require('react-native');
  const MockShoppingListItem = ({ item, onEdit }) =>
    ReactLib.createElement(
      RNText,
      {
        testID: `row_${item.id}`,
        color: item.categoryColor,
        onPress: onEdit,
      },
      item.name,
    );
  return { __esModule: true, default: MockShoppingListItem };
});

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
}));

const { act } = ReactTestRenderer;

const trees = [];
afterEach(async () => {
  await act(async () => {
    trees.splice(0).forEach(t => t.unmount());
  });
});

const item = (id, name, extra = {}) => ({
  id,
  name,
  amount: 1,
  purchased: false,
  position: id,
  category: null,
  ...extra,
});

const customs = [
  { id: 5, name: 'מתנות', color: '#123456' },
  { id: 6, name: 'חיות', color: '#654321' },
];

const mount = async items => {
  getShoppingList.mockResolvedValue(items);
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <ShoppingListScreen
        route={{ params: { listId: 7, listName: 'רשימה' } }}
        navigation={{ goBack: jest.fn() }}
      />,
    );
  });
  trees.push(tree);
  return tree;
};

const byId = (tree, id) => {
  const found = tree.root.findAllByProps({ testID: id });
  if (!found.length) throw new Error(`missing ${id}`);
  return found[0];
};
const has = (tree, id) => tree.root.findAllByProps({ testID: id }).length > 0;

const headerKeys = tree =>
  tree.root
    .findAll(
      n =>
        typeof n.props.testID === 'string' &&
        n.props.testID.startsWith('category_header_') &&
        typeof n.type === 'string',
    )
    .map(n => n.props.testID.replace('category_header_', ''));

beforeEach(async () => {
  jest.clearAllMocks();
  global.__dragRendered = 0;
  await AsyncStorage.clear();
  getListCategories.mockResolvedValue(customs);
});

const ITEMS = [
  item(1, 'משהו לא מוכר'),
  item(2, 'חלב'),
  item(3, 'עגבניות'),
  item(4, 'מתנה ליום הולדת', { category: 'custom:6' }),
  item(5, 'שמפו'),
  item(6, 'לחם', { purchased: true }),
];

test('loads the list custom categories on mount', async () => {
  await mount(ITEMS);
  expect(getListCategories).toHaveBeenCalledWith(7);
});

test('manual mode is the default and uses the draggable list', async () => {
  const tree = await mount(ITEMS);
  expect(has(tree, 'draggable')).toBe(true);
  expect(headerKeys(tree)).toEqual([]);
});

test('toggle switches to category mode, persists it, and drops the draggable list', async () => {
  const tree = await mount(ITEMS);
  await act(async () => byId(tree, 'sort_mode_toggle').props.onPress());
  expect(await AsyncStorage.getItem('@sort_mode_7')).toBe('category');
  expect(has(tree, 'draggable')).toBe(false);
  await act(async () => byId(tree, 'sort_mode_toggle').props.onPress());
  expect(await AsyncStorage.getItem('@sort_mode_7')).toBe('manual');
  expect(has(tree, 'draggable')).toBe(true);
});

test('a saved category mode is restored on mount', async () => {
  await AsyncStorage.setItem('@sort_mode_7', 'category');
  const tree = await mount(ITEMS);
  expect(has(tree, 'draggable')).toBe(false);
  expect(has(tree, 'category_header_dairy')).toBe(true);
});

test('another list keeps its own mode', async () => {
  await AsyncStorage.setItem('@sort_mode_99', 'category');
  const tree = await mount(ITEMS);
  expect(has(tree, 'draggable')).toBe(true);
});

test('category mode shows headers in aisle order: built-ins, customs, other', async () => {
  await AsyncStorage.setItem('@sort_mode_7', 'category');
  const tree = await mount(ITEMS);
  expect(headerKeys(tree)).toEqual([
    'produce',
    'dairy',
    'care',
    'custom:6',
    'other',
  ]);
});

test('purchased items do not create a header', async () => {
  await AsyncStorage.setItem('@sort_mode_7', 'category');
  const tree = await mount(ITEMS);
  expect(has(tree, 'category_header_bakery')).toBe(false);
});

test('items get the dot color of their resolved category', async () => {
  const tree = await mount(ITEMS);
  expect(byId(tree, 'row_4').props.color).toBe('#654321');
  expect(byId(tree, 'row_2').props.color).toBe('#64B5F6');
});

test('refresh brings the custom categories too', async () => {
  await mount(ITEMS);
  getListCategories.mockClear();
  getListCategories.mockResolvedValue([
    ...customs,
    { id: 8, name: 'חדש', color: '#000000' },
  ]);
  await act(async () => global.__live.refresh());
  expect(getListCategories).toHaveBeenCalledTimes(1);
});

const openEdit = async (tree, id) => {
  await act(async () => byId(tree, `row_${id}`).props.onPress());
  return tree.root.findByType(EditItemModal);
};

test('saving a changed category sends it with the name', async () => {
  const tree = await mount(ITEMS);
  updateItem.mockResolvedValue({ ...ITEMS[1], category: 'snacks' });
  const modal = await openEdit(tree, 2);
  expect(modal.props.item.id).toBe(2);
  await act(async () =>
    modal.props.onSave({ name: 'חלב', category: 'snacks' }),
  );
  expect(updateItem).toHaveBeenCalledWith(2, {
    name: 'חלב',
    category: 'snacks',
  });
});

test('an unchanged category is not sent (does not overwrite a family edit)', async () => {
  const tree = await mount(ITEMS);
  updateItem.mockResolvedValue({ ...ITEMS[1], name: 'חלב עיזים' });
  const modal = await openEdit(tree, 2);
  await act(async () =>
    modal.props.onSave({ name: 'חלב עיזים', category: null }),
  );
  expect(updateItem).toHaveBeenCalledWith(2, { name: 'חלב עיזים' });
});

test('resetting to automatic sends an explicit null', async () => {
  const tree = await mount(ITEMS);
  updateItem.mockResolvedValue({ ...ITEMS[3], category: null });
  const modal = await openEdit(tree, 4);
  await act(async () =>
    modal.props.onSave({ name: 'מתנה ליום הולדת', category: null }),
  );
  expect(updateItem).toHaveBeenCalledWith(4, {
    name: 'מתנה ליום הולדת',
    category: null,
  });
});

test('the server category in the response is what gets rendered', async () => {
  await AsyncStorage.setItem('@sort_mode_7', 'category');
  const tree = await mount(ITEMS);
  updateItem.mockResolvedValue({ ...ITEMS[1], category: 'snacks' });
  const modal = await openEdit(tree, 2);
  await act(async () =>
    modal.props.onSave({ name: 'חלב', category: 'snacks' }),
  );
  expect(headerKeys(tree)).toContain('snacks');
  expect(headerKeys(tree)).not.toContain('dairy');
});

test('creating a category goes through the guard, appends it, and returns it', async () => {
  const tree = await mount(ITEMS);
  const created = { id: 9, name: 'חדשה', color: '#999999' };
  createListCategory.mockResolvedValue(created);
  let result;
  await act(async () => {
    result = await tree.root
      .findByType(EditItemModal)
      .props.onCreateCategory('חדשה');
  });
  expect(createListCategory).toHaveBeenCalledWith(7, 'חדשה');
  expect(result).toEqual(created);
  expect(tree.root.findByType(EditItemModal).props.categories).toEqual([
    ...customs,
    created,
  ]);
});

test('a failed create alerts with the server message and returns undefined', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const tree = await mount(ITEMS);
  const error = new Error('המחלקה כבר קיימת ברשימה');
  error.status = 400;
  createListCategory.mockRejectedValue(error);
  let result = 'x';
  await act(async () => {
    result = await tree.root
      .findByType(EditItemModal)
      .props.onCreateCategory('חיות');
  });
  expect(result).toBeUndefined();
  expect(alertSpy).toHaveBeenCalledWith('שגיאה', 'המחלקה כבר קיימת ברשימה');
  alertSpy.mockRestore();
});

test('a refresh that returns during a category create is dropped', async () => {
  const tree = await mount(ITEMS);
  let resolveCreate;
  createListCategory.mockReturnValue(
    new Promise(res => {
      resolveCreate = res;
    }),
  );
  let pending;
  await act(async () => {
    pending = tree.root.findByType(EditItemModal).props.onCreateCategory('x');
  });
  getShoppingList.mockResolvedValue([item(1, 'משהו אחר')]);
  getListCategories.mockResolvedValue([]);
  await act(async () => global.__live.refresh());
  // הרענון נזרק: המחלקות והמוצרים לא הוחלפו בזמן שהפעולה בדרך
  expect(tree.root.findByType(EditItemModal).props.categories).toEqual(customs);
  expect(has(tree, 'row_2')).toBe(true);
  await act(async () => {
    resolveCreate({ id: 9, name: 'x', color: '#000000' });
    await pending;
  });
});

test('deleting a category removes it and resets its items to automatic', async () => {
  await AsyncStorage.setItem('@sort_mode_7', 'category');
  const tree = await mount(ITEMS);
  deleteListCategory.mockResolvedValue(undefined);
  await act(async () => {
    await tree.root
      .findByType(EditItemModal)
      .props.onDeleteCategory(customs[1]);
  });
  expect(deleteListCategory).toHaveBeenCalledWith(7, 6);
  expect(tree.root.findByType(EditItemModal).props.categories).toEqual([
    customs[0],
  ]);
  // "מתנה ליום הולדת" חזר לאוטומטי (אחר)
  expect(headerKeys(tree)).not.toContain('custom:6');
});

test('a failed delete keeps the category and alerts', async () => {
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const tree = await mount(ITEMS);
  const error = new Error('x');
  error.status = 500;
  deleteListCategory.mockRejectedValue(error);
  await act(async () => {
    await tree.root
      .findByType(EditItemModal)
      .props.onDeleteCategory(customs[1]);
  });
  expect(tree.root.findByType(EditItemModal).props.categories).toHaveLength(2);
  expect(alertSpy).toHaveBeenCalledWith('שגיאה', 'לא הצלחנו למחוק את המחלקה');
  alertSpy.mockRestore();
});
