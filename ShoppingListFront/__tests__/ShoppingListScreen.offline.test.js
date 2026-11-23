/* global jest, describe, beforeEach, afterEach, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Text } from 'react-native';
import ShoppingListScreen, {
  UNDO_MS,
} from '../src/screens/ShoppingListScreen/ShoppingListScreen';
import ShoppingListItem from '../src/components/ShoppingListItem/ShoppingListItem';
import AddItemInput from '../src/components/AddItemInput/AddItemInput';
import PurchasedItemsSection from '../src/components/PurchasedItemsSection/PurchasedItemsSection';
import EditItemModal from '../src/components/EditItemModal/EditItemModal';
import MembersModal from '../src/components/MembersModal/MembersModal';
import {
  getShoppingList,
  updateItem,
  deleteItem,
  addItem,
  reorderItems,
  restorePurchased,
  clearPurchased,
  getListCategories,
  createListCategory,
  deleteListCategory,
  getListMembers,
} from '../src/services/api';
import { saveCache, cacheKeys } from '../src/services/offlineCache';
import useLiveRefresh from '../src/hooks/useLiveRefresh';

jest.mock('react-native-draggable-flatlist', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  const MockDraggableFlatList = props => {
    const { data, renderItem, ListHeaderComponent, ListFooterComponent } =
      props;
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

jest.mock('../src/hooks/useLiveRefresh', () => ({
  __esModule: true,
  default: jest.fn(),
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
  getListCategories: jest.fn(),
  createListCategory: jest.fn(),
  deleteListCategory: jest.fn(),
}));

const { act } = ReactTestRenderer;
const BLOCKED = ['אין חיבור לאינטרנט', 'אפשר רק לצפות ברשימה עד שהחיבור יחזור'];
const BANNER_TEXT = 'אין חיבור לאינטרנט — מוצגת הגרסה האחרונה שנשמרה';

const milk = { id: 1, name: 'חלב', amount: 1, purchased: false, position: 0 };
const eggs = { id: 3, name: 'ביצים', amount: 1, purchased: false, position: 2 };
const bread = { id: 4, name: 'לחם', amount: 1, purchased: true, position: 3 };
const networkError = () =>
  Object.assign(new Error('אין חיבור'), { network: true });
const serverError = () => Object.assign(new Error('boom'), { status: 500 });

const createdTrees = [];
let alertSpy;
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  getShoppingList.mockReset();
  getListCategories.mockReset();
  getListCategories.mockResolvedValue([]);
  getListMembers.mockResolvedValue([]);
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  const realCreate = ReactTestRenderer.create;
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
        // כבר נותק
      }
    });
  });
  ReactTestRenderer.create.mockRestore();
  alertSpy.mockRestore();
});

const renderScreen = async () => {
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
  return tree;
};
const refresh = () => useLiveRefresh.mock.calls.slice(-1)[0][0];
const names = tree =>
  tree.root.findAllByType(ShoppingListItem).map(n => n.props.item.name);
const row = (tree, id) =>
  tree.root.findAllByType(ShoppingListItem).find(n => n.props.item.id === id);
const byId = (tree, id) => tree.root.findAll(n => n.props.testID === id)[0];
const banner = tree => byId(tree, 'offline_banner');
const seed = async () => {
  await saveCache(cacheKeys.items(7), [milk, eggs]);
  await saveCache(cacheKeys.categories(7), []);
};

// מסך שנפתח ללא רשת עם מטמון - במצב לא מקוון
const offlineScreen = async () => {
  await seed();
  getShoppingList.mockRejectedValue(networkError());
  const tree = await renderScreen();
  expect(banner(tree)).toBeDefined();
  return tree;
};
const expectBlocked = () => {
  expect(alertSpy).toHaveBeenCalledWith(...BLOCKED);
};

describe('loading', () => {
  test('a network error with a cache shows the cached items and the banner', async () => {
    const tree = await offlineScreen();
    expect(names(tree)).toEqual(['חלב', 'ביצים']);
    expect(banner(tree).findAllByType(Text)[0].props.children).toBe(
      BANNER_TEXT,
    );
    expect(alertSpy).not.toHaveBeenCalled();
  });

  test('successful loads save a cache and show no banner', async () => {
    getShoppingList.mockResolvedValue([milk]);
    const tree = await renderScreen();
    expect(banner(tree)).toBeUndefined();
    expect(JSON.parse(await AsyncStorage.getItem('@cache_items_7'))).toEqual([
      milk,
    ]);
  });

  test('a network error with no cache keeps the error alert and no banner', async () => {
    getShoppingList.mockRejectedValue(networkError());
    const tree = await renderScreen();
    expect(alertSpy).toHaveBeenCalledWith(
      'שגיאה',
      'לא הצלחנו לטעון את המוצרים לרשימה זו.',
    );
    expect(banner(tree)).toBeUndefined();
  });

  test('a 500 does not show the cache or the banner', async () => {
    await seed();
    getShoppingList.mockRejectedValue(serverError());
    const tree = await renderScreen();
    expect(banner(tree)).toBeUndefined();
    expect(names(tree)).toEqual([]);
    expect(alertSpy).toHaveBeenCalledWith(
      'שגיאה',
      'לא הצלחנו לטעון את המוצרים לרשימה זו.',
    );
  });

  test('a 500 during a refresh keeps the current state without the banner', async () => {
    getShoppingList.mockResolvedValueOnce([milk]);
    const tree = await renderScreen();
    await seed();
    getShoppingList.mockRejectedValue(serverError());
    await act(async () => refresh()());
    expect(banner(tree)).toBeUndefined();
    expect(names(tree)).toEqual(['חלב']);
  });

  test('a refresh that hits a network error keeps the on-screen items and shows the banner', async () => {
    getShoppingList.mockResolvedValueOnce([milk]);
    const tree = await renderScreen();
    await saveCache(cacheKeys.items(7), [milk, eggs]);
    getShoppingList.mockRejectedValue(networkError());
    await act(async () => refresh()());
    expect(banner(tree)).toBeDefined();
    expect(names(tree)).toEqual(['חלב']);
  });

  test('my own successful change survives a network-error refresh', async () => {
    getShoppingList.mockResolvedValueOnce([milk, eggs]);
    const tree = await renderScreen();
    updateItem.mockResolvedValue({ ...milk, purchased: true });
    await act(async () => row(tree, 1).props.onTogglePurchased());
    getShoppingList.mockRejectedValue(networkError());
    await act(async () => refresh()());
    expect(banner(tree)).toBeDefined();
    expect(row(tree, 1).props.item.purchased).toBe(true);
  });

  test('a successful refresh clears the banner and re-enables editing', async () => {
    const tree = await offlineScreen();
    getShoppingList.mockResolvedValue([milk, eggs, bread]);
    await act(async () => refresh()());
    expect(banner(tree)).toBeUndefined();
    expect(tree.root.findByType(AddItemInput).props.editable).toBe(true);

    updateItem.mockResolvedValue({ ...milk, amount: 2 });
    await act(async () => row(tree, 1).props.onUpdateAmount(2));
    expect(updateItem).toHaveBeenCalledTimes(1);
  });

  test('categories served from the cache also put the screen offline', async () => {
    await saveCache(cacheKeys.categories(7), [{ id: 5, name: 'חדשה' }]);
    getShoppingList.mockResolvedValue([milk]);
    getListCategories.mockRejectedValue(networkError());
    const tree = await renderScreen();
    expect(banner(tree)).toBeDefined();
    expect(tree.root.findByType(EditItemModal).props.categories).toEqual([
      { id: 5, name: 'חדשה' },
    ]);
  });

  test('a categories error that is not a network error keeps the old behaviour', async () => {
    getShoppingList.mockResolvedValue([milk]);
    getListCategories.mockRejectedValue(serverError());
    const tree = await renderScreen();
    expect(banner(tree)).toBeUndefined();
    expect(alertSpy).not.toHaveBeenCalled();
  });
});

describe('view-only while offline', () => {
  test('the add input is not editable', async () => {
    const tree = await offlineScreen();
    expect(tree.root.findByType(AddItemInput).props.editable).toBe(false);
  });

  test('the items receive the disabled flag', async () => {
    const tree = await offlineScreen();
    expect(row(tree, 1).props.disabled).toBe(true);
  });

  test('add shows the alert and sends nothing', async () => {
    const tree = await offlineScreen();
    await act(async () => tree.root.findByType(AddItemInput).props.onAdd('לחם'));
    expectBlocked();
    expect(addItem).not.toHaveBeenCalled();
  });

  test('toggle, amount and delete show the alert and send nothing', async () => {
    const tree = await offlineScreen();
    await act(async () => row(tree, 1).props.onTogglePurchased());
    await act(async () => row(tree, 1).props.onUpdateAmount(3));
    await act(async () => row(tree, 1).props.onDelete());
    expect(alertSpy).toHaveBeenCalledTimes(3);
    expectBlocked();
    expect(updateItem).not.toHaveBeenCalled();
    expect(deleteItem).not.toHaveBeenCalled();
    expect(names(tree)).toEqual(['חלב', 'ביצים']);
  });

  test('edit does not open the modal and sends nothing', async () => {
    const tree = await offlineScreen();
    await act(async () => row(tree, 1).props.onEdit());
    expectBlocked();
    expect(tree.root.findByType(EditItemModal).props.visible).toBe(false);
    await act(async () =>
      tree.root.findByType(EditItemModal).props.onSave({ name: 'x' }),
    );
    expect(updateItem).not.toHaveBeenCalled();
  });

  test('restore all and clear purchased show the alert and send nothing', async () => {
    await saveCache(cacheKeys.items(7), [milk, bread]);
    getShoppingList.mockRejectedValue(networkError());
    const tree = await renderScreen();
    const section = tree.root.findByType(PurchasedItemsSection);
    expect(section.props.disabled).toBe(true);
    await act(async () => section.props.onRestoreAll());
    await act(async () => section.props.onClearAll());
    expect(alertSpy).toHaveBeenCalledTimes(2);
    expectBlocked();
    expect(restorePurchased).not.toHaveBeenCalled();
    expect(clearPurchased).not.toHaveBeenCalled();
  });

  test('category create and delete show the alert and send nothing', async () => {
    const tree = await offlineScreen();
    const modal = tree.root.findByType(EditItemModal);
    let created;
    let deleted;
    await act(async () => {
      created = await modal.props.onCreateCategory('חדשה');
      deleted = await modal.props.onDeleteCategory({ id: 5 });
    });
    expect(created).toBeUndefined();
    expect(deleted).toBe(false);
    expectBlocked();
    expect(createListCategory).not.toHaveBeenCalled();
    expect(deleteListCategory).not.toHaveBeenCalled();
  });

  test('the members button shows the alert and does not open the modal', async () => {
    const tree = await offlineScreen();
    await act(async () => byId(tree, 'members_button').props.onPress());
    expectBlocked();
    expect(tree.root.findByType(MembersModal).props.visible).toBe(false);
  });

  test('dragging shows the alert and does not send the new order', async () => {
    const tree = await offlineScreen();
    await act(async () => global.__listProps.onDragBegin());
    await act(async () => global.__listProps.onDragEnd({ data: [eggs, milk] }));
    expectBlocked();
    expect(reorderItems).not.toHaveBeenCalled();
    expect(names(tree)).toEqual(['חלב', 'ביצים']);
  });

  test('the live refresh keeps working and recovers by itself', async () => {
    const tree = await offlineScreen();
    getShoppingList.mockResolvedValue([milk]);
    await act(async () => refresh()());
    expect(banner(tree)).toBeUndefined();
    expect(names(tree)).toEqual(['חלב']);
  });
});

describe('a network error during a mutation', () => {
  const online = async () => {
    getShoppingList.mockResolvedValue([milk, eggs]);
    return renderScreen();
  };

  test('toggle flips to offline with the blocked alert only', async () => {
    const tree = await online();
    updateItem.mockRejectedValue(networkError());
    await act(async () => row(tree, 1).props.onTogglePurchased());
    expect(banner(tree)).toBeDefined();
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expectBlocked();
  });

  test('add flips to offline with the blocked alert only', async () => {
    const tree = await online();
    addItem.mockRejectedValue(networkError());
    await act(async () => tree.root.findByType(AddItemInput).props.onAdd('לחם'));
    expect(banner(tree)).toBeDefined();
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expectBlocked();
  });

  test('a server error shows the generic alert and no banner', async () => {
    const tree = await online();
    updateItem.mockRejectedValue(serverError());
    await act(async () => row(tree, 1).props.onTogglePurchased());
    expect(banner(tree)).toBeUndefined();
    expect(alertSpy).toHaveBeenCalledWith('שגיאה', 'לא הצלחנו לעדכן את המוצר');
  });

  test('a pending delete that fails with a network error brings the item back', async () => {
    jest.useFakeTimers();
    try {
      const tree = await online();
      deleteItem.mockRejectedValue(networkError());
      await act(async () => row(tree, 1).props.onDelete());
      expect(names(tree)).toEqual(['ביצים']);
      await act(async () => jest.advanceTimersByTime(UNDO_MS));
      expect(names(tree)).toEqual(['חלב', 'ביצים']);
      expect(banner(tree)).toBeDefined();
      expect(alertSpy).toHaveBeenCalledTimes(1);
      expectBlocked();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('no sends after an async gap', () => {
  test('add after a pending delete failed with a network error sends nothing and alerts once', async () => {
    jest.useFakeTimers();
    try {
      getShoppingList.mockResolvedValue([milk, eggs]);
      const tree = await renderScreen();
      deleteItem.mockRejectedValue(networkError());
      await act(async () => row(tree, 1).props.onDelete());
      await act(async () =>
        tree.root.findByType(AddItemInput).props.onAdd('לחם'),
      );
      expect(addItem).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledTimes(1);
      expectBlocked();
      expect(banner(tree)).toBeDefined();
    } finally {
      jest.useRealTimers();
    }
  });

  test('restore all after a pending delete failed with a network error sends nothing', async () => {
    jest.useFakeTimers();
    try {
      getShoppingList.mockResolvedValue([milk, bread]);
      const tree = await renderScreen();
      deleteItem.mockRejectedValue(networkError());
      await act(async () => row(tree, 1).props.onDelete());
      await act(async () =>
        tree.root.findByType(PurchasedItemsSection).props.onRestoreAll(),
      );
      expect(restorePurchased).not.toHaveBeenCalled();
      expect(alertSpy).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  test('several mutations failing together show a single alert', async () => {
    getShoppingList.mockResolvedValue([milk, eggs]);
    const tree = await renderScreen();
    updateItem.mockRejectedValue(networkError());
    await act(async () => {
      row(tree, 1).props.onTogglePurchased();
      row(tree, 3).props.onTogglePurchased();
      row(tree, 1).props.onUpdateAmount(4);
    });
    expect(alertSpy).toHaveBeenCalledTimes(1);
  });

  test('restore and clear receive the offline guard', async () => {
    const tree = await offlineScreen();
    const section = tree.root.findByType(PurchasedItemsSection);
    expect(section.props.blockIfOffline()).toBe(true);
    expectBlocked();
  });
});

describe('initial load grace period', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const hangingLoad = () => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    getShoppingList.mockReturnValueOnce(promise);
    return { resolve, reject };
  };

  test('shows the cache offline after 10 seconds, then goes online when the request succeeds', async () => {
    await seed();
    const request = hangingLoad();
    const tree = await renderScreen();
    expect(names(tree)).toEqual([]);
    expect(banner(tree)).toBeUndefined();
    await act(async () => jest.advanceTimersByTimeAsync(10000));
    expect(names(tree)).toEqual(['חלב', 'ביצים']);
    expect(banner(tree)).toBeDefined();
    await act(async () => request.resolve([milk]));
    expect(names(tree)).toEqual(['חלב']);
    expect(banner(tree)).toBeUndefined();
  });

  test('a late network error keeps the cache and the banner', async () => {
    await seed();
    const request = hangingLoad();
    const tree = await renderScreen();
    await act(async () => jest.advanceTimersByTimeAsync(10000));
    await act(async () => request.reject(networkError()));
    expect(names(tree)).toEqual(['חלב', 'ביצים']);
    expect(banner(tree)).toBeDefined();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  test('a late server error keeps the existing error alert', async () => {
    await seed();
    const request = hangingLoad();
    await renderScreen();
    await act(async () => jest.advanceTimersByTimeAsync(10000));
    await act(async () => request.reject(serverError()));
    expect(alertSpy).toHaveBeenCalledWith(
      'שגיאה',
      'לא הצלחנו לטעון את המוצרים לרשימה זו.',
    );
  });

  test('no cache means no early fallback', async () => {
    const request = hangingLoad();
    const tree = await renderScreen();
    await act(async () => jest.advanceTimersByTimeAsync(30000));
    expect(banner(tree)).toBeUndefined();
    expect(names(tree)).toEqual([]);
    await act(async () => request.resolve([milk]));
    expect(names(tree)).toEqual(['חלב']);
  });

  test('unmounting before 10 seconds cancels the fallback', async () => {
    await seed();
    hangingLoad();
    const tree = await renderScreen();
    await act(async () => tree.unmount());
    await act(async () => jest.advanceTimersByTimeAsync(20000));
    expect(alertSpy).not.toHaveBeenCalled();
  });
});

describe('grace period never overwrites newer data', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const hang = mock => {
    let resolve;
    const promise = new Promise(res => {
      resolve = res;
    });
    mock.mockReturnValueOnce(promise);
    return { resolve };
  };

  test('a late initial response does not replace data from a later refresh or my change', async () => {
    await seed();
    const initial = hang(getShoppingList);
    const tree = await renderScreen();
    await act(async () => jest.advanceTimersByTimeAsync(10000));
    expect(banner(tree)).toBeDefined();
    getShoppingList.mockResolvedValue([milk, eggs, bread]);
    await act(async () => refresh()());
    expect(banner(tree)).toBeUndefined();
    updateItem.mockResolvedValue({ ...milk, purchased: true });
    await act(async () => row(tree, 1).props.onTogglePurchased());
    await act(async () => initial.resolve([milk]));
    expect(names(tree).sort()).toEqual(['ביצים', 'חלב', 'לחם']);
    expect(row(tree, 1).props.item.purchased).toBe(true);
    expect(banner(tree)).toBeUndefined();
  });

  test('the grace does not go offline when server data is already on screen', async () => {
    await seed();
    hang(getShoppingList);
    const tree = await renderScreen();
    getShoppingList.mockResolvedValue([milk]);
    await act(async () => refresh()());
    await act(async () => jest.advanceTimersByTimeAsync(10000));
    expect(banner(tree)).toBeUndefined();
    expect(names(tree)).toEqual(['חלב']);
  });

  test('cached categories appear during the early offline view', async () => {
    await seed();
    await saveCache(cacheKeys.categories(7), [{ id: 5, name: 'חדשה' }]);
    hang(getShoppingList);
    hang(getListCategories);
    const tree = await renderScreen();
    await act(async () => jest.advanceTimersByTimeAsync(10000));
    expect(tree.root.findByType(EditItemModal).props.categories).toEqual([
      { id: 5, name: 'חדשה' },
    ]);
  });
});
