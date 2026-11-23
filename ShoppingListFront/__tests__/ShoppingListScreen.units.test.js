/* global jest, test, expect, beforeEach, afterEach */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ShoppingListScreen from '../src/screens/ShoppingListScreen/ShoppingListScreen';
import EditItemModal from '../src/components/EditItemModal/EditItemModal';
import {
  getShoppingList,
  updateItem,
  getListCategories,
  getListMembers,
} from '../src/services/api';

// ScrollView של gesture-handler דורש Reanimated מלא; כאן מספיק ה-ScrollView הרגיל
jest.mock('react-native-gesture-handler', () => ({
  ...jest.requireActual('react-native-gesture-handler'),
  ScrollView: require('react-native').ScrollView,
}));

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
  // מצב ידני: רשימה נגררת מקוננת בתוך מיכל גלילה (עם המשיכה לריענון)
  const MockNestableScrollContainer = ({ children, ...rest }) => {
    global.__scrollProps = rest;
    return ReactLib.createElement(View, { testID: 'nestable_scroll' }, children);
  };
  return {
    __esModule: true,
    default: MockDraggableFlatList,
    NestableDraggableFlatList: MockDraggableFlatList,
    NestableScrollContainer: MockNestableScrollContainer,
  };
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
  const MockShoppingListItem = ({
    item,
    onEdit,
    showAddedBy,
    currentUsername,
  }) =>
    ReactLib.createElement(
      RNText,
      {
        testID: `row_${item.id}`,
        color: item.categoryColor,
        onPress: onEdit,
        showAddedBy,
        currentUsername,
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
  getListMembers: jest.fn(),
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
      <GestureHandlerRootView>
        <ShoppingListScreen
          route={{ params: { listId: 7, listName: 'רשימה' } }}
          navigation={{ goBack: jest.fn() }}
        />
      </GestureHandlerRootView>,
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

beforeEach(async () => {
  jest.clearAllMocks();
  global.__dragRendered = 0;
  await AsyncStorage.clear();
  getListCategories.mockResolvedValue(customs);
  getListMembers.mockResolvedValue([{ id: 1 }, { id: 2 }]);
});

const ITEMS = [item(1, 'חלב', { unit: 'ליטר', note: 'דל' }), item(2, 'לחם')];

const openEdit = async (tree, id) => {
  await act(async () => byId(tree, `row_${id}`).props.onPress());
  return tree.root.findByType(EditItemModal);
};

test('changed unit and note are sent', async () => {
  const tree = await mount(ITEMS);
  updateItem.mockResolvedValue(ITEMS[1]);
  const modal = await openEdit(tree, 2);
  await act(async () =>
    modal.props.onSave({ name: 'לחם', unit: 'חבילה', note: 'פרוס' }),
  );
  expect(updateItem).toHaveBeenCalledWith(2, {
    name: 'לחם',
    unit: 'חבילה',
    note: 'פרוס',
  });
});

test('cleared unit and note are sent as explicit null', async () => {
  const tree = await mount(ITEMS);
  updateItem.mockResolvedValue(ITEMS[0]);
  const modal = await openEdit(tree, 1);
  await act(async () =>
    modal.props.onSave({ name: 'חלב', unit: null, note: null }),
  );
  expect(updateItem).toHaveBeenCalledWith(1, {
    name: 'חלב',
    unit: null,
    note: null,
  });
});

test('untouched or unchanged unit and note are omitted', async () => {
  const tree = await mount(ITEMS);
  updateItem.mockResolvedValue(ITEMS[0]);
  const modal = await openEdit(tree, 1);
  await act(async () =>
    modal.props.onSave({ name: 'חלב 3%', unit: 'ליטר', note: undefined }),
  );
  const sent = updateItem.mock.calls[0][1];
  expect(sent).toEqual({ name: 'חלב 3%' });
  expect('unit' in sent).toBe(false);
  expect('note' in sent).toBe(false);
});

test('showAddedBy follows the member count and the username is read from storage', async () => {
  await AsyncStorage.setItem('username', 'omer');
  let tree = await mount(ITEMS);
  expect(byId(tree, 'row_1').props.showAddedBy).toBe(true);
  expect(byId(tree, 'row_1').props.currentUsername).toBe('omer');
  getListMembers.mockResolvedValue([{ id: 1 }]);
  tree = await mount(ITEMS);
  expect(byId(tree, 'row_1').props.showAddedBy).toBe(false);
});
