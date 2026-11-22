/* global jest, describe, beforeEach, afterEach, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Alert } from 'react-native';
import MyListsScreen from '../src/screens/MyListsScreen/MyListsScreen';
import { getShoppingLists, deleteShoppingList } from '../src/services/api';

jest.mock('../src/services/api', () => ({
  getShoppingLists: jest.fn(),
  createShoppingList: jest.fn(),
  updateShoppingList: jest.fn(),
  deleteShoppingList: jest.fn(),
}));

const { act } = ReactTestRenderer;

const deferred = () => {
  let resolve;
  const promise = new Promise(r => {
    resolve = r;
  });
  return { promise, resolve };
};

let tree;

const renderScreen = async () => {
  await act(async () => {
    tree = ReactTestRenderer.create(
      <MyListsScreen navigation={{ navigate: jest.fn() }} />,
    );
  });
  const byTestId = id => tree.root.findAll(n => n.props.testID === id)[0];
  // אותו testID מופיע בכמה שכבות של אותו כרטיס - לכן מסירים כפילויות
  const listNames = () => [
    ...new Set(
      tree.root
        .findAll(n => n.props.testID === 'list_card')
        .map(card => card.findAllByType(require('react-native').Text)[0].props.children),
    ),
  ];
  return { byTestId, listNames };
};

describe('MyListsScreen', () => {
  // FlatList ממשיכה להתעדכן ברקע - מסירים את המסך בסוף כל בדיקה
  afterEach(async () => {
    await act(async () => tree.unmount());
  });

  beforeEach(() => {
    jest.clearAllMocks();
    getShoppingLists.mockResolvedValue([
      { id: 1, name: 'שלי', owner_id: 1, is_owner: true },
      { id: 2, name: 'של אמא', owner_id: 2, is_owner: false },
    ]);
  });

  test('shared lists show a "shared" badge instead of edit and delete buttons', async () => {
    const { byTestId } = await renderScreen();

    expect(byTestId('edit_list_1')).toBeDefined();
    expect(byTestId('delete_list_1')).toBeDefined();
    expect(byTestId('shared_badge_1')).toBeUndefined();

    expect(byTestId('edit_list_2')).toBeUndefined();
    expect(byTestId('delete_list_2')).toBeUndefined();
    expect(byTestId('shared_badge_2')).toBeDefined();
  });

  test('deleting two lists quickly removes both (no stale state)', async () => {
    getShoppingLists.mockResolvedValue([
      { id: 1, name: 'א', owner_id: 1, is_owner: true },
      { id: 2, name: 'ב', owner_id: 1, is_owner: true },
      { id: 3, name: 'ג', owner_id: 1, is_owner: true },
    ]);
    // מאשרים אוטומטית את חלון "האם אתה בטוח"
    jest.spyOn(Alert, 'alert').mockImplementation((title, msg, buttons) => {
      buttons?.find(b => b.style === 'destructive')?.onPress();
    });
    const first = deferred();
    const second = deferred();
    deleteShoppingList
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { byTestId, listNames } = await renderScreen();
    // שתי מחיקות לפני שהשרת ענה על הראשונה
    await act(async () => {
      byTestId('delete_list_1').props.onPress();
      byTestId('delete_list_2').props.onPress();
    });
    await act(async () => first.resolve(true));
    await act(async () => second.resolve(true));

    expect(listNames()).toEqual(['ג']);
  });
});
