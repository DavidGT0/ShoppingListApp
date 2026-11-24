/* global jest, describe, test, expect, beforeEach, afterEach */
import fs from 'fs';
import path from 'path';
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Alert, TouchableOpacity, Pressable } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EditDepartmentsScreen from '../src/screens/EditDepartmentsScreen/EditDepartmentsScreen';
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
  { key: 'frozen', name: null, icon: '❄️', position: 5 },
  { key: 'drinks', name: null, icon: null, position: 6 },
  { key: 'snacks', name: null, icon: null, position: 7 },
  { key: 'cleaning', name: null, icon: null, position: 8 },
  { key: 'care', name: null, icon: null, position: 9 },
  { key: 'custom:5', name: null, icon: '🎁', position: 10 },
  { key: 'other', name: null, icon: null, position: 11 },
];
const CUSTOM = [{ id: 5, name: 'מתנות', color: '#123456', icon: '🎁' }];
const ALL_KEYS = LAYOUT.map(e => e.key);
// מוצגות: מובנות עם מוצרים (bakery, produce) או עם שינוי (dairy, frozen), וכל המותאמות
const VISIBLE = ['bakery', 'produce', 'dairy', 'frozen', 'custom:5'];

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
  const navigation = { goBack: jest.fn(), navigate: jest.fn() };
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(
      <EditDepartmentsScreen
        route={{
          params: {
            listId: 7,
            listName: 'קניות',
            usedKeys: ['produce', 'bakery', 'other'],
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

  test('shows built-ins with items or overrides and every custom one, in layout order', async () => {
    const { tree } = await mount();
    expect(rowKeys(tree)).toEqual([...VISIBLE, 'other']);
    expect(rowText(tree, 'dairy')).toContain('מקררים');
    expect(rowText(tree, 'dairy')).toContain('🥛');
    expect(rowText(tree, 'frozen')).toContain('❄️');
    expect(rowText(tree, 'frozen')).toContain('קפואים');
    expect(rowText(tree, 'custom:5')).toContain('מתנות');
    expect(rowText(tree, 'custom:5')).toContain('🎁');
  });

  test('"אחר" is pinned last: outside the drag list and without a handle', async () => {
    const { tree } = await mount();
    expect(global.__dragProps.data.map(r => r.key)).toEqual(VISIBLE);
    expect(has(tree, 'department_drag_other')).toBe(false);
    expect(rowText(tree, 'other')).toContain('אחר');
    expect(rowText(tree, 'other')).toContain('תמיד אחרונה');
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
  test('save sends every key from the layout, hidden built-ins included', async () => {
    const { tree } = await mount();
    await press(tree, 'edit_departments_done');
    expect(saveCategoryLayout).toHaveBeenCalledTimes(1);
    expect(saveCategoryLayout.mock.calls[0][0]).toBe(7);
    const payload = lastPayload();
    expect(keysOf(payload)).toEqual(ALL_KEYS);
    expect(entry(payload, 'dairy')).toEqual({ key: 'dairy', name: 'מקררים', icon: null });
    expect(entry(payload, 'frozen')).toEqual({ key: 'frozen', name: null, icon: '❄️' });
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
  test('dragging reorders the rows and save keeps hidden built-ins in their slots', async () => {
    const { tree } = await mount();
    await dragTo(['custom:5', 'bakery', 'produce', 'dairy', 'frozen']);
    expect(rowKeys(tree)).toEqual([
      'custom:5',
      'bakery',
      'produce',
      'dairy',
      'frozen',
      'other',
    ]);
    await press(tree, 'edit_departments_done');
    expect(keysOf(lastPayload())).toEqual([
      'custom:5',
      'bakery',
      'produce',
      'meat',
      'pantry',
      'dairy',
      'drinks',
      'snacks',
      'cleaning',
      'care',
      'frozen',
      'other',
    ]);
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
    await type(tree, 'department_name_input', 'מקררים');
    await press(tree, 'department_name_confirm');
    expect(alertSpy).toHaveBeenCalledWith('שים לב', 'המחלקה כבר קיימת ברשימה');
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
    expect(rowText(tree, 'frozen')).toContain('🧊');
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
    await type(tree, 'new_department_input', 'מקררים');
    await press(tree, 'new_department_save');
    expect(alertSpy).toHaveBeenCalledWith('שים לב', 'המחלקה כבר קיימת ברשימה');
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
    expect(rowKeys(tree)).toEqual(['bakery', 'produce', 'dairy', 'frozen', 'other']);
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

  test('a save that fails on the network shows the offline alert, stays, and blocks the retry', async () => {
    saveCategoryLayout.mockRejectedValue(
      Object.assign(new Error('אין חיבור'), { network: true }),
    );
    const { tree, navigation } = await mount();
    await press(tree, 'edit_departments_done');
    expect(alertSpy).toHaveBeenCalledWith(...BLOCKED);
    expect(navigation.goBack).not.toHaveBeenCalled();
    expect(has(tree, 'offline_banner')).toBe(true);
    await press(tree, 'edit_departments_done');
    expect(saveCategoryLayout).toHaveBeenCalledTimes(1);
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
    expect(rowKeys(tree)).toEqual(['bakery', 'produce', 'dairy', 'frozen', 'custom:9', 'other']);
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
      'חזרה בלי לשמור',
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
