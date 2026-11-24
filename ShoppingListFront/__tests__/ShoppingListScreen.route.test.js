/* global jest, describe, test, expect, beforeEach, afterEach */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { Alert } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ShoppingListScreen from '../src/screens/ShoppingListScreen/ShoppingListScreen';
import ShoppingListItem from '../src/components/ShoppingListItem/ShoppingListItem';
import UndoBar from '../src/components/UndoBar/UndoBar';
import {
  getShoppingList,
  updateItem,
  getListCategories,
} from '../src/services/api';
import { saveCache, cacheKeys } from '../src/services/offlineCache';

// ה-ScrollView של gesture-handler דורש Reanimated מלא: מוחלף ברכיב שמציג את הילדים
jest.mock('react-native-gesture-handler', () => ({
  ...jest.requireActual('react-native-gesture-handler'),
  ScrollView: ({ children, testID }) =>
    require('react').createElement(
      require('react-native').View,
      { testID: `${testID}_inner` },
      children,
    ),
}));

jest.mock('react-native-draggable-flatlist', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  const MockDraggableFlatList = props => {
    global.__dragProps = props;
    return ReactLib.createElement(
      View,
      { testID: 'draggable' },
      props.ListHeaderComponent,
      props.data.map(row =>
        ReactLib.createElement(
          ReactLib.Fragment,
          { key: row.id },
          props.renderItem({ item: row, drag: () => {}, isActive: false }),
        ),
      ),
      props.ListFooterComponent,
    );
  };
  // מצב ידני: רשימה נגררת מקוננת בתוך מיכל גלילה (עם המשיכה לריענון)
  const MockNestableScrollContainer = ({ children, ...rest }) => {
    global.__scrollProps = rest;
    return ReactLib.createElement(View, { testID: 'nestable_scroll' }, children);
  };
  return {
    __esModule: true,
    default: MockDraggableFlatList,
    NestableDraggableFlatList: MockDraggableFlatList,
    NestableScrollContainer: MockNestableScrollContainer,
  };
});

jest.mock('../src/hooks/useLiveRefresh', () => ({
  __esModule: true,
  default: jest.fn(refresh => {
    global.__liveRefresh = refresh;
  }),
}));

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
  getSuggestions: jest.fn(() => Promise.resolve([])),
}));

const { act } = ReactTestRenderer;
const BLOCKED = ['אין חיבור לאינטרנט', 'אפשר רק לצפות ברשימה עד שהחיבור יחזור'];

const item = (id, name, extra = {}) => ({
  id,
  name,
  amount: 1,
  purchased: false,
  position: id,
  category: null,
  ...extra,
});

// פירות וירקות: הכל נקנה. חלב: חלב פתוח, ביצים נקנו. מאפים: לחם פתוח
const ITEMS = [
  item(1, 'עגבניות', { purchased: true }),
  item(2, 'חלב'),
  item(3, 'ביצים', { purchased: true }),
  item(4, 'לחם'),
];

const trees = [];
let alertSpy;
beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  getShoppingList.mockReset();
  getListCategories.mockReset();
  getListCategories.mockResolvedValue({ custom: [], layout: [] });
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
});
afterEach(async () => {
  await act(async () => {
    trees.splice(0).forEach(t => t.unmount());
  });
  alertSpy.mockRestore();
});

const mount = async () => {
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
  trees.push(tree);
  return tree;
};
const mountRoute = async items => {
  await AsyncStorage.setItem('@sort_mode_7', 'category');
  getShoppingList.mockResolvedValue(items);
  return mount();
};

const host = (root, id) =>
  root.findAll(n => n.props.testID === id && typeof n.type === 'string');
const one = (root, id) => {
  const found = host(root, id);
  if (!found.length) throw new Error(`missing ${id}`);
  return found[0];
};
// הטקסט של צומת: רק מחרוזות ומספרים מתוך רכיבי Text (כולל הצומת עצמו)
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
const focusTitle = tree =>
  one(tree.root, 'focus_card_title').props.accessibilityLabel;
const headerKeys = tree =>
  tree.root
    .findAll(
      n =>
        typeof n.type === 'string' &&
        typeof n.props.testID === 'string' &&
        n.props.testID.startsWith('category_header_'),
    )
    .map(n => n.props.testID.replace('category_header_', ''));
// הרכיב הלחיץ עצמו (לא הצומת המצויר), שמחזיק את onPress
const pressable = (root, id) =>
  root.findAll(
    n => n.props.testID === id && typeof n.props.onPress === 'function',
  )[0];
const pressCheckInFocus = async (tree, id) => {
  const card = one(tree.root, 'focus_card');
  await act(async () => pressable(card, `item_check_${id}`).props.onPress());
};

describe('by department route', () => {
  test('renders the route inside the gesture-handler scroll view', async () => {
    const tree = await mountRoute(ITEMS);
    const scroll = one(tree.root, 'category_list_inner');
    expect(host(scroll, 'department_route')).toHaveLength(1);
    expect(host(tree.root, 'draggable')).toHaveLength(0);
  });

  test('counters include bought items and completed departments collapse', async () => {
    const tree = await mountRoute(ITEMS);
    expect(headerKeys(tree)).toEqual(['produce', 'dairy', 'bakery']);
    expect(textOf(one(tree.root, 'department_count_produce'))).toBe('1/1 ✓');
    expect(textOf(one(tree.root, 'department_count_dairy'))).toBe('1/2');
    expect(textOf(one(tree.root, 'department_count_bakery'))).toBe('0/1');
    expect(host(tree.root, 'department_done_produce')).toHaveLength(1);
  });

  test('the focus card holds the first department with unbought items, with large rows', async () => {
    const tree = await mountRoute(ITEMS);
    expect(focusTitle(tree)).toBe('עכשיו במחלקה מוצרי חלב וביצים');
    const card = one(tree.root, 'focus_card');
    const rows = card.findAllByType(ShoppingListItem);
    expect(rows.map(r => r.props.item.id)).toEqual([2]);
    expect(rows[0].props.variant).toBe('focus');
    // לא מוצג פעמיים
    expect(
      tree.root
        .findAllByType(ShoppingListItem)
        .filter(r => r.props.item.id === 2),
    ).toHaveLength(1);
  });

  test('checking the last item of the focus moves it to the next department', async () => {
    const tree = await mountRoute(ITEMS);
    updateItem.mockResolvedValue({ ...ITEMS[1], purchased: true });
    await pressCheckInFocus(tree, 2);
    expect(updateItem).toHaveBeenCalledWith(2, { purchased: true });
    expect(focusTitle(tree)).toBe('עכשיו במחלקה מאפים ולחם');
    expect(host(tree.root, 'department_done_dairy')).toHaveLength(1);
    expect(textOf(one(tree.root, 'department_count_dairy'))).toBe('2/2 ✓');
    // הסימון עבר דרך המסך: יש פס ביטול
    expect(tree.root.findByType(UndoBar).props.visible).toBe(true);
    expect(tree.root.findByType(UndoBar).props.message).toBe('סומן כנקנה');
  });

  test('checking the last unbought item shows the done card', async () => {
    const tree = await mountRoute([
      item(1, 'עגבניות', { purchased: true }),
      item(4, 'לחם'),
    ]);
    updateItem.mockResolvedValue({ ...item(4, 'לחם'), purchased: true });
    await pressCheckInFocus(tree, 4);
    expect(host(tree.root, 'focus_card')).toHaveLength(0);
    expect(textOf(one(tree.root, 'focus_card_done'))).toBe('הכל בעגלה 🎉');
  });

  test('the layout order of the list is respected', async () => {
    getListCategories.mockResolvedValue({
      custom: [],
      layout: [
        { key: 'bakery', name: null, icon: null, position: 0 },
        { key: 'produce', name: null, icon: null, position: 1 },
        { key: 'dairy', name: 'מקררים', icon: '🧊', position: 2 },
      ],
    });
    const tree = await mountRoute(ITEMS);
    expect(headerKeys(tree)).toEqual(['bakery', 'produce', 'dairy']);
    expect(focusTitle(tree)).toBe('עכשיו במחלקה מאפים ולחם');
  });

  test('the header ring counts bought out of all items and follows a check', async () => {
    const tree = await mountRoute(ITEMS);
    const ring = () => one(tree.root, 'progress_ring');
    expect(ring().props.accessibilityLabel).toBe('נקנו 2 מתוך 4');
    updateItem.mockResolvedValue({ ...ITEMS[1], purchased: true });
    await pressCheckInFocus(tree, 2);
    expect(ring().props.accessibilityLabel).toBe('נקנו 3 מתוך 4');
  });

  test('the header line counts only the departments with items', async () => {
    const tree = await mountRoute(ITEMS);
    expect(textOf(one(tree.root, 'list_subtitle'))).toContain('3 מחלקות');
  });

  test('the category segment reads לפי מחלקות', async () => {
    const tree = await mountRoute(ITEMS);
    expect(textOf(one(tree.root, 'sort_segment_category'))).toBe('לפי מחלקות');
  });

  test('route rows use the route variant (no category dot)', async () => {
    const tree = await mountRoute(ITEMS);
    const route = one(tree.root, 'department_route');
    const row = route
      .findAllByType(ShoppingListItem)
      .find(r => r.props.item.id === 4);
    expect(row.props.variant).toBe('route');
  });

  test('there is no tip box above the route (the mockup has none)', async () => {
    const tree = await mountRoute(ITEMS);
    expect(tree.root.findAll(n => n.props.children === '💡 טיפ שימושי:')).toHaveLength(0);
  });

  test('bought items stay in the bottom section', async () => {
    const tree = await mountRoute(ITEMS);
    const route = one(tree.root, 'department_route');
    const inRoute = route.findAllByType(ShoppingListItem).map(r => r.props.item.id);
    expect(inRoute.sort()).toEqual([2, 4]);
    expect(host(tree.root, 'restore_all_button').length).toBeGreaterThan(0);
  });
});

describe('manual mode', () => {
  test('keeps the drag list with the new rows, and no route or focus card', async () => {
    getShoppingList.mockResolvedValue(ITEMS);
    const tree = await mount();
    expect(host(tree.root, 'draggable')).toHaveLength(1);
    expect(host(tree.root, 'department_route')).toHaveLength(0);
    expect(host(tree.root, 'focus_card')).toHaveLength(0);
    expect(host(tree.root, 'focus_card_done')).toHaveLength(0);
    expect(global.__dragProps.data.map(r => r.id)).toEqual([2, 4]);
    expect(global.__dragProps.dragHitSlop).toBeDefined();
    const rows = one(tree.root, 'draggable')
      .findAllByType(ShoppingListItem)
      .filter(r => !r.props.item.purchased);
    expect(rows.map(r => r.props.item.id)).toEqual([2, 4]);
    rows.forEach(r => expect(r.props.variant).toBeUndefined());
    expect(typeof rows[0].props.onDrag).toBe('function');
    expect(one(tree.root, 'progress_ring').props.accessibilityLabel).toBe(
      'נקנו 2 מתוך 4',
    );
    // אין תיבת טיפ ריקה מתחת למתג המיון
    expect(tree.root.findAll(n => n.props.children === '💡 טיפ שימושי:')).toHaveLength(0);
    expect(textOf(tree.root)).toContain('מוצרים לקנייה');
  });
});

describe('offline', () => {
  test('checking an item in the focus card shows the offline alert', async () => {
    await saveCache(cacheKeys.items(7), ITEMS);
    await saveCache(cacheKeys.categories(7), { custom: [], layout: [] });
    await AsyncStorage.setItem('@sort_mode_7', 'category');
    getShoppingList.mockRejectedValue(
      Object.assign(new Error('אין חיבור'), { network: true }),
    );
    getListCategories.mockRejectedValue(
      Object.assign(new Error('אין חיבור'), { network: true }),
    );
    const tree = await mount();
    expect(host(tree.root, 'offline_banner').length).toBeGreaterThan(0);
    const check = pressable(one(tree.root, 'focus_card'), 'item_check_2');
    expect(check.props.accessibilityState?.disabled).toBeFalsy();
    await act(async () => check.props.onPress());
    expect(alertSpy).toHaveBeenCalledWith(...BLOCKED);
    expect(updateItem).not.toHaveBeenCalled();
    expect(focusTitle(tree)).toBe('עכשיו במחלקה מוצרי חלב וביצים');
  });
});
