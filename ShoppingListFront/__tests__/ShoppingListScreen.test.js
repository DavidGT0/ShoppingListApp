/* global jest, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ShoppingListScreen from '../src/screens/ShoppingListScreen/ShoppingListScreen';
import ShoppingListItem from '../src/components/ShoppingListItem/ShoppingListItem';
import { Alert, Text } from 'react-native';
import MembersModal from '../src/components/MembersModal/MembersModal';
import AddItemInput from '../src/components/AddItemInput/AddItemInput';
import {
  getShoppingList,
  updateItem,
  addItem,
  reorderItems,
  getListMembers,
  removeListMember,
  leaveList,
} from '../src/services/api';

// הבדיקה כאן היא על ניהול המצב במסך, לא על גרירה/החלקה -
// לכן הרשימה הנגררת ושורת המוצר מוחלפות ברכיבים פשוטים
jest.mock('react-native-draggable-flatlist', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  const MockDraggableFlatList = props => {
    const { data, renderItem, ListHeaderComponent, ListFooterComponent } =
      props;
    // חושף את ה-props האחרונים כדי שהבדיקות יוכלו להפעיל onDragBegin / onRefresh וכו'
    global.__listProps = props;
    return ReactLib.createElement(
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
  };
  return { __esModule: true, default: MockDraggableFlatList };
});

// ה-hook נבדק בנפרד - כאן רק רושמים עם אילו ארגומנטים המסך קרא לו
jest.mock('../src/hooks/useLiveRefresh', () => ({
  __esModule: true,
  default: jest.fn((refresh, intervalMs, options) => {
    global.__live = { refresh, intervalMs, options };
  }),
}));

jest.mock('../src/components/ShoppingListItem/ShoppingListItem', () => {
  const ReactLib = require('react');
  const { Text: RNText } = require('react-native');
  const MockShoppingListItem = ({ item }) =>
    ReactLib.createElement(RNText, null, item.name);
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

const milk = { id: 1, name: 'חלב', amount: 1, purchased: false, position: 0 };
const eggs = { id: 3, name: 'ביצים', amount: 1, purchased: false, position: 2 };

const renderScreen = async (goBack = jest.fn(), extraParams = {}) => {
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <GestureHandlerRootView>
        <ShoppingListScreen
          route={{ params: { listId: 7, listName: 'רשימה', ...extraParams } }}
          navigation={{ goBack }}
        />
      </GestureHandlerRootView>,
    );
  });
  return tree;
};
const names = tree =>
  tree.root.findAllByType(ShoppingListItem).map(n => n.props.item.name);

test('a refresh shows an item another family member added', async () => {
  getShoppingList.mockReset();
  getShoppingList.mockResolvedValueOnce([milk]);
  const tree = await renderScreen();
  expect(global.__live.intervalMs).toBe(3000);

  getShoppingList.mockResolvedValueOnce([milk, eggs]);
  await act(async () => global.__live.refresh());

  expect(names(tree)).toEqual(['חלב', 'ביצים']);
});

test('a refresh that started before my own change is discarded', async () => {
  getShoppingList.mockReset();
  updateItem.mockReset();
  getShoppingList.mockResolvedValueOnce([milk]);
  const tree = await renderScreen();

  const stale = deferred();
  getShoppingList.mockReturnValueOnce(stale.promise);
  let refreshing;
  await act(async () => {
    refreshing = global.__live.refresh();
  });
  updateItem.mockResolvedValueOnce({ ...milk, purchased: true });
  await act(async () =>
    tree.root.findByType(ShoppingListItem).props.onTogglePurchased(),
  );
  await act(async () => {
    stale.resolve([milk]);
    await refreshing;
  });

  const row = tree.root.findByType(ShoppingListItem);
  expect(row.props.item.purchased).toBe(true);
});

test.each([403, 404])(
  'losing access (%i) shows one message and goes back',
  async status => {
    getShoppingList.mockReset();
    getShoppingList.mockResolvedValueOnce([milk]);
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const goBack = jest.fn();
    await renderScreen(goBack);

    const err = Object.assign(new Error('x'), { status });
    getShoppingList.mockRejectedValue(err);
    await act(async () => global.__live.refresh());
    await act(async () => global.__live.refresh());

    expect(alertSpy).toHaveBeenCalledTimes(1);
    expect(alertSpy.mock.calls[0][1]).toBe('אין לך יותר גישה לרשימה הזו');
    expect(goBack).toHaveBeenCalledTimes(1);
    alertSpy.mockRestore();
  },
);

test('a network error during refresh is silent and keeps the items', async () => {
  getShoppingList.mockReset();
  getShoppingList.mockResolvedValueOnce([milk]);
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const tree = await renderScreen();

  getShoppingList.mockRejectedValueOnce(
    Object.assign(new Error('net'), { network: true }),
  );
  await act(async () => global.__live.refresh());

  expect(alertSpy).not.toHaveBeenCalled();
  expect(names(tree)).toEqual(['חלב']);
  alertSpy.mockRestore();
});

test('refresh is paused while dragging', async () => {
  getShoppingList.mockReset();
  getShoppingList.mockResolvedValueOnce([milk]);
  reorderItems.mockResolvedValue();
  await renderScreen();
  expect(global.__live.options.paused).toBe(false);

  await act(async () => global.__listProps.onDragBegin());
  expect(global.__live.options.paused).toBe(true);

  await act(async () => global.__listProps.onDragEnd({ data: [milk] }));
  expect(global.__live.options.paused).toBe(false);
});

test('the real useLiveRefresh module has a default function export', () => {
  const mod = jest.requireActual('../src/hooks/useLiveRefresh');
  expect(typeof mod.default).toBe('function');
});

test('a refresh that starts and resolves inside an in-flight mutation is discarded', async () => {
  getShoppingList.mockReset();
  updateItem.mockReset();
  getShoppingList.mockResolvedValueOnce([milk]);
  const tree = await renderScreen();

  const pendingUpdate = deferred();
  updateItem.mockReturnValueOnce(pendingUpdate.promise);
  await act(async () => {
    tree.root.findByType(ShoppingListItem).props.onTogglePurchased();
  });
  // הרענון מתחיל ומסתיים כשהפעולה שלי עדיין בדרך
  const cheese = { id: 9, name: 'גבינה', amount: 1, purchased: false, position: 5 };
  getShoppingList.mockResolvedValueOnce([milk, cheese]);
  await act(async () => global.__live.refresh());
  expect(names(tree)).toEqual(['חלב']);
  await act(async () => pendingUpdate.resolve({ ...milk, purchased: true }));

  expect(tree.root.findByType(ShoppingListItem).props.item.purchased).toBe(
    true,
  );
});

const TWO_MEMBERS = [
  { id: 1, username: 'owner_user', is_owner: true },
  { id: 2, username: 'member_user', is_owner: false },
];
const byTestId = (tree, id) =>
  tree.root.findAll(n => n.props.testID === id && n.props.onPress)[0];
const countText = tree =>
  byTestId(tree, 'members_button')
    .findAllByType(Text)
    .map(t => [].concat(t.props.children).join(''))
    .join(' ');

test('header shows the member count', async () => {
  getShoppingList.mockReset();
  getShoppingList.mockResolvedValue([milk]);
  getListMembers.mockResolvedValue(TWO_MEMBERS);
  const tree = await renderScreen();
  expect(countText(tree)).toContain('2');
});

test('closing the dialog reloads the count', async () => {
  getShoppingList.mockReset();
  getShoppingList.mockResolvedValue([milk]);
  getListMembers.mockResolvedValue(TWO_MEMBERS);
  removeListMember.mockResolvedValue();
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const tree = await renderScreen();
  await act(async () => byTestId(tree, 'members_button').props.onPress());

  getListMembers.mockResolvedValue([TWO_MEMBERS[0]]);
  await act(async () => byTestId(tree, 'remove_member_2').props.onPress());
  const buttons = alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2];
  await act(async () => {
    await buttons.find(b => b.style === 'destructive').onPress();
  });
  const modal = tree.root.findByType(MembersModal);
  await act(async () => modal.props.onClose());

  expect(countText(tree)).toContain('1');
  expect(countText(tree)).not.toContain('2');
  alertSpy.mockRestore();
});

test('leaving from the dialog goes back', async () => {
  getShoppingList.mockReset();
  getShoppingList.mockResolvedValue([milk]);
  getListMembers.mockResolvedValue(TWO_MEMBERS);
  leaveList.mockResolvedValue();
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const goBack = jest.fn();
  const tree = await renderScreen(goBack, { isOwner: false });
  await act(async () => byTestId(tree, 'members_button').props.onPress());
  await act(async () => byTestId(tree, 'leave_list_button').props.onPress());
  const buttons = alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2];
  await act(async () => {
    await buttons.find(b => b.style === 'destructive').onPress();
  });
  expect(leaveList).toHaveBeenCalledWith(7);
  expect(goBack).toHaveBeenCalled();
  alertSpy.mockRestore();
});

test('a lost-access refresh after leaving does not alert or go back twice', async () => {
  getShoppingList.mockReset();
  getShoppingList.mockResolvedValue([milk]);
  getListMembers.mockResolvedValue(TWO_MEMBERS);
  leaveList.mockResolvedValue();
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const goBack = jest.fn();
  const tree = await renderScreen(goBack, { isOwner: false });
  await act(async () => byTestId(tree, 'members_button').props.onPress());
  await act(async () => byTestId(tree, 'leave_list_button').props.onPress());
  const buttons = alertSpy.mock.calls[alertSpy.mock.calls.length - 1][2];
  await act(async () => {
    await buttons.find(b => b.style === 'destructive').onPress();
  });
  expect(goBack).toHaveBeenCalledTimes(1);

  alertSpy.mockClear();
  getShoppingList.mockRejectedValue(
    Object.assign(new Error('אין גישה'), { status: 403 }),
  );
  await act(async () => global.__live.refresh());

  expect(goBack).toHaveBeenCalledTimes(1);
  expect(alertSpy).not.toHaveBeenCalled();
  alertSpy.mockRestore();
});
