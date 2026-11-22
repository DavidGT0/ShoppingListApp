/* global jest, describe, beforeEach, afterEach, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Alert, TouchableOpacity } from 'react-native';
import MyListsScreen from '../src/screens/MyListsScreen/MyListsScreen';
import {
  getShoppingLists,
  deleteShoppingList,
  joinListByCode,
} from '../src/services/api';
import useLiveRefresh from '../src/hooks/useLiveRefresh';

jest.mock('../src/services/api', () => ({
  getShoppingLists: jest.fn(),
  createShoppingList: jest.fn(),
  updateShoppingList: jest.fn(),
  deleteShoppingList: jest.fn(),
  joinListByCode: jest.fn(),
}));

jest.mock('../src/hooks/useLiveRefresh', () => ({
  __esModule: true,
  default: jest.fn(),
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
  const navigate = jest.fn();
  await act(async () => {
    tree = ReactTestRenderer.create(
      <MyListsScreen navigation={{ navigate }} />,
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
  return { byTestId, listNames, navigate };
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

  test('opening a list passes isOwner', async () => {
    const { navigate } = await renderScreen();
    const cards = tree.root.findAll(
      n => n.type === TouchableOpacity && n.props.testID === 'list_card',
    );
    await act(async () => cards[0].props.onPress());
    await act(async () => cards[1].props.onPress());

    expect(navigate).toHaveBeenNthCalledWith(1, 'ShoppingListItems', {
      listId: 1,
      listName: 'שלי',
      isOwner: true,
    });
    expect(navigate).toHaveBeenNthCalledWith(2, 'ShoppingListItems', {
      listId: 2,
      listName: 'של אמא',
      isOwner: false,
    });
  });

  test('live refresh replaces the lists', async () => {
    const { listNames } = await renderScreen();
    expect(listNames()).toEqual(['שלי', 'של אמא']);

    getShoppingLists.mockResolvedValue([
      { id: 1, name: 'שלי', owner_id: 1, is_owner: true },
      { id: 3, name: 'חדשה מהשרת', owner_id: 2, is_owner: false },
    ]);
    const tick = useLiveRefresh.mock.calls[useLiveRefresh.mock.calls.length - 1][0];
    await act(async () => {
      await tick();
    });

    expect(listNames()).toEqual(['שלי', 'חדשה מהשרת']);
  });

  test('joining adds the list with a shared badge and opens it', async () => {
    joinListByCode.mockResolvedValue({
      id: 9,
      name: 'משפחתית',
      owner_id: 2,
      is_owner: false,
    });
    const { byTestId, listNames, navigate } = await renderScreen();

    await act(async () => byTestId('join_list_link').props.onPress());
    await act(async () => {
      byTestId('join_code_input').props.onChangeText('K7M2Q9');
    });
    await act(async () => {
      await byTestId('join_submit_button').props.onPress();
    });

    expect(joinListByCode).toHaveBeenCalledWith('K7M2Q9');
    expect(listNames()).toContain('משפחתית');
    expect(byTestId('shared_badge_9')).toBeDefined();
    expect(navigate).toHaveBeenCalledWith('ShoppingListItems', {
      listId: 9,
      listName: 'משפחתית',
      isOwner: false,
    });
  });
});
