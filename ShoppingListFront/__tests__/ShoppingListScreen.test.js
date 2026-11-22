/* global jest, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ShoppingListScreen, {
  UNDO_MS,
} from '../src/screens/ShoppingListScreen/ShoppingListScreen';
import ShoppingListItem from '../src/components/ShoppingListItem/ShoppingListItem';
import { Alert, AppState, Text } from 'react-native';
import MembersModal from '../src/components/MembersModal/MembersModal';
import AddItemInput from '../src/components/AddItemInput/AddItemInput';
import PurchasedItemsSection from '../src/components/PurchasedItemsSection/PurchasedItemsSection';
import {
  getShoppingList,
  updateItem,
  deleteItem,
  addItem,
  reorderItems,
  getListMembers,
  removeListMember,
  leaveList,
  restorePurchased,
  clearPurchased,
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
  restorePurchased: jest.fn(),
  clearPurchased: jest.fn(),
}));

const { act } = ReactTestRenderer;

// מנתק את כל המסכים שנוצרו בבדיקה, כדי שטיימרים של פס הביטול לא ישארו פתוחים
const createdTrees = [];
const realCreate = ReactTestRenderer.create;
beforeEach(() => {
  jest.spyOn(ReactTestRenderer, 'create').mockImplementation((...args) => {
    const created = realCreate(...args);
    createdTrees.push(created);
    return created;
  });
});
afterEach(async () => {
  await act(async () => {
    createdTrees.splice(0).forEach(t => {
      try {
        t.unmount();
      } catch (e) {
        // כבר נותק בבדיקה עצמה
      }
    });
  });
  ReactTestRenderer.create.mockRestore();
});

const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
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

test('a refresh that started before a drag began is discarded', async () => {
  getShoppingList.mockReset();
  getShoppingList.mockResolvedValueOnce([milk]);
  const tree = await renderScreen();

  const stale = deferred();
  getShoppingList.mockReturnValueOnce(stale.promise);
  let refreshing;
  await act(async () => {
    refreshing = global.__live.refresh();
  });
  await act(async () => global.__listProps.onDragBegin());
  await act(async () => {
    stale.resolve([milk, eggs]);
    await refreshing;
  });

  expect(names(tree)).toEqual(['חלב']);
});

test('losing access on the initial load and on a refresh gives one message and one goBack', async () => {
  getShoppingList.mockReset();
  const err = Object.assign(new Error('x'), { status: 403 });
  getShoppingList.mockRejectedValue(err);
  const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const goBack = jest.fn();
  await renderScreen(goBack);
  await act(async () => global.__live.refresh());

  expect(alertSpy).toHaveBeenCalledTimes(1);
  expect(alertSpy.mock.calls[0][1]).toBe('אין לך יותר גישה לרשימה הזו');
  expect(goBack).toHaveBeenCalledTimes(1);
  alertSpy.mockRestore();
});

// ---- ביטול פעולה (מחיקה וסימון כנקנה) ----
const rowFor = (tree, id) =>
  tree.root.findAllByType(ShoppingListItem).find(n => n.props.item.id === id);
const undoBar = tree =>
  tree.root.findAll(n => n.props.testID === 'undo_bar')[0];
const barText = tree =>
  undoBar(tree)
    .findAllByType(Text)
    .map(t => t.props.children)
    .join('|');
const pressUndo = async tree =>
  act(async () => byTestId(tree, 'undo_button').props.onPress());

describe('undo', () => {
  let alertSpy;
  beforeEach(() => {
    jest.useFakeTimers();
    getShoppingList.mockReset();
    getShoppingList.mockResolvedValue([milk, eggs]);
    deleteItem.mockReset();
    deleteItem.mockResolvedValue();
    updateItem.mockReset();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => {
    alertSpy.mockRestore();
    jest.useRealTimers();
  });

  test('deleting an item removes it at once without a confirmation dialog and shows the undo bar', async () => {
    const tree = await renderScreen();
    await act(async () => rowFor(tree, 1).props.onDelete());

    expect(alertSpy).not.toHaveBeenCalled();
    expect(names(tree)).toEqual(['ביצים']);
    expect(barText(tree)).toContain('המוצר נמחק');
    expect(deleteItem).not.toHaveBeenCalled();
  });

  test('the delete is sent after 5 seconds', async () => {
    const tree = await renderScreen();
    await act(async () => rowFor(tree, 1).props.onDelete());
    await act(async () => jest.advanceTimersByTime(UNDO_MS - 1));
    expect(deleteItem).not.toHaveBeenCalled();
    await act(async () => jest.advanceTimersByTime(1));

    expect(deleteItem).toHaveBeenCalledTimes(1);
    expect(deleteItem).toHaveBeenCalledWith(1);
    expect(names(tree)).toEqual(['ביצים']);
    expect(undoBar(tree)).toBeUndefined();
  });

  test('undo restores the item and never calls deleteItem', async () => {
    const tree = await renderScreen();
    await act(async () => rowFor(tree, 1).props.onDelete());
    await pressUndo(tree);
    await act(async () => jest.advanceTimersByTime(UNDO_MS * 2));

    expect(names(tree)).toEqual(['חלב', 'ביצים']);
    expect(deleteItem).not.toHaveBeenCalled();
    expect(undoBar(tree)).toBeUndefined();
    // המשמר שוחרר - רענון חי מתקבל שוב
    const cheese = { ...milk, id: 9, name: 'גבינה' };
    getShoppingList.mockResolvedValueOnce([milk, eggs, cheese]);
    await act(async () => global.__live.refresh());
    expect(names(tree)).toContain('גבינה');
  });

  test('a live refresh during a pending delete does not bring the item back', async () => {
    const tree = await renderScreen();
    await act(async () => rowFor(tree, 1).props.onDelete());
    getShoppingList.mockResolvedValue([milk, eggs]);
    await act(async () => global.__live.refresh());
    expect(names(tree)).toEqual(['ביצים']);

    await act(async () => jest.advanceTimersByTime(UNDO_MS));
    expect(names(tree)).toEqual(['ביצים']);
  });

  test('a pending delete is committed immediately when the screen unmounts', async () => {
    const tree = await renderScreen();
    await act(async () => rowFor(tree, 1).props.onDelete());
    await act(async () => tree.unmount());

    expect(deleteItem).toHaveBeenCalledTimes(1);
    expect(deleteItem).toHaveBeenCalledWith(1);
    await act(async () => jest.advanceTimersByTime(UNDO_MS * 2));
    expect(deleteItem).toHaveBeenCalledTimes(1);
  });

  test('a pending delete is committed immediately when the app goes to background', async () => {
    const remove = jest.fn();
    const addSpy = jest
      .spyOn(AppState, 'addEventListener')
      .mockImplementation(() => ({ remove }));
    const tree = await renderScreen();
    // ההאזנה האחרונה שנרשמה היא של המסך שנוצר עכשיו
    const handler = addSpy.mock.calls
      .filter(c => c[0] === 'change')
      .map(c => c[1])
      .pop();
    await act(async () => rowFor(tree, 1).props.onDelete());
    expect(deleteItem).not.toHaveBeenCalled();

    await act(async () => handler('background'));
    expect(deleteItem).toHaveBeenCalledTimes(1);
    expect(deleteItem).toHaveBeenCalledWith(1);

    await act(async () => tree.unmount());
    expect(remove).toHaveBeenCalled();
    addSpy.mockRestore();
  });

  test('a second action commits the previous pending delete', async () => {
    const tree = await renderScreen();
    await act(async () => rowFor(tree, 1).props.onDelete());
    await act(async () => rowFor(tree, 3).props.onDelete());

    expect(deleteItem).toHaveBeenCalledTimes(1);
    expect(deleteItem).toHaveBeenCalledWith(1);
    expect(names(tree)).toEqual([]);
    await act(async () => jest.advanceTimersByTime(UNDO_MS));
    expect(deleteItem).toHaveBeenCalledTimes(2);
    expect(deleteItem).toHaveBeenLastCalledWith(3);
  });

  test('a failed delete shows the item again with an error', async () => {
    deleteItem.mockRejectedValueOnce(new Error('x'));
    const tree = await renderScreen();
    await act(async () => rowFor(tree, 1).props.onDelete());
    await act(async () => jest.advanceTimersByTime(UNDO_MS));

    expect(alertSpy).toHaveBeenCalledWith('שגיאה', 'לא הצלחנו למחוק את המוצר');
    expect(names(tree)).toEqual(['חלב', 'ביצים']);
  });

  test('a failure that settles after the bar is hidden shows the item again', async () => {
    const pendingDelete = deferred();
    deleteItem.mockReturnValueOnce(pendingDelete.promise);
    const tree = await renderScreen();
    await act(async () => rowFor(tree, 1).props.onDelete());
    await act(async () => jest.advanceTimersByTime(UNDO_MS));
    expect(undoBar(tree)).toBeUndefined();
    expect(names(tree)).toEqual(['ביצים']);

    await act(async () => {
      pendingDelete.reject(new Error('x'));
    });
    expect(names(tree)).toEqual(['חלב', 'ביצים']);
  });

  test('dragging commits the pending delete and keeps the other items', async () => {
    reorderItems.mockResolvedValue();
    const tree = await renderScreen();
    await act(async () => rowFor(tree, 1).props.onDelete());
    await act(async () => global.__listProps.onDragBegin());
    expect(deleteItem).toHaveBeenCalledTimes(1);
    expect(deleteItem).toHaveBeenCalledWith(1);

    await act(async () => global.__listProps.onDragEnd({ data: [eggs] }));
    expect(names(tree)).toEqual(['ביצים']);
    expect(reorderItems).toHaveBeenCalledWith([{ id: 3, position: 0 }]);
  });

  test('adding commits the pending delete and allows re-adding the same name', async () => {
    addItem.mockReset();
    addItem.mockResolvedValue({ ...milk, id: 20 });
    const tree = await renderScreen();
    await act(async () => rowFor(tree, 1).props.onDelete());
    await act(async () => tree.root.findByType(AddItemInput).props.onAdd('חלב'));

    expect(alertSpy).not.toHaveBeenCalled();
    expect(deleteItem).toHaveBeenCalledWith(1);
    expect(addItem).toHaveBeenCalledTimes(1);
    expect(names(tree)).toEqual(['חלב', 'ביצים']);
  });

  test('changing an amount commits the pending delete', async () => {
    updateItem.mockResolvedValue({ ...eggs, amount: 2 });
    const tree = await renderScreen();
    await act(async () => rowFor(tree, 1).props.onDelete());
    await act(async () => rowFor(tree, 3).props.onUpdateAmount(2));
    expect(deleteItem).toHaveBeenCalledWith(1);
  });

  test('toggling purchased shows the undo bar, and undo sends the reverse update', async () => {
    updateItem
      .mockResolvedValueOnce({ ...milk, purchased: true })
      .mockResolvedValueOnce({ ...milk, purchased: false });
    const tree = await renderScreen();
    await act(async () => rowFor(tree, 1).props.onTogglePurchased());

    expect(updateItem).toHaveBeenNthCalledWith(1, 1, { purchased: true });
    expect(barText(tree)).toContain('סומן כנקנה');

    await pressUndo(tree);
    expect(updateItem).toHaveBeenNthCalledWith(2, 1, { purchased: false });
    expect(updateItem).toHaveBeenCalledTimes(2);
    expect(rowFor(tree, 1).props.item.purchased).toBe(false);
    expect(undoBar(tree)).toBeUndefined();
  });

  test('un-checking shows the return message and undo marks it purchased again', async () => {
    const bought = { ...milk, purchased: true };
    getShoppingList.mockResolvedValue([bought]);
    updateItem
      .mockResolvedValueOnce({ ...milk, purchased: false })
      .mockResolvedValueOnce(bought);
    const tree = await renderScreen();
    await act(async () => rowFor(tree, 1).props.onTogglePurchased());
    expect(barText(tree)).toContain('הוחזר לרשימה');
    await pressUndo(tree);
    expect(updateItem).toHaveBeenNthCalledWith(2, 1, { purchased: true });
  });

  test('the purchase undo bar disappears after 5 seconds', async () => {
    updateItem.mockResolvedValueOnce({ ...milk, purchased: true });
    const tree = await renderScreen();
    await act(async () => rowFor(tree, 1).props.onTogglePurchased());
    expect(undoBar(tree)).toBeDefined();
    await act(async () => jest.advanceTimersByTime(UNDO_MS));
    expect(undoBar(tree)).toBeUndefined();
  });
});

describe('purchased bulk actions', () => {
  const bought = { ...milk, id: 5, name: 'גבינה', purchased: true, position: 3 };
  let alertSpy;
  beforeEach(() => {
    getShoppingList.mockReset();
    getShoppingList.mockResolvedValue([milk, bought]);
    restorePurchased.mockReset();
    clearPurchased.mockReset();
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });
  afterEach(() => alertSpy.mockRestore());

  test('restore all makes purchased items unpurchased and passes listId to the input', async () => {
    restorePurchased.mockResolvedValue(1);
    const tree = await renderScreen();
    expect(tree.root.findByType(AddItemInput).props.listId).toBe(7);
    await act(async () =>
      tree.root.findByType(PurchasedItemsSection).props.onRestoreAll(),
    );
    expect(restorePurchased).toHaveBeenCalledWith(7);
    expect(rowFor(tree, 5).props.item.purchased).toBe(false);
  });

  test('clear all removes purchased items locally', async () => {
    clearPurchased.mockResolvedValue(1);
    const tree = await renderScreen();
    await act(async () =>
      tree.root.findByType(PurchasedItemsSection).props.onClearAll(),
    );
    expect(clearPurchased).toHaveBeenCalledWith(7);
    expect(names(tree)).toEqual(['חלב']);
  });

  test('a failure shows an error alert and keeps the items', async () => {
    clearPurchased.mockRejectedValue(new Error('x'));
    const tree = await renderScreen();
    await act(async () =>
      tree.root.findByType(PurchasedItemsSection).props.onClearAll(),
    );
    expect(alertSpy).toHaveBeenCalledWith('שגיאה', expect.any(String));
    expect(names(tree)).toEqual(['חלב', 'גבינה']);
  });

  test('a live refresh that returns during the action is discarded', async () => {
    const d = deferred();
    restorePurchased.mockReturnValue(d.promise);
    const tree = await renderScreen();
    await act(async () => {
      tree.root.findByType(PurchasedItemsSection).props.onRestoreAll();
    });
    getShoppingList.mockResolvedValueOnce([
      milk,
      bought,
      { ...milk, id: 9, name: 'עגבניות' },
    ]);
    await act(async () => global.__live.refresh());
    expect(names(tree)).not.toContain('עגבניות');
    await act(async () => d.resolve(1));
    expect(rowFor(tree, 5).props.item.purchased).toBe(false);
  });

  test('adding the name of a bought item un-purchases it instead of adding', async () => {
    updateItem.mockReset();
    addItem.mockReset();
    updateItem.mockResolvedValue({ ...bought, purchased: false });
    const tree = await renderScreen();
    await act(async () => tree.root.findByType(AddItemInput).props.onAdd(' גבינה '));
    expect(updateItem).toHaveBeenCalledWith(5, { purchased: false });
    expect(addItem).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
    expect(rowFor(tree, 5).props.item.purchased).toBe(false);
  });

  test('adding the name of an open item still alerts', async () => {
    addItem.mockReset();
    const tree = await renderScreen();
    await act(async () => tree.root.findByType(AddItemInput).props.onAdd('חלב'));
    expect(alertSpy).toHaveBeenCalledWith('שים לב', 'המוצר כבר קיים ברשימה');
    expect(addItem).not.toHaveBeenCalled();
  });

  test('a pending delete is committed before the bulk request', async () => {
    jest.useFakeTimers();
    try {
      deleteItem.mockReset();
      deleteItem.mockResolvedValue();
      clearPurchased.mockResolvedValue(1);
      const tree = await renderScreen();
      await act(async () => rowFor(tree, 1).props.onDelete());
      expect(undoBar(tree)).toBeDefined();
      await act(async () =>
        tree.root.findByType(PurchasedItemsSection).props.onClearAll(),
      );
      expect(deleteItem).toHaveBeenCalledWith(1);
      expect(deleteItem.mock.invocationCallOrder[0]).toBeLessThan(
        clearPurchased.mock.invocationCallOrder[0],
      );
      expect(undoBar(tree)).toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });
});
