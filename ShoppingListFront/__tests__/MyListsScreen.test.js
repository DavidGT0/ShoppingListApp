/* global jest, describe, beforeEach, afterEach, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Alert, Share, TouchableOpacity } from 'react-native';
import MyListsScreen from '../src/screens/MyListsScreen/MyListsScreen';
import {
  getShoppingLists,
  deleteShoppingList,
  createShoppingList,
  joinListByCode,
  duplicateList,
  getShoppingList,
  updateShoppingList,
} from '../src/services/api';
import useLiveRefresh from '../src/hooks/useLiveRefresh';

jest.mock('../src/services/api', () => ({
  getShoppingLists: jest.fn(),
  createShoppingList: jest.fn(),
  updateShoppingList: jest.fn(),
  deleteShoppingList: jest.fn(),
  joinListByCode: jest.fn(),
  duplicateList: jest.fn(),
  getShoppingList: jest.fn(),
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

  test('every card has a menu button, and shared lists also show a badge', async () => {
    const { byTestId } = await renderScreen();

    expect(byTestId('list_menu_1')).toBeDefined();
    expect(byTestId('list_menu_2')).toBeDefined();
    expect(byTestId('edit_list_1')).toBeUndefined();
    expect(byTestId('delete_list_1')).toBeUndefined();
    expect(byTestId('shared_badge_1')).toBeUndefined();
    expect(byTestId('shared_badge_2')).toBeDefined();
  });

  test('a member menu hides rename and delete', async () => {
    const { byTestId } = await renderScreen();
    await act(async () => byTestId('list_menu_2').props.onPress());

    expect(byTestId('menu_duplicate')).toBeDefined();
    expect(byTestId('menu_share_text')).toBeDefined();
    expect(byTestId('menu_rename')).toBeUndefined();
    expect(byTestId('menu_delete')).toBeUndefined();
  });

  test('rename works through the menu', async () => {
    updateShoppingList.mockResolvedValue({
      id: 1,
      name: 'שם חדש',
      owner_id: 1,
      is_owner: true,
    });
    const { byTestId, listNames } = await renderScreen();
    await act(async () => byTestId('list_menu_1').props.onPress());
    await act(async () => byTestId('menu_rename').props.onPress());
    await act(async () => {
      tree.root
        .findAllByType(require('react-native').TextInput)
        .find(i => i.props.value === 'שלי')
        .props.onChangeText('שם חדש');
    });
    const save = tree.root.findAll(
      n => n.type === TouchableOpacity && n.props.testID === 'rename_save_button',
    )[0];
    await act(async () => {
      await save.props.onPress();
    });

    expect(updateShoppingList).toHaveBeenCalledWith(1, { name: 'שם חדש' });
    expect(listNames()).toContain('שם חדש');
  });

  test('delete through the menu still asks for confirmation', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { byTestId } = await renderScreen();
    await act(async () => byTestId('list_menu_1').props.onPress());
    await act(async () => byTestId('menu_delete').props.onPress());

    expect(alertSpy).toHaveBeenCalledWith(
      'מחיקת רשימה',
      expect.any(String),
      expect.any(Array),
    );
    expect(deleteShoppingList).not.toHaveBeenCalled();
  });

  test('duplicate adds the new list without navigating', async () => {
    duplicateList.mockResolvedValue({
      id: 5,
      name: 'שלי (עותק)',
      owner_id: 1,
      is_owner: true,
    });
    const { byTestId, listNames, navigate } = await renderScreen();
    await act(async () => byTestId('list_menu_2').props.onPress());
    await act(async () => {
      await byTestId('menu_duplicate').props.onPress();
    });

    expect(duplicateList).toHaveBeenCalledWith(2);
    expect(listNames()).toContain('שלי (עותק)');
    expect(navigate).not.toHaveBeenCalled();
  });

  test('share text sends the built message', async () => {
    getShoppingList.mockResolvedValue([
      { id: 1, name: 'חלב', amount: 2, purchased: false },
      { id: 2, name: 'לחם', amount: 1, purchased: true },
    ]);
    const shareSpy = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction' });
    const { byTestId } = await renderScreen();
    await act(async () => byTestId('list_menu_1').props.onPress());
    await act(async () => {
      await byTestId('menu_share_text').props.onPress();
    });

    expect(getShoppingList).toHaveBeenCalledWith(1);
    expect(shareSpy).toHaveBeenCalledWith({ message: '🛒 שלי\n• חלב ×2' });
  });

  test('share text failure shows a Hebrew error and does not share', async () => {
    const err = new Error('Network response was not ok');
    err.status = 403;
    getShoppingList.mockRejectedValue(err);
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({});
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { byTestId } = await renderScreen();
    await act(async () => byTestId('list_menu_1').props.onPress());
    await act(async () => {
      await byTestId('menu_share_text').props.onPress();
    });

    expect(alertSpy).toHaveBeenCalledWith('שגיאה', 'לא הצלחנו לשלוח את הרשימה');
    expect(shareSpy).not.toHaveBeenCalled();
  });

  test('a dismissed share sheet shows no alert', async () => {
    getShoppingList.mockResolvedValue([
      { id: 1, name: 'חלב', amount: 1, purchased: false },
    ]);
    jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.dismissedAction });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { byTestId } = await renderScreen();
    await act(async () => byTestId('list_menu_1').props.onPress());
    await act(async () => {
      await byTestId('menu_share_text').props.onPress();
    });

    expect(alertSpy).not.toHaveBeenCalled();
  });

  test('share text of an empty list alerts and does not share', async () => {
    getShoppingList.mockResolvedValue([]);
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({});
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { byTestId } = await renderScreen();
    await act(async () => byTestId('list_menu_1').props.onPress());
    await act(async () => {
      await byTestId('menu_share_text').props.onPress();
    });

    expect(alertSpy).toHaveBeenCalledWith('', 'אין מוצרים לשליחה');
    expect(shareSpy).not.toHaveBeenCalled();
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
      byTestId('list_menu_1').props.onPress();
    });
    await act(async () => byTestId('menu_delete').props.onPress());
    await act(async () => {
      byTestId('list_menu_2').props.onPress();
    });
    await act(async () => byTestId('menu_delete').props.onPress());
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

  test('a stale refresh does not hide a just-created list', async () => {
    const { byTestId, listNames } = await renderScreen();
    const tick = useLiveRefresh.mock.calls[useLiveRefresh.mock.calls.length - 1][0];

    // רענון שנשאר תקוע ומחזיר בסוף נתונים ישנים
    const stale = deferred();
    getShoppingLists.mockReturnValueOnce(stale.promise);
    let refreshDone;
    await act(async () => {
      refreshDone = tick();
    });

    createShoppingList.mockResolvedValue({
      id: 7,
      name: 'חדשה שלי',
      owner_id: 1,
      is_owner: true,
    });
    await act(async () => {
      byTestId('new_list_input').props.onChangeText('חדשה שלי');
    });
    await act(async () => {
      await byTestId('create_list_button').props.onPress();
    });
    expect(listNames()).toContain('חדשה שלי');

    await act(async () => {
      stale.resolve([
        { id: 1, name: 'שלי', owner_id: 1, is_owner: true },
        { id: 2, name: 'של אמא', owner_id: 2, is_owner: false },
      ]);
      await refreshDone;
    });

    expect(listNames()).toContain('חדשה שלי');
  });
});

describe('MyListsScreen icons', () => {
  test('cards show a cart icon and a dots-vertical menu icon, not emoji', async () => {
    getShoppingLists.mockResolvedValue([
      { id: 1, name: 'שלי', owner_id: 1, is_owner: true },
    ]);
    const { byTestId } = await renderScreen();
    const names = tree.root
      .findAll(n => n.type === 'Icon')
      .map(n => n.props.name);
    expect(names).toContain('cart-outline');
    expect(names).toContain('dots-vertical');
    const menu = byTestId('list_menu_1');
    expect(menu.findAll(n => n.props.children === '⋮')).toHaveLength(0);
    await act(async () => tree.unmount());
  });
});
