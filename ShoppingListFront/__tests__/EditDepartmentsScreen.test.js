/* global jest, describe, test, expect, beforeEach, afterEach */
import fs from 'fs';
import path from 'path';
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Alert, TouchableOpacity, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EditDepartmentsScreen from '../src/screens/EditDepartmentsScreen/EditDepartmentsScreen';
import { EMOJI_OPTIONS } from '../src/components/EmojiPicker/EmojiPicker';
import { BUILTIN_CATEGORIES } from '../src/services/categories';
import { saveCache, cacheKeys } from '../src/services/offlineCache';
import {
  getListCategories,
  saveCategoryLayout,
  createListCategory,
  deleteListCategory,
} from '../src/services/api';

// הרשימה הנגררת מוחלפת ברכיב פשוט: מציג כותרת, שורות ותחתית, ושומר את ה-props
// (כדי שאפשר יהיה לקרוא ל-onDragEnd עם סדר חדש)
jest.mock('react-native-draggable-flatlist', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  const MockList = props => {
    global.__dragProps = props;
    return ReactLib.createElement(
      View,
      { testID: 'draggable' },
      props.ListHeaderComponent,
      props.data.map((row, index) =>
        ReactLib.createElement(
          ReactLib.Fragment,
          { key: props.keyExtractor(row) },
          props.renderItem({
            item: row,
            drag: global.__drag,
            isActive: false,
            getIndex: () => index,
          }),
        ),
      ),
      props.ListFooterComponent,
    );
  };
  return { __esModule: true, default: MockList };
});

jest.mock('../src/services/api', () => ({
  getListCategories: jest.fn(),
  saveCategoryLayout: jest.fn(),
  createListCategory: jest.fn(),
  deleteListCategory: jest.fn(),
}));

const { act } = ReactTestRenderer;
const BLOCKED = ['אין חיבור לאינטרנט', 'אפשר רק לצפות ברשימה עד שהחיבור יחזור'];

// הפריסה המלאה מהשרת: כל 11 המובנות ועוד מחלקה מותאמת, "אחר" אחרונה
const LAYOUT = [
  { key: 'bakery', name: null, icon: null, position: 0 },
  { key: 'produce', name: null, icon: null, position: 1 },
  { key: 'dairy', name: 'מקררים', icon: null, position: 2 },
  { key: 'meat', name: null, icon: null, position: 3 },
  { key: 'pantry', name: null, icon: null, position: 4 },
  { key: 'frozen', name: null, icon: '🍦', position: 5 },
  { key: 'drinks', name: null, icon: null, position: 6 },
  { key: 'snacks', name: null, icon: null, position: 7 },
  { key: 'cleaning', name: null, icon: null, position: 8 },
  { key: 'care', name: null, icon: null, position: 9 },
  { key: 'custom:5', name: null, icon: '🎁', position: 10 },
  { key: 'other', name: null, icon: null, position: 11 },
];
const CUSTOM = [{ id: 5, name: 'מתנות', color: '#123456', icon: '🎁' }];
const ALL_KEYS = LAYOUT.map(e => e.key);
// מוצגות כל המחלקות (גם מובנות בלי מוצרים), בסדר הפריסה. "אחר" בנפרד, אחרונה
const VISIBLE = ALL_KEYS.filter(k => k !== 'other');
const withoutKey = key => VISIBLE.filter(k => k !== key);
const SERVER_ERROR = { title: 'המחלקות עודכנו על ידי מישהו אחר' };

const trees = [];
let alertSpy;
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  global.__drag = jest.fn();
  global.__dragProps = undefined;
  getListCategories.mockResolvedValue({ custom: CUSTOM, layout: LAYOUT });
  saveCategoryLayout.mockResolvedValue(undefined);
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(async () => {
  await act(async () => {
    trees.splice(0).forEach(t => t.unmount());
  });
  alertSpy.mockRestore();
});

const mount = async (params = {}) => {
  // beforeRemove נשמר כדי לדמות יציאה מהמסך (חץ חזרה או כפתור החזרה של המכשיר)
  const listeners = {};
  const navigation = {
    goBack: jest.fn(),
    navigate: jest.fn(),
    dispatch: jest.fn(),
    addListener: jest.fn((event, cb) => {
      listeners[event] = cb;
      return () => {
        if (listeners[event] === cb) delete listeners[event];
      };
    }),
  };
  // מחזיר true אם היציאה נעצרה (preventDefault)
  navigation.leave = () => {
    const event = {
      preventDefault: jest.fn(),
      data: { action: { type: 'GO_BACK' } },
    };
    listeners.beforeRemove?.(event);
    return event;
  };
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <EditDepartmentsScreen
        route={{
          params: {
            listId: 7,
            listName: 'קניות',
            ...params,
          },
        }}
        navigation={navigation}
      />,
    );
  });
  trees.push(tree);
  return { tree, navigation };
};

const host = (tree, id) =>
  tree.root.findAll(n => n.props.testID === id && typeof n.type === 'string');
const has = (tree, id) => host(tree, id).length > 0;
// הרכיב הלחיץ עצמו (לא הצומת המצויר), שמחזיק את onPress
const pressable = (tree, id) => {
  const found = tree.root.findAll(
    n =>
      n.props.testID === id &&
      (typeof n.props.onPress === 'function' ||
        typeof n.props.onLongPress === 'function'),
  );
  if (!found.length) throw new Error(`missing ${id}`);
  return found[0];
};
const press = async (tree, id) =>
  act(async () => pressable(tree, id).props.onPress());
// לחיצה בלי לחכות לסיום הפעולה (בקשה שעדיין לא חזרה)
const pressNoWait = async (tree, id) =>
  act(async () => {
    pressable(tree, id).props.onPress();
  });
const input = (tree, id) => {
  const found = tree.root.findAll(
    n => n.props.testID === id && typeof n.props.onChangeText === 'function',
  );
  if (!found.length) throw new Error(`missing ${id}`);
  return found[0];
};
const type = async (tree, id, text) =>
  act(async () => input(tree, id).props.onChangeText(text));
const textOf = node =>
  node
    .findAll(n => n.type === 'Text')
    .map(n =>
      []
        .concat(n.props.children)
        .filter(c => typeof c === 'string' || typeof c === 'number')
        .join(''),
    )
    .join('');
const rowKeys = tree =>
  tree.root
    .findAll(
      n =>
        typeof n.type === 'string' &&
        typeof n.props.testID === 'string' &&
        n.props.testID.startsWith('department_row_'),
    )
    .map(n => n.props.testID.replace('department_row_', ''));
const rowText = (tree, key) => textOf(host(tree, `department_row_${key}`)[0]);
const lastPayload = () => {
  const calls = saveCategoryLayout.mock.calls;
  return calls[calls.length - 1][1];
};
const keysOf = payload => payload.map(e => e.key);
const entry = (payload, key) => payload.find(e => e.key === key);
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};
const dragTo = async keys => {
  const byKey = new Map(global.__dragProps.data.map(r => [r.key, r]));
  await act(async () =>
    global.__dragProps.onDragEnd({ data: keys.map(k => byKey.get(k)) }),
  );
};

describe('loading and order', () => {
  test('loads the categories of the list and shows the title', async () => {
    const { tree } = await mount();
    expect(getListCategories).toHaveBeenCalledWith(7);
    expect(textOf(host(tree, 'edit_departments_title')[0])).toBe('עריכת מחלקות');
  });

  test('shows every built-in (also with no items) and every custom one, in layout order', async () => {
    const { tree } = await mount();
    expect(rowKeys(tree)).toEqual([...VISIBLE, 'other']);
    expect(rowKeys(tree)).toHaveLength(12);
    expect(rowText(tree, 'meat')).toContain('בשר ודגים');
    expect(rowText(tree, 'dairy')).toContain('מקררים');
    expect(rowText(tree, 'dairy')).toContain('🥛');
    expect(rowText(tree, 'frozen')).toContain('🍦');
    expect(rowText(tree, 'frozen')).toContain('קפואים');
    expect(rowText(tree, 'custom:5')).toContain('מתנות');
    expect(rowText(tree, 'custom:5')).toContain('🎁');
  });

  test('"אחר" is pinned last: outside the drag list and without a handle', async () => {
    const { tree } = await mount();
    expect(global.__dragProps.data.map(r => r.key)).toEqual(VISIBLE);
    expect(has(tree, 'department_drag_other')).toBe(false);
    expect(rowText(tree, 'other')).toContain('אחר');
    // בלי התווית הגלויה: "אחר" פשוט נשארת אחרונה ובלי ידית
    expect(rowText(tree, 'other')).not.toContain('תמיד אחרונה');
  });

  test('every draggable row has a handle that starts the drag on long press', async () => {
    const { tree } = await mount();
    const handle = pressable(tree, 'department_drag_produce');
    expect(handle.props.accessibilityRole).toBe('button');
    expect(handle.props.accessibilityLabel).toBe('גרירת המחלקה פירות וירקות');
    await act(async () => handle.props.onLongPress());
    expect(global.__drag).toHaveBeenCalledTimes(1);
  });
});

describe('save', () => {
  test('save sends every key from the layout', async () => {
    const { tree } = await mount();
    await press(tree, 'edit_departments_done');
    expect(saveCategoryLayout).toHaveBeenCalledTimes(1);
    expect(saveCategoryLayout.mock.calls[0][0]).toBe(7);
    const payload = lastPayload();
    expect(keysOf(payload)).toEqual(ALL_KEYS);
    expect(entry(payload, 'dairy')).toEqual({ key: 'dairy', name: 'מקררים', icon: null });
    expect(entry(payload, 'frozen')).toEqual({ key: 'frozen', name: null, icon: '🍦' });
    expect(entry(payload, 'meat')).toEqual({ key: 'meat', name: null, icon: null });
  });

  test('waits for the save before going back', async () => {
    const save = deferred();
    saveCategoryLayout.mockReturnValue(save.promise);
    const { tree, navigation } = await mount();
    await pressNoWait(tree, 'edit_departments_done');
    expect(navigation.goBack).not.toHaveBeenCalled();
    await act(async () => save.resolve());
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('a second press while saving sends nothing more', async () => {
    const save = deferred();
    saveCategoryLayout.mockReturnValue(save.promise);
    const { tree } = await mount();
    await pressNoWait(tree, 'edit_departments_done');
    await pressNoWait(tree, 'edit_departments_done');
    expect(saveCategoryLayout).toHaveBeenCalledTimes(1);
    await act(async () => save.resolve());
  });

  test('a 409 shows the server message and stays on the screen', async () => {
    saveCategoryLayout.mockRejectedValue(
      Object.assign(new Error('המחלקות עודכנו במקביל, נסה שוב'), { status: 409 }),
    );
    const { tree, navigation } = await mount();
    await press(tree, 'edit_departments_done');
    expect(alertSpy).toHaveBeenCalledWith('שגיאה', 'המחלקות עודכנו במקביל, נסה שוב');
    expect(navigation.goBack).not.toHaveBeenCalled();
    // אפשר לנסות שוב
    saveCategoryLayout.mockResolvedValue(undefined);
    await press(tree, 'edit_departments_done');
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('a 400 shows the server message and stays on the screen', async () => {
    saveCategoryLayout.mockRejectedValue(
      Object.assign(new Error('שם המחלקה חייב להכיל 1-30 תווים'), { status: 400 }),
    );
    const { tree, navigation } = await mount();
    await press(tree, 'edit_departments_done');
    expect(alertSpy).toHaveBeenCalledWith('שגיאה', 'שם המחלקה חייב להכיל 1-30 תווים');
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  test('the back button leaves without saving', async () => {
    const { tree, navigation } = await mount();
    await press(tree, 'edit_departments_back');
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(saveCategoryLayout).not.toHaveBeenCalled();
  });
});

describe('reorder', () => {
  test('dragging reorders the rows and save sends the new full order', async () => {
    const { tree } = await mount();
    const next = ['custom:5', ...withoutKey('custom:5')];
    await dragTo(next);
    expect(rowKeys(tree)).toEqual([...next, 'other']);
    await press(tree, 'edit_departments_done');
    expect(keysOf(lastPayload())).toEqual([...next, 'other']);
  });

  test('screen-reader actions move a department up and down', async () => {
    const { tree } = await mount();
    const handle = () => pressable(tree, 'department_drag_produce');
    expect(handle().props.accessibilityActions.map(a => a.label)).toEqual([
      'הזזה למעלה',
      'הזזה למטה',
    ]);
    await act(async () =>
      handle().props.onAccessibilityAction({ nativeEvent: { actionName: 'moveUp' } }),
    );
    expect(rowKeys(tree).slice(0, 2)).toEqual(['produce', 'bakery']);
    await act(async () =>
      handle().props.onAccessibilityAction({ nativeEvent: { actionName: 'moveDown' } }),
    );
    expect(rowKeys(tree).slice(0, 2)).toEqual(['bakery', 'produce']);
  });
});

describe('rename and icon', () => {
  test('✎ opens an inline rename; confirming shows and saves the new name', async () => {
    const { tree } = await mount();
    const edit = pressable(tree, 'department_edit_produce');
    expect(edit.props.accessibilityLabel).toBe('עריכת השם והאייקון של פירות וירקות');
    await press(tree, 'department_edit_produce');
    expect(input(tree, 'department_name_input').props.value).toBe('פירות וירקות');
    expect(input(tree, 'department_name_input').props.maxLength).toBe(30);
    await type(tree, 'department_name_input', '  ירקן ');
    await press(tree, 'department_name_confirm');
    expect(has(tree, 'department_name_input')).toBe(false);
    expect(rowText(tree, 'produce')).toContain('ירקן');
    await press(tree, 'edit_departments_done');
    expect(entry(lastPayload(), 'produce')).toEqual({
      key: 'produce',
      name: 'ירקן',
      icon: null,
    });
  });

  test('clearing the name resets it to the default with name null', async () => {
    const { tree } = await mount();
    await press(tree, 'department_edit_dairy');
    expect(input(tree, 'department_name_input').props.value).toBe('מקררים');
    expect(input(tree, 'department_name_input').props.placeholder).toBe('מוצרי חלב וביצים');
    await type(tree, 'department_name_input', '   ');
    await press(tree, 'department_name_confirm');
    expect(rowText(tree, 'dairy')).toContain('מוצרי חלב וביצים');
    await press(tree, 'edit_departments_done');
    expect(entry(lastPayload(), 'dairy').name).toBeNull();
  });

  test('typing the default name back also sends name null', async () => {
    const { tree } = await mount();
    await press(tree, 'department_edit_dairy');
    await type(tree, 'department_name_input', 'מוצרי חלב וביצים');
    await press(tree, 'department_name_confirm');
    await press(tree, 'edit_departments_done');
    expect(entry(lastPayload(), 'dairy').name).toBeNull();
  });

  test('a name already shown for another department is refused', async () => {
    const { tree } = await mount();
    await press(tree, 'department_edit_produce');
    await type(tree, 'department_name_input', ' מקררים ');
    await press(tree, 'department_name_confirm');
    expect(alertSpy).toHaveBeenCalledWith('שים לב', 'קיימת כבר מחלקה בשם "מקררים"');
    expect(has(tree, 'department_name_input')).toBe(true);
  });

  test('cancel closes the rename without changing the name', async () => {
    const { tree } = await mount();
    await press(tree, 'department_edit_produce');
    await type(tree, 'department_name_input', 'משהו');
    await press(tree, 'department_name_cancel');
    expect(rowText(tree, 'produce')).toContain('פירות וירקות');
    await press(tree, 'edit_departments_done');
    expect(entry(lastPayload(), 'produce').name).toBeNull();
  });

  test('pressing סיום while renaming saves the typed name', async () => {
    const { tree } = await mount();
    await press(tree, 'department_edit_produce');
    await type(tree, 'department_name_input', 'ירקן');
    await press(tree, 'edit_departments_done');
    expect(entry(lastPayload(), 'produce').name).toBe('ירקן');
  });

  test('"אחר" can be renamed and stays last', async () => {
    const { tree } = await mount();
    await press(tree, 'department_edit_other');
    await type(tree, 'department_name_input', 'שונות');
    await press(tree, 'department_name_confirm');
    expect(rowKeys(tree)[rowKeys(tree).length - 1]).toBe('other');
    await press(tree, 'edit_departments_done');
    const payload = lastPayload();
    expect(payload[payload.length - 1]).toEqual({ key: 'other', name: 'שונות', icon: null });
  });

  test('the icon opens the emoji picker and the chosen emoji is saved', async () => {
    const { tree } = await mount();
    await press(tree, 'department_edit_produce');
    expect(has(tree, 'emoji_picker')).toBe(false);
    await press(tree, 'department_icon_produce');
    expect(has(tree, 'emoji_picker')).toBe(true);
    const options = tree.root.findAll(
      n =>
        typeof n.props.testID === 'string' &&
        n.props.testID.startsWith('emoji_option_') &&
        typeof n.props.onPress === 'function',
    );
    const count = new Set(options.map(o => o.props.testID)).size;
    expect(count).toBeGreaterThanOrEqual(36);
    expect(count).toBeLessThanOrEqual(48);
    const apple = options.find(o => o.props.accessibilityLabel === '🍎 תפוח');
    expect(apple).toBeDefined();
    await act(async () => apple.props.onPress());
    expect(has(tree, 'emoji_picker')).toBe(false);
    await press(tree, 'department_name_confirm');
    expect(rowText(tree, 'produce')).toContain('🍎');
    await press(tree, 'edit_departments_done');
    expect(entry(lastPayload(), 'produce')).toEqual({
      key: 'produce',
      name: null,
      icon: '🍎',
    });
  });

  test('the picker can return the default icon (icon null)', async () => {
    const { tree } = await mount();
    await press(tree, 'department_edit_frozen');
    await press(tree, 'department_icon_frozen');
    await press(tree, 'emoji_default');
    await press(tree, 'department_name_confirm');
    expect(rowText(tree, 'frozen')).toContain('❄️');
    await press(tree, 'edit_departments_done');
    expect(entry(lastPayload(), 'frozen').icon).toBeNull();
  });
});

describe('add and delete', () => {
  test('+ מחלקה חדשה creates the department with POST and the chosen icon', async () => {
    createListCategory.mockResolvedValue({
      id: 9,
      name: 'חיות',
      color: '#abcdef',
      icon: '🐾',
    });
    const { tree } = await mount();
    expect(textOf(host(tree, 'add_department_button')[0])).toBe('+ מחלקה חדשה');
    await press(tree, 'add_department_button');
    await type(tree, 'new_department_input', ' חיות ');
    await press(tree, 'new_department_icon');
    const paw = tree.root.findAll(
      n =>
        typeof n.props.onPress === 'function' &&
        n.props.accessibilityLabel === '🐾 חיות מחמד',
    )[0];
    await act(async () => paw.props.onPress());
    await press(tree, 'new_department_save');
    expect(createListCategory).toHaveBeenCalledWith(7, 'חיות', '🐾');
    expect(rowKeys(tree)).toEqual([...VISIBLE, 'custom:9', 'other']);
    expect(rowText(tree, 'custom:9')).toContain('🐾');
    expect(has(tree, 'new_department_input')).toBe(false);
    await press(tree, 'edit_departments_done');
    const keys = keysOf(lastPayload());
    expect(keys.slice(-2)).toEqual(['custom:9', 'other']);
    expect(keys).toHaveLength(ALL_KEYS.length + 1);
  });

  test('a new department without a chosen icon is sent with 🛒', async () => {
    createListCategory.mockResolvedValue({ id: 9, name: 'חיות', color: '#abcdef', icon: '🛒' });
    const { tree } = await mount();
    await press(tree, 'add_department_button');
    await type(tree, 'new_department_input', 'חיות');
    await press(tree, 'new_department_save');
    expect(createListCategory).toHaveBeenCalledWith(7, 'חיות', '🛒');
  });

  test('a new name that matches a shown department name is refused before POST', async () => {
    const { tree } = await mount();
    await press(tree, 'add_department_button');
    await type(tree, 'new_department_input', 'בשר ודגים');
    await press(tree, 'new_department_save');
    // מחלקה מובנית שאין בה מוצרים מוצגת, וההודעה נוקבת בשמה
    expect(alertSpy).toHaveBeenCalledWith('שים לב', 'קיימת כבר מחלקה בשם "בשר ודגים"');
    expect(createListCategory).not.toHaveBeenCalled();
  });

  test('a failed POST shows the server message', async () => {
    createListCategory.mockRejectedValue(
      Object.assign(new Error('המחלקה כבר קיימת ברשימה'), { status: 400 }),
    );
    const { tree } = await mount();
    await press(tree, 'add_department_button');
    // השרת בודק כפילות מול השמות הגולמיים, ומחזיר הודעה בעברית
    await type(tree, 'new_department_input', 'חדשה');
    await press(tree, 'new_department_save');
    expect(alertSpy).toHaveBeenCalledWith('שגיאה', 'המחלקה כבר קיימת ברשימה');
    expect(rowKeys(tree)).toEqual([...VISIBLE, 'other']);
  });

  test('long press on a custom department confirms with its display name, then deletes', async () => {
    getListCategories.mockResolvedValue({
      custom: CUSTOM,
      layout: LAYOUT.map(e => (e.key === 'custom:5' ? { ...e, name: 'מתנות חג' } : e)),
    });
    deleteListCategory.mockResolvedValue(undefined);
    const { tree } = await mount();
    await act(async () => pressable(tree, 'department_name_custom:5').props.onLongPress());
    expect(alertSpy).toHaveBeenCalledTimes(1);
    const [title, message, buttons] = alertSpy.mock.calls[0];
    expect(title).toBe('מחיקת מחלקה');
    expect(message).toContain('"מתנות חג"');
    expect(deleteListCategory).not.toHaveBeenCalled();
    await act(async () => buttons.find(b => b.style === 'destructive').onPress());
    expect(deleteListCategory).toHaveBeenCalledWith(7, 5);
    expect(rowKeys(tree)).toEqual([...withoutKey('custom:5'), 'other']);
    await press(tree, 'edit_departments_done');
    expect(keysOf(lastPayload())).not.toContain('custom:5');
    expect(lastPayload()).toHaveLength(ALL_KEYS.length - 1);
  });

  test('cancelling the confirmation deletes nothing', async () => {
    const { tree } = await mount();
    await act(async () => pressable(tree, 'department_name_custom:5').props.onLongPress());
    const buttons = alertSpy.mock.calls[0][2];
    const cancel = buttons.find(b => b.style === 'cancel');
    expect(cancel.text).toBe('ביטול');
    expect(deleteListCategory).not.toHaveBeenCalled();
    expect(rowKeys(tree)).toContain('custom:5');
  });

  test('a delete that finds the department already gone counts as done', async () => {
    deleteListCategory.mockRejectedValue(Object.assign(new Error('x'), { status: 404 }));
    const { tree } = await mount();
    await act(async () => pressable(tree, 'department_name_custom:5').props.onLongPress());
    await act(async () =>
      alertSpy.mock.calls[0][2].find(b => b.style === 'destructive').onPress(),
    );
    expect(rowKeys(tree)).not.toContain('custom:5');
  });

  test('built-in departments cannot be deleted', async () => {
    const { tree } = await mount();
    ['bakery', 'produce', 'dairy', 'frozen', 'other'].forEach(key => {
      const nodes = tree.root.findAll(
        n => n.props.testID === `department_name_${key}`,
      );
      expect(nodes.length).toBeGreaterThan(0);
      nodes.forEach(n => expect(n.props.onLongPress).toBeUndefined());
    });
  });
});

describe('offline', () => {
  const goOffline = async () => {
    await saveCache(cacheKeys.categories(7), { custom: CUSTOM, layout: LAYOUT });
    getListCategories.mockRejectedValue(
      Object.assign(new Error('אין חיבור'), { network: true }),
    );
  };

  test('a load that falls back to the cache shows the rows and the offline banner', async () => {
    await goOffline();
    const { tree } = await mount();
    expect(rowKeys(tree)).toEqual([...VISIBLE, 'other']);
    expect(has(tree, 'offline_banner')).toBe(true);
  });

  test('every edit is blocked with the existing alert, and nothing is sent', async () => {
    await goOffline();
    const { tree, navigation } = await mount();
    const ids = [
      'edit_departments_done',
      'department_edit_produce',
      'add_department_button',
    ];
    for (const id of ids) {
      alertSpy.mockClear();
      const control = pressable(tree, id);
      // ההודעה חייבת להופיע: הפקד לא מסומן כמושבת לקורא המסך
      expect(control.props.accessibilityState?.disabled).toBeFalsy();
      expect(control.props.accessibilityHint).toBe('לא זמין ללא חיבור לאינטרנט');
      await act(async () => control.props.onPress());
      expect(alertSpy).toHaveBeenCalledWith(...BLOCKED);
    }
    expect(has(tree, 'department_name_input')).toBe(false);
    expect(has(tree, 'new_department_input')).toBe(false);

    alertSpy.mockClear();
    await act(async () => pressable(tree, 'department_drag_produce').props.onLongPress());
    expect(alertSpy).toHaveBeenCalledWith(...BLOCKED);
    expect(global.__drag).not.toHaveBeenCalled();

    alertSpy.mockClear();
    await act(async () => pressable(tree, 'department_name_custom:5').props.onLongPress());
    expect(alertSpy).toHaveBeenCalledWith(...BLOCKED);

    expect(saveCategoryLayout).not.toHaveBeenCalled();
    expect(createListCategory).not.toHaveBeenCalled();
    expect(deleteListCategory).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  test('a save that fails on the network shows the offline alert and stays; the next סיום tries again', async () => {
    saveCategoryLayout.mockRejectedValueOnce(
      Object.assign(new Error('אין חיבור'), { network: true }),
    );
    const { tree, navigation } = await mount();
    await press(tree, 'edit_departments_done');
    expect(alertSpy).toHaveBeenCalledWith(...BLOCKED);
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(has(tree, 'offline_banner')).toBe(true);
    // הרשת חזרה: הקריאה החוזרת מצליחה, המצב הלא מקוון מתבטל והשמירה נשלחת
    await press(tree, 'edit_departments_done');
    expect(saveCategoryLayout).toHaveBeenCalledTimes(2);
    expect(has(tree, 'offline_banner')).toBe(false);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('while the network is still down, every סיום shows the alert and keeps the offline state', async () => {
    saveCategoryLayout.mockRejectedValueOnce(
      Object.assign(new Error('אין חיבור'), { network: true }),
    );
    const { tree, navigation } = await mount();
    await press(tree, 'edit_departments_done');
    getListCategories.mockRejectedValue(
      Object.assign(new Error('אין חיבור'), { network: true }),
    );
    alertSpy.mockClear();
    await press(tree, 'edit_departments_done');
    expect(alertSpy).toHaveBeenCalledWith(...BLOCKED);
    expect(has(tree, 'offline_banner')).toBe(true);
    alertSpy.mockClear();
    await press(tree, 'edit_departments_done');
    expect(alertSpy).toHaveBeenCalledWith(...BLOCKED);
    expect(saveCategoryLayout).toHaveBeenCalledTimes(1);
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  test('after a cache-fallback load, סיום probes the server and saves once it answers', async () => {
    await goOffline();
    const { tree, navigation } = await mount();
    expect(has(tree, 'offline_banner')).toBe(true);
    getListCategories.mockResolvedValue({ custom: CUSTOM, layout: LAYOUT });
    await press(tree, 'edit_departments_done');
    expect(has(tree, 'offline_banner')).toBe(false);
    expect(saveCategoryLayout).toHaveBeenCalledTimes(1);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('a load without network and without cache goes back with the offline alert', async () => {
    getListCategories.mockRejectedValue(
      Object.assign(new Error('אין חיבור'), { network: true }),
    );
    const { navigation } = await mount();
    expect(alertSpy).toHaveBeenCalledWith(...BLOCKED);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });
});

describe('overlapping requests', () => {
  test('a slow delete that ends after a newer add keeps both changes', async () => {
    const del = deferred();
    deleteListCategory.mockReturnValue(del.promise);
    createListCategory.mockResolvedValue({ id: 9, name: 'חיות', color: '#abcdef', icon: '🛒' });
    const { tree } = await mount();
    await act(async () => pressable(tree, 'department_name_custom:5').props.onLongPress());
    await act(async () => {
      alertSpy.mock.calls[0][2].find(b => b.style === 'destructive').onPress();
    });
    await press(tree, 'add_department_button');
    await type(tree, 'new_department_input', 'חיות');
    await press(tree, 'new_department_save');
    await act(async () => del.resolve());
    expect(rowKeys(tree)).toEqual([...withoutKey('custom:5'), 'custom:9', 'other']);
  });
});

describe('accessibility', () => {
  const missing = tree =>
    tree.root
      .findAll(n => n.type === TouchableOpacity || n.type === Pressable)
      .filter(n => !n.props.accessibilityRole)
      .map(n => n.props.testID || n.props.accessibilityLabel || '(unnamed)');

  test('every touchable has a role, in every state of the screen', async () => {
    const { tree } = await mount();
    expect(missing(tree)).toEqual([]);
    await press(tree, 'department_edit_produce');
    await press(tree, 'department_icon_produce');
    expect(missing(tree)).toEqual([]);
    await press(tree, 'emoji_close');
    await press(tree, 'add_department_button');
    expect(missing(tree)).toEqual([]);
  });

  test('labels are Hebrew', async () => {
    const { tree } = await mount();
    expect(pressable(tree, 'edit_departments_done').props.accessibilityLabel).toBe('סיום');
    expect(pressable(tree, 'edit_departments_back').props.accessibilityLabel).toBe(
      'חזרה',
    );
    expect(pressable(tree, 'add_department_button').props.accessibilityLabel).toBe(
      'הוספת מחלקה חדשה',
    );
    expect(pressable(tree, 'department_name_custom:5').props.accessibilityHint).toBe(
      'לחיצה ארוכה למחיקת המחלקה',
    );
  });
});

describe('navigation', () => {
  test('App registers the EditDepartments screen in the lists stack', () => {
    const app = fs.readFileSync(path.join(__dirname, '..', 'App.js'), 'utf8');
    expect(app).toMatch(
      /<ListsStack\.Screen\s+name="EditDepartments"\s+component=\{EditDepartmentsScreen\}/,
    );
    expect(app).toContain(
      "import EditDepartmentsScreen from './src/screens/EditDepartmentsScreen/EditDepartmentsScreen';",
    );
  });
});

const buttonsOf = call => call[2];
const button = (call, text) => buttonsOf(call).find(b => b.text === text);
const lastAlert = () => alertSpy.mock.calls[alertSpy.mock.calls.length - 1];
const renameTo = async (tree, key, name) => {
  await press(tree, `department_edit_${key}`);
  await type(tree, 'department_name_input', name);
  await press(tree, 'department_name_confirm');
};
const spinnerIn = (tree, id) =>
  host(tree, id)[0].findAll(n => n.type === 'ActivityIndicator').length > 0;

describe('unsaved changes on leave', () => {
  test('leaving with no changes is not stopped', async () => {
    const { navigation } = await mount();
    const event = navigation.leave();
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  test('with a rename pending, leaving asks whether to save', async () => {
    const { tree, navigation } = await mount();
    await renameTo(tree, 'produce', 'ירקן');
    await press(tree, 'edit_departments_back');
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    const event = navigation.leave();
    expect(event.preventDefault).toHaveBeenCalled();
    const call = lastAlert();
    expect(call[0]).toBe('לשמור את השינויים?');
    expect(buttonsOf(call).map(b => b.text).sort()).toEqual(
      ['בטל שינויים', 'המשך לערוך', 'שמור'].sort(),
    );
    expect(button(call, 'המשך לערוך').style).toBe('cancel');
  });

  test('בטל שינויים leaves without saving', async () => {
    const { tree, navigation } = await mount();
    await renameTo(tree, 'produce', 'ירקן');
    const event = navigation.leave();
    await act(async () => button(lastAlert(), 'בטל שינויים').onPress());
    expect(navigation.dispatch).toHaveBeenCalledWith(event.data.action);
    expect(saveCategoryLayout).not.toHaveBeenCalled();
  });

  test('המשך לערוך stays on the screen', async () => {
    const { tree, navigation } = await mount();
    await renameTo(tree, 'produce', 'ירקן');
    navigation.leave();
    await act(async () => button(lastAlert(), 'המשך לערוך').onPress?.());
    expect(navigation.dispatch).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(rowText(tree, 'produce')).toContain('ירקן');
  });

  test('שמור runs the save flow, then follows the original back action', async () => {
    const { tree, navigation } = await mount();
    await renameTo(tree, 'produce', 'ירקן');
    const event = navigation.leave();
    await act(async () => button(lastAlert(), 'שמור').onPress());
    expect(entry(lastPayload(), 'produce').name).toBe('ירקן');
    expect(navigation.dispatch).toHaveBeenCalledWith(event.data.action);
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  test('שמור after a network failure tries again and leaves when the server answers', async () => {
    saveCategoryLayout.mockRejectedValueOnce(
      Object.assign(new Error('אין חיבור'), { network: true }),
    );
    const { tree, navigation } = await mount();
    await renameTo(tree, 'produce', 'ירקן');
    await press(tree, 'edit_departments_done');
    expect(has(tree, 'offline_banner')).toBe(true);
    const event = navigation.leave();
    expect(event.preventDefault).toHaveBeenCalled();
    await act(async () => button(lastAlert(), 'שמור').onPress());
    expect(saveCategoryLayout).toHaveBeenCalledTimes(2);
    expect(entry(lastPayload(), 'produce').name).toBe('ירקן');
    expect(navigation.dispatch).toHaveBeenCalledWith(event.data.action);
  });

  test('a reorder is a change, and dragging it back is not', async () => {
    const { navigation } = await mount();
    await dragTo(['produce', ...withoutKey('produce')]);
    expect(navigation.leave().preventDefault).toHaveBeenCalled();
    await dragTo(VISIBLE);
    expect(navigation.leave().preventDefault).not.toHaveBeenCalled();
  });

  test('an icon change is a change', async () => {
    const { tree, navigation } = await mount();
    await press(tree, 'department_edit_produce');
    await press(tree, 'department_icon_produce');
    const apple = tree.root.findAll(
      n =>
        typeof n.props.onPress === 'function' &&
        n.props.accessibilityLabel === '🍎 תפוח',
    )[0];
    await act(async () => apple.props.onPress());
    await press(tree, 'department_name_confirm');
    expect(navigation.leave().preventDefault).toHaveBeenCalled();
  });

  test('typed text in the add form is a change; an empty form is not', async () => {
    const { tree, navigation } = await mount();
    await press(tree, 'add_department_button');
    expect(navigation.leave().preventDefault).not.toHaveBeenCalled();
    await type(tree, 'new_department_input', 'חיות');
    expect(navigation.leave().preventDefault).toHaveBeenCalled();
  });

  test('after a successful save, leaving is not stopped', async () => {
    const { tree, navigation } = await mount();
    await renameTo(tree, 'produce', 'ירקן');
    await press(tree, 'edit_departments_done');
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
    expect(navigation.leave().preventDefault).not.toHaveBeenCalled();
  });

  test('an add or a delete that was already applied is not an unsaved change', async () => {
    createListCategory.mockResolvedValue({
      id: 9,
      name: 'חיות',
      color: '#abcdef',
      icon: '🛒',
    });
    deleteListCategory.mockResolvedValue(undefined);
    const { tree, navigation } = await mount();
    await press(tree, 'add_department_button');
    await type(tree, 'new_department_input', 'חיות');
    await press(tree, 'new_department_save');
    expect(navigation.leave().preventDefault).not.toHaveBeenCalled();
    await act(async () =>
      pressable(tree, 'department_name_custom:5').props.onLongPress(),
    );
    await act(async () => button(lastAlert(), 'מחק').onPress());
    expect(navigation.leave().preventDefault).not.toHaveBeenCalled();
  });
});

describe('סיום while a create or delete is in flight', () => {
  test('a pending POST: סיום shows a spinner and sends nothing until it settles', async () => {
    const post = deferred();
    createListCategory.mockReturnValue(post.promise);
    const { tree } = await mount();
    await press(tree, 'add_department_button');
    await type(tree, 'new_department_input', 'חיות');
    await pressNoWait(tree, 'new_department_save');
    expect(spinnerIn(tree, 'edit_departments_done')).toBe(true);
    const done = pressable(tree, 'edit_departments_done');
    expect(done.props.accessibilityState?.disabled).toBeFalsy();
    expect(done.props.accessibilityHint).toBe('ממתין לסיום הפעולה');
    expect(done.props.accessibilityState).toEqual({ busy: true });
    await press(tree, 'edit_departments_done');
    expect(saveCategoryLayout).not.toHaveBeenCalled();
    expect(getListCategories).toHaveBeenCalledTimes(1);
    await act(async () =>
      post.resolve({ id: 9, name: 'חיות', color: '#abcdef', icon: '🛒' }),
    );
    expect(spinnerIn(tree, 'edit_departments_done')).toBe(false);
    await press(tree, 'edit_departments_done');
    expect(keysOf(lastPayload()).slice(-2)).toEqual(['custom:9', 'other']);
  });

  test('a pending DELETE: סיום sends nothing until it settles', async () => {
    const del = deferred();
    deleteListCategory.mockReturnValue(del.promise);
    const { tree } = await mount();
    await act(async () =>
      pressable(tree, 'department_name_custom:5').props.onLongPress(),
    );
    await act(async () => {
      button(lastAlert(), 'מחק').onPress();
    });
    expect(spinnerIn(tree, 'edit_departments_done')).toBe(true);
    await press(tree, 'edit_departments_done');
    expect(saveCategoryLayout).not.toHaveBeenCalled();
    await act(async () => del.resolve());
    await press(tree, 'edit_departments_done');
    expect(keysOf(lastPayload())).not.toContain('custom:5');
  });

  test('a POST that settles after the screen closed changes no state and logs nothing', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const post = deferred();
    createListCategory.mockReturnValue(post.promise);
    const { tree } = await mount();
    await press(tree, 'add_department_button');
    await type(tree, 'new_department_input', 'חיות');
    await pressNoWait(tree, 'new_department_save');
    await act(async () => {
      trees.splice(trees.indexOf(tree), 1);
      tree.unmount();
    });
    await act(async () =>
      post.resolve({ id: 9, name: 'חיות', color: '#abcdef', icon: '🛒' }),
    );
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

describe('changes by another member while editing', () => {
  const changed = (patch = {}) => ({
    custom: patch.custom || CUSTOM,
    layout: patch.layout || LAYOUT,
  });
  const serverRenamedDairy = () =>
    changed({
      layout: LAYOUT.map(e => (e.key === 'dairy' ? { ...e, name: 'קירור' } : e)),
    });

  test('סיום reads the categories again just before the PUT', async () => {
    const { tree } = await mount();
    await renameTo(tree, 'produce', 'ירקן');
    await press(tree, 'edit_departments_done');
    expect(getListCategories).toHaveBeenCalledTimes(2);
    expect(getListCategories.mock.invocationCallOrder[1]).toBeLessThan(
      saveCategoryLayout.mock.invocationCallOrder[0],
    );
  });

  test('a change on the server asks what to do and sends nothing yet', async () => {
    const { tree, navigation } = await mount();
    getListCategories.mockResolvedValue(serverRenamedDairy());
    await renameTo(tree, 'produce', 'ירקן');
    await press(tree, 'edit_departments_done');
    const call = lastAlert();
    expect(call[0]).toBe(SERVER_ERROR.title);
    expect(call[1]).toContain('מה לעשות עם השינויים שלך?');
    expect(buttonsOf(call).map(b => b.text)).toEqual([
      'ביטול',
      'טען את הגרסה העדכנית',
      'שמור את שלי בכל זאת',
    ]);
    expect(button(call, 'ביטול').style).toBe('cancel');
    expect(saveCategoryLayout).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
    // הכפתור חוזר לעבוד
    expect(spinnerIn(tree, 'edit_departments_done')).toBe(false);
  });

  test('טען את הגרסה העדכנית discards my edits, reloads and stays', async () => {
    const { tree, navigation } = await mount();
    getListCategories.mockResolvedValue(serverRenamedDairy());
    await renameTo(tree, 'produce', 'ירקן');
    await press(tree, 'edit_departments_done');
    await act(async () =>
      button(lastAlert(), 'טען את הגרסה העדכנית').onPress(),
    );
    expect(rowText(tree, 'dairy')).toContain('קירור');
    expect(rowText(tree, 'produce')).toContain('פירות וירקות');
    expect(saveCategoryLayout).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
    // הגרסה שנטענה היא נקודת ההשוואה החדשה
    expect(navigation.leave().preventDefault).not.toHaveBeenCalled();
    await press(tree, 'edit_departments_done');
    expect(entry(lastPayload(), 'dairy').name).toBe('קירור');
    expect(entry(lastPayload(), 'produce').name).toBeNull();
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('שמור את שלי בכל זאת puts my layout, plus customs added by others before אחר', async () => {
    const { tree, navigation } = await mount();
    getListCategories.mockResolvedValue(
      changed({
        custom: [
          ...CUSTOM,
          { id: 8, name: 'פרחים', color: '#aabbcc', icon: '🌸' },
        ],
        layout: [
          ...LAYOUT.filter(e => e.key !== 'other'),
          { key: 'custom:8', name: 'פרחים וצמחים', icon: '🌸', position: 11 },
          { key: 'other', name: null, icon: null, position: 12 },
        ],
      }),
    );
    await renameTo(tree, 'produce', 'ירקן');
    await press(tree, 'edit_departments_done');
    expect(lastAlert()[0]).toBe(SERVER_ERROR.title);
    await act(async () =>
      button(lastAlert(), 'שמור את שלי בכל זאת').onPress(),
    );
    const payload = lastPayload();
    expect(keysOf(payload)).toEqual([...VISIBLE, 'custom:8', 'other']);
    expect(entry(payload, 'custom:8')).toEqual({
      key: 'custom:8',
      name: 'פרחים וצמחים',
      icon: '🌸',
    });
    expect(entry(payload, 'produce').name).toBe('ירקן');
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('ביטול stays and sends nothing', async () => {
    const { tree, navigation } = await mount();
    getListCategories.mockResolvedValue(serverRenamedDairy());
    await press(tree, 'edit_departments_done');
    await act(async () => button(lastAlert(), 'ביטול').onPress?.());
    expect(saveCategoryLayout).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(rowText(tree, 'dairy')).toContain('מקררים');
  });

  test('a reorder by another member is detected', async () => {
    const { tree } = await mount();
    getListCategories.mockResolvedValue(
      changed({
        layout: LAYOUT.map(e => {
          if (e.key === 'bakery') return { ...e, position: 1 };
          if (e.key === 'produce') return { ...e, position: 0 };
          return e;
        }),
      }),
    );
    await press(tree, 'edit_departments_done');
    expect(lastAlert()[0]).toBe(SERVER_ERROR.title);
    expect(saveCategoryLayout).not.toHaveBeenCalled();
  });

  test('a custom deleted by another member is detected', async () => {
    const { tree } = await mount();
    getListCategories.mockResolvedValue(
      changed({ custom: [], layout: LAYOUT.filter(e => e.key !== 'custom:5') }),
    );
    await press(tree, 'edit_departments_done');
    expect(lastAlert()[0]).toBe(SERVER_ERROR.title);
  });

  test('my own add and delete are not taken for a change by someone else', async () => {
    createListCategory.mockResolvedValue({
      id: 9,
      name: 'חיות',
      color: '#abcdef',
      icon: '🐾',
    });
    deleteListCategory.mockResolvedValue(undefined);
    const { tree, navigation } = await mount();
    await act(async () =>
      pressable(tree, 'department_name_custom:5').props.onLongPress(),
    );
    await act(async () => button(lastAlert(), 'מחק').onPress());
    await press(tree, 'add_department_button');
    await type(tree, 'new_department_input', 'חיות');
    await press(tree, 'new_department_save');
    alertSpy.mockClear();
    getListCategories.mockResolvedValue({
      custom: [{ id: 9, name: 'חיות', color: '#abcdef', icon: '🐾' }],
      layout: [
        ...LAYOUT.filter(e => e.key !== 'custom:5' && e.key !== 'other'),
        { key: 'custom:9', name: null, icon: '🐾', position: 10 },
        { key: 'other', name: null, icon: null, position: 11 },
      ],
    });
    await press(tree, 'edit_departments_done');
    expect(alertSpy).not.toHaveBeenCalled();
    expect(saveCategoryLayout).toHaveBeenCalledTimes(1);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('a re-read that fails on the network shows the offline alert and sends nothing', async () => {
    const { tree, navigation } = await mount();
    getListCategories.mockRejectedValue(
      Object.assign(new Error('אין חיבור'), { network: true }),
    );
    await press(tree, 'edit_departments_done');
    expect(alertSpy).toHaveBeenCalledWith(...BLOCKED);
    expect(saveCategoryLayout).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
  });
});

describe('emoji picker selection', () => {
  const option = (tree, label) =>
    tree.root.findAll(
      n =>
        typeof n.props.onPress === 'function' &&
        n.props.accessibilityLabel === label,
    )[0];

  test('after choosing the default icon, the default choice is marked, not the default emoji', async () => {
    const { tree } = await mount();
    await press(tree, 'department_edit_frozen');
    await press(tree, 'department_icon_frozen');
    expect(option(tree, '🍦 גלידה').props.accessibilityState.selected).toBe(true);
    expect(
      pressable(tree, 'emoji_default').props.accessibilityState.selected,
    ).toBe(false);
    await press(tree, 'emoji_default');
    await press(tree, 'department_icon_frozen');
    expect(
      pressable(tree, 'emoji_default').props.accessibilityState.selected,
    ).toBe(true);
    expect(option(tree, '❄️ קפואים').props.accessibilityState.selected).toBe(
      false,
    );
    expect(option(tree, '🍦 גלידה').props.accessibilityState.selected).toBe(
      false,
    );
  });
});

// אנדרואיד ישן (לפני 10) מציג ריבוע ריק במקום אמוג'י מגרסה 11 ומעלה
describe('emoji that render on older Android', () => {
  const NEWER = [
    [0x1f6d5, 0x1f6df],
    [0x1f6f9, 0x1f6ff],
    [0x1f90c, 0x1f90f],
    [0x1f93f, 0x1f93f],
    [0x1f94d, 0x1f94f],
    [0x1f96c, 0x1f97f],
    [0x1f998, 0x1f9bf],
    [0x1f9c1, 0x1f9cf],
    [0x1f9e7, 0x1faff],
  ];
  const tooNew = emoji =>
    [...emoji].some(ch => {
      const cp = ch.codePointAt(0);
      return NEWER.some(([a, b]) => cp >= a && cp <= b);
    });

  test('the checker catches Emoji 11 and 12', () => {
    expect(['🧃', '🧊', '🧂', '🧽', '🧴', '🥰'].every(tooNew)).toBe(true);
    expect(['🥦', '🧀', '🥩', '🥫', '🛒', '❄️', '🧐'].some(tooNew)).toBe(false);
  });

  test('every picker emoji and every built-in default icon is Emoji 5.0 or older', () => {
    const offenders = [
      ...EMOJI_OPTIONS.map(([emoji]) => emoji),
      ...BUILTIN_CATEGORIES.map(c => c.icon),
    ].filter(tooNew);
    expect(offenders).toEqual([]);
  });

  test('the frozen default icon is ❄️', () => {
    expect(BUILTIN_CATEGORIES.find(c => c.key === 'frozen').icon).toBe('❄️');
  });
});

describe('text typed in the add form when pressing סיום', () => {
  const typeNew = async (tree, text) => {
    await press(tree, 'add_department_button');
    await type(tree, 'new_department_input', text);
  };
  const ADD_TITLE = 'המחלקה החדשה עוד לא נוספה';

  test('asks before saving, and sends nothing yet', async () => {
    const { tree, navigation } = await mount();
    await typeNew(tree, 'חיות');
    await press(tree, 'edit_departments_done');
    const call = lastAlert();
    expect(call[0]).toBe(ADD_TITLE);
    expect(call[1]).toContain('"חיות"');
    expect(buttonsOf(call).map(b => b.text)).toEqual([
      'המשך לערוך',
      'הוסף',
      'שמור בלי להוסיף',
    ]);
    expect(button(call, 'המשך לערוך').style).toBe('cancel');
    expect(createListCategory).not.toHaveBeenCalled();
    expect(saveCategoryLayout).not.toHaveBeenCalled();
    expect(getListCategories).toHaveBeenCalledTimes(1);
    expect(navigation.goBack).not.toHaveBeenCalled();
  });

  test('הוסף creates it like the add button and stays; the next סיום saves it in place', async () => {
    createListCategory.mockResolvedValue({ id: 9, name: 'חיות', color: '#abcdef', icon: '🛒' });
    const { tree, navigation } = await mount();
    await typeNew(tree, 'חיות');
    await press(tree, 'edit_departments_done');
    await act(async () => button(lastAlert(), 'הוסף').onPress());
    expect(createListCategory).toHaveBeenCalledWith(7, 'חיות', '🛒');
    expect(saveCategoryLayout).not.toHaveBeenCalled();
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(rowKeys(tree)).toContain('custom:9');
    await press(tree, 'edit_departments_done');
    expect(keysOf(lastPayload()).slice(-2)).toEqual(['custom:9', 'other']);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('שמור בלי להוסיף drops the text and saves the rest', async () => {
    const { tree, navigation } = await mount();
    await renameTo(tree, 'produce', 'ירקן');
    await typeNew(tree, 'חיות');
    await press(tree, 'edit_departments_done');
    await act(async () => button(lastAlert(), 'שמור בלי להוסיף').onPress());
    expect(createListCategory).not.toHaveBeenCalled();
    expect(entry(lastPayload(), 'produce').name).toBe('ירקן');
    expect(keysOf(lastPayload())).toHaveLength(ALL_KEYS.length);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('המשך לערוך keeps the typed text', async () => {
    const { tree } = await mount();
    await typeNew(tree, 'חיות');
    await press(tree, 'edit_departments_done');
    await act(async () => button(lastAlert(), 'המשך לערוך').onPress?.());
    expect(input(tree, 'new_department_input').props.value).toBe('חיות');
    expect(saveCategoryLayout).not.toHaveBeenCalled();
  });

  test('an empty add form does not ask', async () => {
    const { tree, navigation } = await mount();
    await typeNew(tree, '   ');
    await press(tree, 'edit_departments_done');
    expect(alertSpy).not.toHaveBeenCalled();
    expect(saveCategoryLayout).toHaveBeenCalledTimes(1);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });
});

describe('while a save is in flight', () => {
  const startSlowSave = async () => {
    const save = deferred();
    saveCategoryLayout.mockReturnValue(save.promise);
    const mounted = await mount();
    await renameTo(mounted.tree, 'dairy', 'קירור');
    await pressNoWait(mounted.tree, 'edit_departments_done');
    expect(saveCategoryLayout).toHaveBeenCalledTimes(1);
    return { ...mounted, save };
  };

  test('add, delete, rename, drag and the move actions do nothing', async () => {
    const { tree, save } = await startSlowSave();
    alertSpy.mockClear();
    await press(tree, 'department_edit_produce');
    expect(has(tree, 'department_name_input')).toBe(false);
    await press(tree, 'add_department_button');
    expect(has(tree, 'new_department_input')).toBe(false);
    await act(async () => pressable(tree, 'department_name_custom:5').props.onLongPress());
    expect(alertSpy).not.toHaveBeenCalled();
    await act(async () => pressable(tree, 'department_drag_produce').props.onLongPress());
    expect(global.__drag).not.toHaveBeenCalled();
    await act(async () =>
      pressable(tree, 'department_drag_produce').props.onAccessibilityAction({
        nativeEvent: { actionName: 'moveUp' },
      }),
    );
    expect(rowKeys(tree)).toEqual([...VISIBLE, 'other']);
    expect(createListCategory).not.toHaveBeenCalled();
    expect(deleteListCategory).not.toHaveBeenCalled();
    await act(async () => save.resolve());
  });

  test('back is held without a prompt; the save then leaves on its own', async () => {
    const { navigation, save } = await startSlowSave();
    alertSpy.mockClear();
    const event = navigation.leave();
    expect(event.preventDefault).toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
    await act(async () => save.resolve());
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });

  test('busy סיום is marked busy for TalkBack, never disabled', async () => {
    const { tree, save } = await startSlowSave();
    const done = pressable(tree, 'edit_departments_done');
    expect(done.props.accessibilityState).toEqual({ busy: true });
    await act(async () => save.resolve());
  });

  test('when the save fails, editing works again', async () => {
    const save = deferred();
    saveCategoryLayout.mockReturnValue(save.promise);
    const { tree } = await mount();
    await pressNoWait(tree, 'edit_departments_done');
    await act(async () =>
      save.reject(Object.assign(new Error('המחלקות עודכנו במקביל, נסה שוב'), { status: 409 })),
    );
    expect(pressable(tree, 'edit_departments_done').props.accessibilityState).toEqual({
      busy: false,
    });
    await press(tree, 'department_edit_produce');
    expect(has(tree, 'department_name_input')).toBe(true);
  });
});

// StrictMode מריץ את האפקטים פעמיים (הרכבה, פירוק, הרכבה): המסך חייב להמשיך לעבוד
describe('StrictMode', () => {
  test('a created department still shows after the effects re-run', async () => {
    createListCategory.mockResolvedValue({ id: 9, name: 'חיות', color: '#abcdef', icon: '🛒' });
    const navigation = { goBack: jest.fn(), navigate: jest.fn(), dispatch: jest.fn(), addListener: jest.fn(() => () => {}) };
    let tree;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <React.StrictMode>
          <EditDepartmentsScreen route={{ params: { listId: 7 } }} navigation={navigation} />
        </React.StrictMode>,
      );
    });
    trees.push(tree);
    await press(tree, 'add_department_button');
    await type(tree, 'new_department_input', 'חיות');
    await press(tree, 'new_department_save');
    expect(rowKeys(tree)).toContain('custom:9');
    expect(has(tree, 'new_department_input')).toBe(false);
  });
});

describe('re-review N1 and N2', () => {
  test('N1: the open add form is not editable while a save is in flight', async () => {
    const save = deferred();
    saveCategoryLayout.mockReturnValue(save.promise);
    const { tree } = await mount();
    await press(tree, 'add_department_button');
    expect(input(tree, 'new_department_input').props.editable).not.toBe(false);
    await pressNoWait(tree, 'edit_departments_done');
    expect(saveCategoryLayout).toHaveBeenCalledTimes(1);
    expect(input(tree, 'new_department_input').props.editable).toBe(false);
    await act(async () =>
      save.reject(Object.assign(new Error('המחלקות עודכנו במקביל, נסה שוב'), { status: 409 })),
    );
    expect(input(tree, 'new_department_input').props.editable).not.toBe(false);
  });

  const staleCache = async () => {
    await saveCache(cacheKeys.categories(7), { custom: CUSTOM, layout: LAYOUT });
    getListCategories.mockRejectedValueOnce(
      Object.assign(new Error('אין חיבור'), { network: true }),
    );
  };
  const serverNow = () => ({
    custom: CUSTOM,
    layout: LAYOUT.map(e => (e.key === 'dairy' ? { ...e, name: 'קירור' } : e)),
  });

  test('N2: after a cache load with no edits, a newer server version is taken as is, with no alert', async () => {
    await staleCache();
    const { tree, navigation } = await mount();
    expect(has(tree, 'offline_banner')).toBe(true);
    getListCategories.mockResolvedValue(serverNow());
    await press(tree, 'edit_departments_done');
    expect(alertSpy).not.toHaveBeenCalledWith(
      SERVER_ERROR.title,
      expect.anything(),
      expect.anything(),
    );
    expect(entry(lastPayload(), 'dairy').name).toBe('קירור');
    expect(keysOf(lastPayload())).toEqual(ALL_KEYS);
    expect(navigation.goBack).toHaveBeenCalledTimes(1);
  });
});
