/* global jest, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ShoppingListScreen from '../src/screens/ShoppingListScreen/ShoppingListScreen';
import ShoppingListItem from '../src/components/ShoppingListItem/ShoppingListItem';
import { Alert } from 'react-native';
import AddItemInput from '../src/components/AddItemInput/AddItemInput';
import {
  getShoppingList,
  updateItem,
  addItem,
  reorderItems,
} from '../src/services/api';

// הבדיקה כאן היא על ניהול המצב במסך, לא על גרירה/החלקה -
// לכן הרשימה הנגררת ושורת המוצר מוחלפות ברכיבים פשוטים
jest.mock('react-native-draggable-flatlist', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  const MockDraggableFlatList = ({
    data,
    renderItem,
    ListHeaderComponent,
    ListFooterComponent,
  }) =>
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
      ListFooterComponent,
    );
  return { __esModule: true, default: MockDraggableFlatList };
});

jest.mock('../src/components/ShoppingListItem/ShoppingListItem', () => {
  const ReactLib = require('react');
  const { Text } = require('react-native');
  const MockShoppingListItem = ({ item }) =>
    ReactLib.createElement(Text, null, item.name);
  return { __esModule: true, default: MockShoppingListItem };
});

jest.mock('../src/services/api', () => ({
  getShoppingList: jest.fn(),
  addItem: jest.fn(),
  updateItem: jest.fn(),
  deleteItem: jest.fn(),
  reorderItems: jest.fn(),
}));

const { act } = ReactTestRenderer;

const deferred = () => {
  let resolve;
  const promise = new Promise(r => {
    resolve = r;
  });
  return { promise, resolve };
};

test('checking off two items quickly keeps both checked (no stale state)', async () => {
  const milk = { id: 1, name: 'חלב', amount: 1, purchased: false, position: 0 };
  const bread = { id: 2, name: 'לחם', amount: 1, purchased: false, position: 1 };
  getShoppingList.mockResolvedValue([milk, bread]);
  const first = deferred();
  const second = deferred();
  updateItem
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);

  let tree;
  await act(async () => {
    // עטיפה כמו ב-App.js - נדרשת למחוות (גרירה/החלקה)
    tree = ReactTestRenderer.create(
      <GestureHandlerRootView>
        <ShoppingListScreen
          route={{ params: { listId: 7, listName: 'רשימה' } }}
          navigation={{ goBack: jest.fn() }}
        />
      </GestureHandlerRootView>,
    );
  });
  const itemRow = id =>
    tree.root.findAllByType(ShoppingListItem).find(n => n.props.item.id === id);

  // שני סימונים לפני שהשרת ענה על הראשון
  await act(async () => {
    itemRow(1).props.onTogglePurchased();
    itemRow(2).props.onTogglePurchased();
  });
  await act(async () => first.resolve({ ...milk, purchased: true }));
  await act(async () => second.resolve({ ...bread, purchased: true }));

  const purchased = tree.root
    .findAllByType(ShoppingListItem)
    .filter(n => n.props.item.purchased)
    .map(n => n.props.item.name)
    .sort();
  expect(purchased).toEqual(['חלב', 'לחם']);
});

test('adding an item sends a single request and shows it first, with no error', async () => {
  const milk = { id: 1, name: 'חלב', amount: 1, purchased: false, position: 0 };
  getShoppingList.mockResolvedValue([milk]);
  addItem.mockResolvedValue({
    id: 2,
    name: 'לחם',
    amount: 1,
    purchased: false,
    position: -1,
  });
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

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

  await act(async () => tree.root.findByType(AddItemInput).props.onAdd('לחם'));

  expect(addItem).toHaveBeenCalledTimes(1);
  expect(reorderItems).not.toHaveBeenCalled();
  expect(alertSpy).not.toHaveBeenCalled();
  const names = tree.root
    .findAllByType(ShoppingListItem)
    .map(n => n.props.item.name);
  expect(names).toEqual(['לחם', 'חלב']);
  alertSpy.mockRestore();
});
