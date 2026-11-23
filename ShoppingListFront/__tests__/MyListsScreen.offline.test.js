/* global jest, describe, beforeEach, afterEach, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Text, TextInput, TouchableOpacity } from 'react-native';
import MyListsScreen from '../src/screens/MyListsScreen/MyListsScreen';
import JoinListModal from '../src/components/JoinListModal/JoinListModal';
import {
  getShoppingLists,
  deleteShoppingList,
  createShoppingList,
  duplicateList,
  updateShoppingList,
  joinListByCode,
} from '../src/services/api';
import { saveCache, cacheKeys } from '../src/services/offlineCache';
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
const BLOCKED = ['אין חיבור לאינטרנט', 'אפשר רק לצפות ברשימה עד שהחיבור יחזור'];
const BANNER_TEXT = 'אין חיבור לאינטרנט — מוצגת הגרסה האחרונה שנשמרה';

const LISTS = [
  { id: 1, name: 'שלי', owner_id: 1, is_owner: true },
  { id: 2, name: 'של אמא', owner_id: 2, is_owner: false },
];
const networkError = () =>
  Object.assign(new Error('אין חיבור'), { network: true });
const serverError = () => Object.assign(new Error('boom'), { status: 500 });

let tree;
let alertSpy;

const renderScreen = async () => {
  await act(async () => {
    tree = ReactTestRenderer.create(
      <MyListsScreen navigation={{ navigate: jest.fn() }} />,
    );
  });
};
const byTestId = id => tree.root.findAll(n => n.props.testID === id)[0];
const banner = () => byTestId('offline_banner');
const refresh = () => useLiveRefresh.mock.calls.slice(-1)[0][0];
const listNames = () => [
  ...new Set(
    tree.root
      .findAll(n => n.props.testID === 'list_card')
      .map(card => card.findAllByType(Text)[0].props.children),
  ),
];
const expectBlocked = () => {
  expect(alertSpy).toHaveBeenCalledWith(...BLOCKED);
};
// פותח את המסך מחובר, ואז מפיל את הרשת ברענון
const goOffline = async () => {
  await renderScreen();
  await saveCache(cacheKeys.lists, LISTS);
  getShoppingLists.mockRejectedValue(networkError());
  await act(async () => refresh()());
  expect(banner()).toBeDefined();
};

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  getShoppingLists.mockReset();
  getShoppingLists.mockResolvedValue(LISTS);
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(async () => {
  await act(async () => tree.unmount());
  alertSpy.mockRestore();
});

describe('loading', () => {
  test('opening with no network shows the cached lists and the banner', async () => {
    await saveCache(cacheKeys.lists, LISTS);
    getShoppingLists.mockRejectedValue(networkError());
    await renderScreen();
    expect(listNames()).toEqual(['שלי', 'של אמא']);
    expect(banner().findAllByType(Text)[0].props.children).toBe(BANNER_TEXT);
    expect(alertSpy).not.toHaveBeenCalled();
  });

  test('a successful load saves the cache and shows no banner', async () => {
    await renderScreen();
    expect(banner()).toBeUndefined();
    expect(JSON.parse(await AsyncStorage.getItem('@cache_lists'))).toEqual(
      LISTS,
    );
  });

  test('a network error with no cache keeps the error alert and no banner', async () => {
    getShoppingLists.mockRejectedValue(networkError());
    await renderScreen();
    expect(alertSpy).toHaveBeenCalledWith(
      'שגיאה',
      'לא הצלחנו לטעון את הרשימות שלך.',
    );
    expect(banner()).toBeUndefined();
  });

  test('a 500 does not show the cache or the banner', async () => {
    await saveCache(cacheKeys.lists, LISTS);
    getShoppingLists.mockRejectedValue(serverError());
    await renderScreen();
    expect(banner()).toBeUndefined();
    expect(listNames()).toEqual([]);
  });

  test('a successful refresh clears the banner', async () => {
    await goOffline();
    getShoppingLists.mockResolvedValue([LISTS[0]]);
    await act(async () => refresh()());
    expect(banner()).toBeUndefined();
    expect(listNames()).toEqual(['שלי']);
  });

  test('a network-error refresh keeps the on-screen lists and shows the banner', async () => {
    await renderScreen();
    await saveCache(cacheKeys.lists, [LISTS[0]]);
    getShoppingLists.mockRejectedValue(networkError());
    await act(async () => refresh()());
    expect(banner()).toBeDefined();
    expect(listNames()).toEqual(['שלי', 'של אמא']);
  });

  test('the new-list input is not editable while offline', async () => {
    await goOffline();
    expect(byTestId('new_list_input').props.editable).toBe(false);
  });

  test('a 500 refresh does not flip to offline', async () => {
    await renderScreen();
    await saveCache(cacheKeys.lists, [LISTS[0]]);
    getShoppingLists.mockRejectedValue(serverError());
    await act(async () => {
      await refresh()().catch(() => {});
    });
    expect(banner()).toBeUndefined();
    expect(listNames()).toEqual(['שלי', 'של אמא']);
  });
});

describe('view-only while offline', () => {
  test('create shows the alert and sends nothing', async () => {
    await goOffline();
    await act(async () =>
      byTestId('new_list_input').props.onChangeText('חדשה'),
    );
    await act(async () => byTestId('create_list_button').props.onPress());
    expectBlocked();
    expect(createShoppingList).not.toHaveBeenCalled();
  });

  test('the list menu shows the alert instead of opening', async () => {
    await goOffline();
    await act(async () => byTestId('list_menu_1').props.onPress());
    expectBlocked();
    expect(byTestId('menu_duplicate')).toBeUndefined();
  });

  // דרך רכיב ה-host: accessibilityState.disabled היה חוסם את הלחיצה האמיתית
  test('the menu and create buttons answer a real press with the alert', async () => {
    await goOffline();
    const host = id =>
      tree.root.find(n => typeof n.type === 'string' && n.props.testID === id);
    const menu = host('list_menu_1');
    expect(menu.props.onStartShouldSetResponder()).toBe(true);
    await act(async () => menu.props.onClick({ stopPropagation: () => {} }));
    expectBlocked();
    alertSpy.mockClear();
    const create = host('create_list_button');
    expect(create.props.onStartShouldSetResponder()).toBe(true);
    await act(async () => create.props.onClick({ stopPropagation: () => {} }));
    expectBlocked();
  });

  test('join shows the alert and does not open the modal', async () => {
    await goOffline();
    await act(async () => byTestId('join_list_link').props.onPress());
    expectBlocked();
    expect(tree.root.findByType(JoinListModal).props.visible).toBe(false);
    expect(joinListByCode).not.toHaveBeenCalled();
  });

  // התפריט נפתח כשהיה חיבור, ואז הרשת נפלה לפני הבחירה
  const menuOpenThenOffline = async () => {
    await renderScreen();
    await act(async () => byTestId('list_menu_1').props.onPress());
    await saveCache(cacheKeys.lists, LISTS);
    getShoppingLists.mockRejectedValue(networkError());
    await act(async () => refresh()());
    expect(banner()).toBeDefined();
  };

  test('duplicate from an already open menu is blocked', async () => {
    await menuOpenThenOffline();
    await act(async () => byTestId('menu_duplicate').props.onPress());
    expectBlocked();
    expect(duplicateList).not.toHaveBeenCalled();
  });

  test('rename from an already open menu is blocked', async () => {
    await menuOpenThenOffline();
    await act(async () => byTestId('menu_rename').props.onPress());
    expectBlocked();
    expect(byTestId('rename_save_button')).toBeUndefined();
  });

  test('delete from an already open menu is blocked', async () => {
    await menuOpenThenOffline();
    await act(async () => byTestId('menu_delete').props.onPress());
    expectBlocked();
    expect(deleteShoppingList).not.toHaveBeenCalled();
  });

  test('saving a rename that was opened online is blocked', async () => {
    await renderScreen();
    await act(async () => byTestId('list_menu_1').props.onPress());
    await act(async () => byTestId('menu_rename').props.onPress());
    await saveCache(cacheKeys.lists, LISTS);
    getShoppingLists.mockRejectedValue(networkError());
    await act(async () => refresh()());
    await act(async () =>
      tree.root
        .findAllByType(TextInput)
        .find(i => i.props.value === 'שלי')
        .props.onChangeText('שם חדש'),
    );
    const save = tree.root.findAll(
      n =>
        n.type === TouchableOpacity && n.props.testID === 'rename_save_button',
    )[0];
    await act(async () => save.props.onPress());
    expectBlocked();
    expect(updateShoppingList).not.toHaveBeenCalled();
  });
});

describe('a network error during a mutation', () => {
  test('create flips to offline with the blocked alert only', async () => {
    await renderScreen();
    createShoppingList.mockRejectedValue(networkError());
    await act(async () =>
      byTestId('new_list_input').props.onChangeText('חדשה'),
    );
    await act(async () => byTestId('create_list_button').props.onPress());
    expect(banner()).toBeDefined();
    expect(alertSpy).toHaveBeenCalledTimes(1);
    expectBlocked();
  });

  test('a server error on create shows the generic alert and no banner', async () => {
    await renderScreen();
    createShoppingList.mockRejectedValue(serverError());
    await act(async () =>
      byTestId('new_list_input').props.onChangeText('חדשה'),
    );
    await act(async () => byTestId('create_list_button').props.onPress());
    expect(banner()).toBeUndefined();
    expect(alertSpy).toHaveBeenCalledWith('שגיאה', 'לא הצלחנו ליצור רשימה חדשה');
  });

  test('duplicate flips to offline with the blocked alert only', async () => {
    await renderScreen();
    duplicateList.mockRejectedValue(networkError());
    await act(async () => byTestId('list_menu_1').props.onPress());
    await act(async () => byTestId('menu_duplicate').props.onPress());
    expect(banner()).toBeDefined();
    expect(alertSpy).toHaveBeenCalledTimes(1);
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
    getShoppingLists.mockReturnValueOnce(promise);
    return { resolve, reject };
  };

  test('shows the cache offline after 10 seconds, then goes online when the request succeeds', async () => {
    await saveCache(cacheKeys.lists, LISTS);
    const request = hangingLoad();
    await renderScreen();
    expect(banner()).toBeUndefined();
    await act(async () => jest.advanceTimersByTimeAsync(10000));
    expect(listNames()).toEqual(['שלי', 'של אמא']);
    expect(banner()).toBeDefined();
    await act(async () => request.resolve([LISTS[0]]));
    expect(listNames()).toEqual(['שלי']);
    expect(banner()).toBeUndefined();
  });

  test('a late network error keeps the cache and the banner', async () => {
    await saveCache(cacheKeys.lists, LISTS);
    const request = hangingLoad();
    await renderScreen();
    await act(async () => jest.advanceTimersByTimeAsync(10000));
    await act(async () => request.reject(networkError()));
    expect(listNames()).toEqual(['שלי', 'של אמא']);
    expect(banner()).toBeDefined();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  test('a late server error keeps the existing error alert', async () => {
    await saveCache(cacheKeys.lists, LISTS);
    const request = hangingLoad();
    await renderScreen();
    await act(async () => jest.advanceTimersByTimeAsync(10000));
    await act(async () => request.reject(serverError()));
    expect(alertSpy).toHaveBeenCalledWith(
      'שגיאה',
      'לא הצלחנו לטעון את הרשימות שלך.',
    );
  });

  test('no cache means no early fallback', async () => {
    const request = hangingLoad();
    await renderScreen();
    await act(async () => jest.advanceTimersByTimeAsync(30000));
    expect(banner()).toBeUndefined();
    await act(async () => request.resolve([LISTS[0]]));
    expect(listNames()).toEqual(['שלי']);
  });
});

describe('grace period never overwrites newer data', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const hang = () => {
    let resolve;
    const promise = new Promise(res => {
      resolve = res;
    });
    getShoppingLists.mockReturnValueOnce(promise);
    return { resolve };
  };

  test('a late initial response does not replace data from a later refresh', async () => {
    await saveCache(cacheKeys.lists, LISTS);
    const initial = hang();
    await renderScreen();
    await act(async () => jest.advanceTimersByTimeAsync(10000));
    expect(banner()).toBeDefined();
    getShoppingLists.mockResolvedValue([LISTS[0], { id: 9, name: 'חדשה' }]);
    await act(async () => refresh()());
    await act(async () => initial.resolve([LISTS[0]]));
    expect(listNames()).toEqual(['שלי', 'חדשה']);
    expect(banner()).toBeUndefined();
  });

  test('the grace does not go offline when server data is already on screen', async () => {
    await saveCache(cacheKeys.lists, LISTS);
    hang();
    await renderScreen();
    getShoppingLists.mockResolvedValue([LISTS[0]]);
    await act(async () => refresh()());
    await act(async () => jest.advanceTimersByTimeAsync(10000));
    expect(banner()).toBeUndefined();
    expect(listNames()).toEqual(['שלי']);
  });
});
