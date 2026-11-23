/* global jest, describe, beforeEach, afterEach, test, expect */
import React from 'react';
import fs from 'fs';
import path from 'path';
import ReactTestRenderer from 'react-test-renderer';
import { Alert, AccessibilityInfo, Pressable, TouchableOpacity } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import LoginScreen from '../src/screens/LoginScreen/LoginScreen';
import MyListsScreen from '../src/screens/MyListsScreen/MyListsScreen';
import SettingsScreen from '../src/screens/SettingsScreen/SettingsScreen';
import ShoppingListScreen from '../src/screens/ShoppingListScreen/ShoppingListScreen';
import AddItemInput from '../src/components/AddItemInput/AddItemInput';
import ListActionsMenu from '../src/components/ListActionsMenu/ListActionsMenu';
import MembersModal from '../src/components/MembersModal/MembersModal';
import JoinListModal from '../src/components/JoinListModal/JoinListModal';
import EditItemModal from '../src/components/EditItemModal/EditItemModal';
import PurchasedItemsSection from '../src/components/PurchasedItemsSection/PurchasedItemsSection';
import OfflineBanner from '../src/components/OfflineBanner/OfflineBanner';
import UndoBar from '../src/components/UndoBar/UndoBar';
import ShoppingListItem from '../src/components/ShoppingListItem/ShoppingListItem';
import {
  getSuggestions,
  getShoppingLists,
  getShoppingList,
} from '../src/services/api';

jest.mock('../src/services/api', () => ({
  getSuggestions: jest.fn(),
  getShoppingLists: jest.fn(),
  createShoppingList: jest.fn(),
  updateShoppingList: jest.fn(),
  deleteShoppingList: jest.fn(),
  joinListByCode: jest.fn(),
  duplicateList: jest.fn(),
  getShoppingList: jest.fn(),
  addItem: jest.fn(),
  updateItem: jest.fn(),
  deleteItem: jest.fn(),
  reorderItems: jest.fn(),
  getListMembers: jest.fn(() =>
    Promise.resolve([
      { id: 1, username: 'owner_user', is_owner: true },
      { id: 2, username: 'member_user', is_owner: false },
    ]),
  ),
  getInviteCode: jest.fn(),
  resetInviteCode: jest.fn(),
  removeListMember: jest.fn(),
  leaveList: jest.fn(),
  restorePurchased: jest.fn(),
  clearPurchased: jest.fn(),
  getListCategories: jest.fn(() => Promise.resolve([])),
  createListCategory: jest.fn(),
  deleteListCategory: jest.fn(),
}));

jest.mock('../src/services/auth', () => ({
  login: jest.fn(),
  register: jest.fn(),
  requestPasswordReset: jest.fn(),
  logout: jest.fn(),
  getCurrentUser: jest.fn(async () => ({
    username: 'bob',
    email: 'bob@example.com',
  })),
  changePassword: jest.fn(),
  deleteAccount: jest.fn(),
}));

jest.mock('../src/hooks/useLiveRefresh', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('react-native-draggable-flatlist', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  const MockDraggableFlatList = ({
    data,
    renderItem,
    ListHeaderComponent,
    ListFooterComponent,
  }) =>
    ReactLib.createElement(
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

const { act } = ReactTestRenderer;
const trees = [];
const render = async element => {
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(element);
  });
  trees.push(tree);
  return tree;
};

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation(() => {});
});
afterEach(async () => {
  await act(async () => {
    trees.splice(0).forEach(t => {
      try {
        t.unmount();
      } catch (e) {
        // כבר נותק
      }
    });
  });
  jest.restoreAllMocks();
});

const byTestId = (tree, id) =>
  tree.root.findAll(n => n.props.testID === id && n.props.onPress)[0] ||
  tree.root.findAll(n => n.props.testID === id)[0];

const walkSources = dir =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkSources(full);
    return /\.js$/.test(entry.name) ? [full] : [];
  });

describe('source scan', () => {
  const root = path.join(__dirname, '..');
  const files = [
    path.join(root, 'App.js'),
    ...walkSources(path.join(root, 'src')),
  ];

  test('no snake_case English accessibilityLabel remains', () => {
    const offenders = [];
    files.forEach(file => {
      const text = fs.readFileSync(file, 'utf8');
      const re = /accessibilityLabel=(?:"([^"]*)"|\{`([^`]*)`\})/g;
      let m;
      while ((m = re.exec(text))) {
        const value = m[1] !== undefined ? m[1] : m[2];
        if (/^[a-z0-9_]+$/.test(value) || /^[a-z0-9_]+_\$\{/.test(value)) {
          offenders.push(`${path.basename(file)}: ${value}`);
        }
      }
      if (/accessibilityLabel=\{testID\}/.test(text)) {
        offenders.push(`${path.basename(file)}: {testID}`);
      }
    });
    expect(offenders).toEqual([]);
  });
});

describe('labels, roles and states', () => {
  test('login button', async () => {
    const tree = await render(<LoginScreen onLoginSuccess={jest.fn()} />);
    const btn = byTestId(tree, 'login_button');
    expect(btn.props.accessibilityLabel).toBe('כפתור התחברות');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  test('add button, input and chips', async () => {
    getSuggestions.mockResolvedValue(['חלב']);
    jest.useFakeTimers();
    let tree;
    try {
      tree = await render(<AddItemInput onAdd={jest.fn()} listId={1} />);
      await act(async () =>
        byTestId(tree, 'add_item_input').props.onChangeText('ח'),
      );
      await act(async () => {
        jest.advanceTimersByTime(300);
      });
    } finally {
      jest.useRealTimers();
    }
    const add = byTestId(tree, 'add_item_button');
    expect(add.props.accessibilityLabel).toBe('הוספת מוצר');
    expect(add.props.accessibilityRole).toBe('button');
    expect(byTestId(tree, 'suggestion_chip_0').props.accessibilityLabel).toBe(
      'הוסף חלב',
    );
  });

  test('add button hints it is unavailable when not editable', async () => {
    const off = await render(
      <AddItemInput onAdd={jest.fn()} listId={1} editable={false} />,
    );
    expect(byTestId(off, 'add_item_button').props.accessibilityHint).toBe(
      'לא זמין ללא חיבור לאינטרנט',
    );
    const on = await render(<AddItemInput onAdd={jest.fn()} listId={1} />);
    expect(
      byTestId(on, 'add_item_button').props.accessibilityHint,
    ).toBeUndefined();
  });

  // לוחצים דרך רכיב ה-host (כמו המערכת), לא דרך props.onPress -
  // accessibilityState.disabled היה מנטרל את הלחיצה בלי שהבדיקות ירגישו
  test('add button stays pressable through the host element when not editable', async () => {
    const onAdd = jest.fn();
    const tree = await render(
      <AddItemInput onAdd={onAdd} listId={1} editable={false} />,
    );
    const host = tree.root.find(
      n => typeof n.type === 'string' && n.props.testID === 'add_item_button',
    );
    expect(host.props.onStartShouldSetResponder()).toBe(true);
    await act(async () => host.props.onClick({ stopPropagation: () => {} }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  test('list menu button and card', async () => {
    getShoppingLists.mockResolvedValue([
      { id: 1, name: 'שלי', owner_id: 1, is_owner: true },
    ]);
    const tree = await render(
      <MyListsScreen navigation={{ navigate: jest.fn() }} />,
    );
    expect(byTestId(tree, 'list_menu_1').props.accessibilityLabel).toBe(
      'פעולות לרשימה שלי',
    );
    expect(byTestId(tree, 'list_card').props.accessibilityLabel).toBe(
      'רשימה שלי',
    );
  });

  test('members button', async () => {
    getShoppingList.mockResolvedValue([]);
    const tree = await render(
      <GestureHandlerRootView>
        <ShoppingListScreen
          route={{ params: { listId: 7, listName: 'רשימה' } }}
          navigation={{ goBack: jest.fn() }}
        />
      </GestureHandlerRootView>,
    );
    const btn = byTestId(tree, 'members_button');
    expect(btn.props.accessibilityLabel).toBe('משתתפים ברשימה');
    expect(btn.props.accessibilityRole).toBe('button');
  });

  test('member remove button names the member', async () => {
    const tree = await render(
      <MembersModal
        visible
        listId={7}
        listName="סופר"
        isOwner
        onClose={jest.fn()}
        onLeft={jest.fn()}
      />,
    );
    expect(byTestId(tree, 'remove_member_2').props.accessibilityLabel).toBe(
      'הסר את member_user',
    );
  });

  test('list actions menu items have Hebrew labels', async () => {
    const tree = await render(
      <ListActionsMenu
        visible
        list={{ id: 1, name: 'שלי', is_owner: true }}
        onClose={jest.fn()}
        onRename={jest.fn()}
        onDuplicate={jest.fn()}
        onShareText={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    ['menu_rename', 'menu_duplicate', 'menu_share_text', 'menu_delete'].forEach(
      id => {
        expect(byTestId(tree, id).props.accessibilityLabel).toMatch(
          /[֐-׿]/,
        );
      },
    );
  });

  test('item toggle is a checkbox that reflects purchased', async () => {
    const make = purchased => (
      <ShoppingListItem
        item={{ id: 1, name: 'חלב', amount: 1, purchased }}
        onTogglePurchased={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onUpdateAmount={jest.fn()}
      />
    );
    const open = await render(make(false));
    const done = await render(make(true));
    const box = t =>
      t.root.findAll(n => n.props.accessibilityRole === 'checkbox')[0];
    expect(box(open).props.accessibilityState.checked).toBe(false);
    expect(box(done).props.accessibilityState.checked).toBe(true);
    expect(box(open).props.accessibilityLabel).toBe('חלב');
  });

  test('checkbox label carries name, note and adder', async () => {
    const tree = await render(
      <ShoppingListItem
        item={{ id: 1, name: 'חלב', note: '3%', added_by: 'dana', amount: 1, purchased: false }}
        showAddedBy
        currentUsername="bob"
        onTogglePurchased={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onUpdateAmount={jest.fn()}
      />,
    );
    const box = tree.root.findAll(n => n.props.accessibilityRole === 'checkbox')[0];
    expect(box.props.accessibilityLabel).toBe('חלב, 3%, נוסף ע״י dana');
  });

  test('the check circle toggles purchased, even when disabled', async () => {
    const onToggle = jest.fn();
    const tree = await render(
      <ShoppingListItem
        item={{ id: 1, name: 'חלב', amount: 1, purchased: false }}
        onTogglePurchased={onToggle}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onUpdateAmount={jest.fn()}
        disabled
      />,
    );
    const box = tree.root.findAll(n => n.props.accessibilityRole === 'checkbox')[0];
    expect(box.props.accessibilityState.disabled).toBeUndefined();
    await act(async () => box.props.onPress());
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test('register mode relabels the submit button', async () => {
    const tree = await render(<LoginScreen onLoginSuccess={jest.fn()} />);
    await act(async () => byTestId(tree, 'switch_mode_button').props.onPress());
    expect(byTestId(tree, 'login_button').props.accessibilityLabel).toBe('כפתור הרשמה');
  });

  test('item controls are disabled for screen readers when offline', async () => {
    const tree = await render(
      <ShoppingListItem
        item={{ id: 1, name: 'חלב', amount: 1, purchased: false }}
        onTogglePurchased={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        onUpdateAmount={jest.fn()}
        onDrag={jest.fn()}
        disabled
      />,
    );
    const labelled = tree.root.findAll(
      n => n.props.accessibilityLabel && n.props.accessibilityRole === 'button',
    );
    const names = labelled.map(n => n.props.accessibilityLabel);
    expect(names).toEqual(
      expect.arrayContaining(['הפחת כמות', 'הוסף כמות', 'גרור לסידור מחדש']),
    );
    ['הפחת כמות', 'הוסף כמות'].forEach(name => {
      const n = labelled.find(x => x.props.accessibilityLabel === name);
      expect(n.props.accessibilityState.disabled).toBe(true);
    });
  });

  test('offline banner is an alert live region', async () => {
    const tree = await render(<OfflineBanner visible />);
    expect(AccessibilityInfo.announceForAccessibility).toHaveBeenCalledTimes(1);
    const banner = byTestId(tree, 'offline_banner');
    expect(banner.props.accessibilityRole).toBe('alert');
    expect(banner.props.accessibilityLiveRegion).toBe('polite');
  });
});

// כל רכיב לחיץ במסכים וברכיבים חייב תפקיד נגישות
describe('every touchable has an accessibilityRole', () => {
  const missing = tree =>
    tree.root
      .findAll(n => n.type === TouchableOpacity || n.type === Pressable)
      .filter(n => !n.props.accessibilityRole)
      .map(n => n.props.testID || n.props.accessibilityLabel || '(unnamed)');

  test('LoginScreen (login, register and forgot form)', async () => {
    const tree = await render(<LoginScreen onLoginSuccess={jest.fn()} />);
    expect(missing(tree)).toEqual([]);
    await act(async () =>
      byTestId(tree, 'forgot_password_link').props.onPress(),
    );
    expect(missing(tree)).toEqual([]);
  });

  test('MyListsScreen with join modal', async () => {
    getShoppingLists.mockResolvedValue([
      { id: 1, name: 'שלי', owner_id: 1, is_owner: true },
      { id: 2, name: 'של אמא', owner_id: 2, is_owner: false },
    ]);
    const tree = await render(
      <MyListsScreen navigation={{ navigate: jest.fn() }} />,
    );
    expect(missing(tree)).toEqual([]);
    await act(async () => byTestId(tree, 'join_list_link').props.onPress());
    expect(missing(tree)).toEqual([]);
  });

  test('SettingsScreen', async () => {
    const tree = await render(
      <SettingsScreen
        navigation={{ goBack: jest.fn() }}
        onLogout={jest.fn()}
      />,
    );
    expect(missing(tree)).toEqual([]);
    await act(async () =>
      byTestId(tree, 'delete_account_button').props.onPress(),
    );
    expect(missing(tree)).toEqual([]);
  });

  test('ShoppingListScreen with items', async () => {
    getShoppingList.mockResolvedValue([
      { id: 1, name: 'חלב', amount: 1, purchased: false, position: 0 },
      { id: 2, name: 'לחם', amount: 1, purchased: true, position: 1 },
    ]);
    const tree = await render(
      <GestureHandlerRootView>
        <ShoppingListScreen
          route={{ params: { listId: 7, listName: 'רשימה' } }}
          navigation={{ goBack: jest.fn() }}
        />
      </GestureHandlerRootView>,
    );
    expect(missing(tree)).toEqual([]);
  });

  test('modals and sections', async () => {
    const noop = jest.fn();
    const elements = [
      <ListActionsMenu
        key="a"
        visible
        list={{ id: 1, name: 'שלי', is_owner: true }}
        onClose={noop}
        onRename={noop}
        onDuplicate={noop}
        onShareText={noop}
        onDelete={noop}
      />,
      <MembersModal
        key="b"
        visible
        listId={7}
        listName="סופר"
        isOwner
        onClose={noop}
        onLeft={noop}
      />,
      <MembersModal
        key="b2"
        visible
        listId={7}
        listName="סופר"
        isOwner={false}
        onClose={noop}
        onLeft={noop}
      />,
      <JoinListModal key="c" visible onClose={noop} onJoined={noop} />,
      <EditItemModal
        key="d"
        visible
        item={{ id: 1, name: 'חלב' }}
        onSave={noop}
        onClose={noop}
      />,
      <PurchasedItemsSection
        key="e"
        items={[{ id: 1, name: 'חלב', amount: 1, purchased: true }]}
        onTogglePurchased={noop}
        onEdit={noop}
        onDelete={noop}
        onUpdateAmount={noop}
        onRestoreAll={noop}
        onClearAll={noop}
      />,
      <UndoBar key="f" visible message="נמחק" onUndo={noop} />,
      <ShoppingListItem
        key="g"
        item={{ id: 1, name: 'חלב', amount: 1, purchased: false }}
        onTogglePurchased={noop}
        onEdit={noop}
        onDelete={noop}
        onUpdateAmount={noop}
        onDrag={noop}
      />,
    ];
    for (const el of elements) {
      const tree = await render(el);
      expect(missing(tree)).toEqual([]);
    }
  });
});
