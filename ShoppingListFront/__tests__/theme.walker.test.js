/* global jest, describe, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { View as HeaderBackground } from 'react-native';
import { dark, light } from '../src/theme/palettes';
import MyListsScreen from '../src/screens/MyListsScreen/MyListsScreen';
import ShoppingListScreen from '../src/screens/ShoppingListScreen/ShoppingListScreen';
import SettingsScreen from '../src/screens/SettingsScreen/SettingsScreen';
import LoginScreen from '../src/screens/LoginScreen/LoginScreen';
import UndoBar from '../src/components/UndoBar/UndoBar';
import OfflineBanner from '../src/components/OfflineBanner/OfflineBanner';
import JoinListModal from '../src/components/JoinListModal/JoinListModal';
import MembersModal from '../src/components/MembersModal/MembersModal';
import EditItemModal from '../src/components/EditItemModal/EditItemModal';
import ListActionsMenu from '../src/components/ListActionsMenu/ListActionsMenu';
import ShoppingListItem from '../src/components/ShoppingListItem/ShoppingListItem';
import DepartmentRoute from '../src/components/DepartmentRoute/DepartmentRoute';
import { buildRoute } from '../src/components/DepartmentRoute/buildRoute';
import FocusCard from '../src/components/FocusCard/FocusCard';
import ProgressRing from '../src/components/ProgressRing/ProgressRing';
import EditDepartmentsScreen from '../src/screens/EditDepartmentsScreen/EditDepartmentsScreen';
import EmojiPicker from '../src/components/EmojiPicker/EmojiPicker';
import { resolveCategory } from '../src/services/categories';

// ה-ScrollView של gesture-handler (מצב מחלקות) דורש Reanimated מלא: מוחלף ברכיב
// שמציג את הילדים (הרקע מגיע מהמסך, לא ממנו)
jest.mock('react-native-gesture-handler', () => ({
  ...jest.requireActual('react-native-gesture-handler'),
  ScrollView: ({ children }) =>
    require('react').createElement(require('react-native').View, null, children),
}));
jest.mock('react-native-draggable-flatlist', () => {
  const ReactLib = require('react');
  const { View } = require('react-native');
  // מצב ידני: רשימה נגררת מקוננת בתוך מיכל גלילה (עם המשיכה לריענון)
  const MockNestableScrollContainer = ({ children, ...rest }) => {
    global.__scrollProps = rest;
    return ReactLib.createElement(View, { testID: 'nestable_scroll' }, children);
  };
  return {
    __esModule: true,
    NestableScrollContainer: MockNestableScrollContainer,
    // הרשימה המקוננת זהה למוק של הרשימה הרגילה
    get NestableDraggableFlatList() {
      return this.default;
    },
    default: ({
      data,
      renderItem,
      keyExtractor,
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
            { key: keyExtractor ? keyExtractor(item) : item.id },
            renderItem({ item, drag: () => {}, isActive: false }),
          ),
        ),
        ListFooterComponent,
      ),
  };
});
jest.mock('../src/hooks/useLiveRefresh', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../src/services/api', () => ({
  getShoppingLists: jest.fn(async () => [
    { id: 1, name: 'שלי', owner_id: 1, is_owner: true },
  ]),
  getShoppingList: jest.fn(async () => [
    { id: 1, name: 'חלב', amount: 1, purchased: false, position: 0 },
    { id: 2, name: 'לחם', amount: 1, purchased: true, position: 1 },
  ]),
  getListMembers: jest.fn(async () => [
    { id: 1, username: 'owner_user', is_owner: true },
    { id: 2, username: 'member_user', is_owner: false },
  ]),
  getInviteCode: jest.fn(async () => ({ invite_code: 'ABC123' })),
  resetInviteCode: jest.fn(),
  removeListMember: jest.fn(),
  leaveList: jest.fn(),
  // מחלקה מותאמת ושינויים בפריסה, כדי שמסך עריכת המחלקות יציג את כל סוגי השורות
  getListCategories: jest.fn(async () => ({
    custom: [{ id: 3, name: 'חיות', color: '#7986CB', icon: '🐾' }],
    layout: [
      { key: 'dairy', name: 'מקררים', icon: '🧀', position: 0 },
      { key: 'bakery', name: null, icon: null, position: 1 },
      { key: 'custom:3', name: null, icon: '🐾', position: 2 },
    ],
  })),
}));
jest.mock('../src/services/auth', () => ({
  getCurrentUser: jest.fn(async () => ({ username: 'bob', email: 'b@example.com' })),
  login: jest.fn(),
  register: jest.fn(),
  requestPasswordReset: jest.fn(),
}));

const { act } = ReactTestRenderer;

const rgbOf = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const RGBA = /^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)$/;
const isRgba = c => typeof c === 'string' && RGBA.test(c);
// צבע טקסט שקוף למחצה מורכב מעל הרקע שלו לפני חישוב הניגודיות (M1)
const composite = (fg, bg) => {
  const m = RGBA.exec(fg);
  const a = parseFloat(m[4]);
  const base = rgbOf(bg);
  const rgb = [1, 2, 3].map((k, i) => Math.round(a * m[k] + (1 - a) * base[i]));
  return '#' + rgb.map(v => v.toString(16).padStart(2, '0')).join('');
};
const lum = hex => {
  const c = rgbOf(hex).map(v => v / 255);
  const l = c.map(v => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const isHex = c => typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c);
const up = c => c.toUpperCase();

// זוגות ידועים שנדחו בכוונה (ראו R6-final-review M11): לבן על אדום/ירוק, טקסט מושבת
const ALLOWED = new Set(
  [
    [dark.text.inverse, dark.danger],
    [dark.text.inverse, dark.success],
    [dark.text.disabled, dark.surface],
    [dark.text.disabled, dark.background],
    [dark.text.disabled, dark.raised],
    [dark.text.inverse, dark.warning],
  ].map(([a, b]) => `${up(a)}|${up(b)}`),
);

// רקע של צומת: צבע אטום, או מעבר צבעים (LinearGradient, prop בשם colors) - אז
// הטקסט נבדק מול כל אחת מנקודות המעבר (המקרה הגרוע), כך שטקסט שיושב ישירות על
// הקצה הטורקיז של כרטיס "עכשיו במחלקה" נכשל
const failures = (json, name, base = dark.background) => {
  const out = [];
  // gradient: הרקע הגיע ממעבר צבעים. הזוגות המותרים (ALLOWED) חלים רק על רקע אטום
  const visit = (n, bgs, gradient) => {
    if (!n || typeof n === 'string') return;
    const style = StyleSheet.flatten(n.props && n.props.style) || {};
    const stops = n.props && n.props.colors;
    let ownBgs = bgs;
    let ownGradient = gradient;
    if (isHex(style.backgroundColor)) {
      ownBgs = [style.backgroundColor];
      ownGradient = false;
    } else if (Array.isArray(stops) && stops.length && stops.every(isHex)) {
      ownBgs = stops;
      ownGradient = true;
    }
    if (n.type === 'Text' && (isHex(style.color) || isRgba(style.color))) {
      ownBgs.forEach(bg => {
        const fg = isRgba(style.color) ? composite(style.color, bg) : style.color;
        const r = ratio(fg, bg);
        const allowed =
          !ownGradient && ALLOWED.has(`${up(style.color)}|${up(bg)}`);
        if (r < 4.5 && !allowed) {
          out.push(`${name}: ${style.color} on ${bg} = ${r.toFixed(2)}`);
        }
      });
    }
    (n.children || []).forEach(c => visit(c, ownBgs, ownGradient));
  };
  [].concat(json).forEach(n => visit(n, [base], false));
  return out;
};

// בדיקת השומר עצמו: טקסט לבן ישירות על מעבר כחול-טורקיז נכשל
test('the walker treats a gradient as its worst stop', () => {
  const json = {
    type: 'View',
    props: { colors: [dark.primary, dark.secondary] },
    children: [
      { type: 'Text', props: { style: { color: dark.text.inverse } }, children: ['x'] },
    ],
  };
  expect(failures(json, 'probe')).toEqual([
    `probe: ${dark.text.inverse} on ${dark.secondary} = ${ratio(
      dark.text.inverse,
      dark.secondary,
    ).toFixed(2)}`,
  ]);
});

// M1: טקסט שקוף למחצה מורכב מעל הרקע - לבן ב-0.75 על הכחול נכשל
test('the walker composites rgba text over its background', () => {
  const json = {
    type: 'View',
    props: { style: { backgroundColor: light.primary } },
    children: [
      {
        type: 'Text',
        props: { style: { color: 'rgba(255, 255, 255, 0.75)' } },
        children: ['x'],
      },
    ],
  };
  expect(failures(json, 'probe', light.background)).toHaveLength(1);
});

const renderDark = async (element, mode = 'dark') => {
  await AsyncStorage.setItem('@theme_mode', mode);
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });
  await act(async () => {});
  return tree;
};

const nav = { navigate: jest.fn(), setOptions: jest.fn(), goBack: jest.fn() };

// מסלול מחלקות עם מחלקה שהושלמה, כרטיס "עכשיו במחלקה" ושורות רגילות
const routeItems = [
  { id: 1, name: 'עגבניות', amount: 1, purchased: true },
  { id: 2, name: 'חלב', amount: 2, unit: 'ליטר', note: '3%', purchased: false },
  { id: 3, name: 'ביצים', amount: 1, purchased: true },
  { id: 4, name: 'לחם', amount: 1, purchased: false, added_by: 'dana' },
  { id: 5, name: 'שמפו', amount: 1, purchased: false },
];
const routeRow = (row, { variant } = {}) => (
  <ShoppingListItem
    item={row}
    variant={variant}
    onTogglePurchased={jest.fn()}
    onEdit={jest.fn()}
    onDelete={jest.fn()}
    onUpdateAmount={jest.fn()}
    showAddedBy
    currentUsername="bob"
  />
);
const routePlan = items =>
  buildRoute(items.map(i => ({ item: i, cat: resolveCategory(i) })));
const routeCases = {
  DepartmentRoute: (
    <DepartmentRoute plan={routePlan(routeItems)} renderItem={routeRow} />
  ),
  DepartmentRouteAllDone: (
    <DepartmentRoute
      plan={routePlan(routeItems.map(i => ({ ...i, purchased: true })))}
      renderItem={routeRow}
    />
  ),
  FocusCardDone: <FocusCard department={null} />,
};
// הטבעת יושבת על רקע הכותרת (הצבע הראשי בשתי הערכות)
const ringCase = palette => (
  <HeaderBackground style={{ backgroundColor: palette.primary }}>
    <ProgressRing done={3} total={12} />
  </HeaderBackground>
);
const cases = {
  MyLists: <MyListsScreen navigation={nav} />,
  ShoppingList: (
    <ShoppingListScreen
      route={{ params: { listId: 1, listName: 'רשימה' } }}
      navigation={nav}
    />
  ),
  Settings: <SettingsScreen navigation={nav} onLogout={jest.fn()} />,
  Login: <LoginScreen onLoginSuccess={jest.fn()} />,
  UndoBar: <UndoBar visible message="המוצר נמחק" onUndo={jest.fn()} />,
  OfflineBanner: <OfflineBanner visible />,
  SlowBanner: <OfflineBanner visible slow />,
  JoinListModal: (
    <JoinListModal visible onClose={jest.fn()} onJoined={jest.fn()} />
  ),
  MembersModal: (
    <MembersModal visible listId={1} listName="שלי" isOwner onClose={jest.fn()} onLeft={jest.fn()} />
  ),
  EditItemModal: (
    <EditItemModal
      visible
      item={{ id: 1, name: 'חלב', unit: 'ליטר', note: 'דל שומן' }}
      onSave={jest.fn()}
      onClose={jest.fn()}
    />
  ),
  ...routeCases,
  ProgressRing: ringCase(dark),
  EditDepartments: (
    <EditDepartmentsScreen
      route={{ params: { listId: 1, listName: 'שלי' } }}
      navigation={nav}
    />
  ),
  EmojiPicker: (
    <EmojiPicker
      visible
      selected="🥦"
      onSelect={jest.fn()}
      onReset={jest.fn()}
      onClose={jest.fn()}
    />
  ),
  ListActionsMenu: (
    <ListActionsMenu
      visible
      list={{ id: 1, name: 'שלי', is_owner: true }}
      onClose={jest.fn()}
      onRename={jest.fn()}
      onDuplicate={jest.fn()}
      onShareText={jest.fn()}
      onDelete={jest.fn()}
    />
  ),
};

describe('dark mode contrast walker', () => {
  Object.entries(cases).forEach(([name, el]) => {
    test(`${name}: every text meets 4.5:1 on its background`, async () => {
      const tree = await renderDark(el);
      try {
        const json = tree.toJSON();
        expect(json).not.toBeNull();
        if (name === 'ShoppingList') expect(JSON.stringify(json)).toContain('חלב');
        expect(failures(json, name)).toEqual([]);
      } finally {
        // פירוק בתוך act כדי שאנימציות של השורות לא ימשיכו לרוץ אחרי הבדיקה
        await act(async () => tree.unmount());
      }
    });
  });
});

// גם בערכה הבהירה: הטקסט של המסלול, הכרטיס והטבעת עומד ב-AA
describe('light mode contrast walker: route, focus card and ring', () => {
  const lightCases = {
    ...routeCases,
    ProgressRing: ringCase(light),
    // המסכים עם כותרת המעבר על הרקע הבהיר החדש (#F4F7FB)
    ShoppingList: cases.ShoppingList,
    MyLists: cases.MyLists,
    Settings: cases.Settings,
    EditDepartments: cases.EditDepartments,
    EmojiPicker: cases.EmojiPicker,
    // המסכים והחלונות המעוצבים מחדש (גל 9): גם בערכה הבהירה
    Login: cases.Login,
    UndoBar: cases.UndoBar,
    OfflineBanner: cases.OfflineBanner,
    SlowBanner: cases.SlowBanner,
    JoinListModal: cases.JoinListModal,
    ListActionsMenu: cases.ListActionsMenu,
    MembersModal: cases.MembersModal,
    EditItemModal: cases.EditItemModal,
  };
  Object.entries(lightCases).forEach(([name, el]) => {
    test(`${name}: every text meets 4.5:1 on its background`, async () => {
      const tree = await renderDark(el, 'light');
      try {
        expect(failures(tree.toJSON(), name, light.background)).toEqual([]);
      } finally {
        await act(async () => tree.unmount());
      }
    });
  });
});

// מסך עריכת המחלקות במצבי העריכה: שינוי שם עם בחירת אייקון, והוספת מחלקה
describe('edit departments contrast walker: rename, picker and add', () => {
  const pressById = async (tree, id) => {
    const node = tree.root.findAll(
      n => n.props.testID === id && typeof n.props.onPress === 'function',
    )[0];
    await act(async () => node.props.onPress());
  };
  const modes = [
    ['dark', dark.background],
    ['light', light.background],
  ];
  modes.forEach(([mode, base]) => {
    test(`${mode}: every text meets 4.5:1 while renaming, picking and adding`, async () => {
      const tree = await renderDark(cases.EditDepartments, mode);
      try {
        await pressById(tree, 'department_edit_dairy');
        expect(JSON.stringify(tree.toJSON())).toContain('department_name_input');
        expect(failures(tree.toJSON(), `rename ${mode}`, base)).toEqual([]);
        await pressById(tree, 'department_icon_dairy');
        expect(JSON.stringify(tree.toJSON())).toContain('emoji_picker');
        expect(failures(tree.toJSON(), `picker ${mode}`, base)).toEqual([]);
        await pressById(tree, 'emoji_close');
        await pressById(tree, 'add_department_button');
        const json = tree.toJSON();
        expect(JSON.stringify(json)).toContain('new_department_input');
        expect(failures(json, `add ${mode}`, base)).toEqual([]);
      } finally {
        await act(async () => tree.unmount());
      }
    });
  });

  // כפתור ✎ ליד מתג המיון, במצב "לפי מחלקות"
  modes.forEach(([mode, base]) => {
    test(`${mode}: the list screen by departments, with the ✎ button`, async () => {
      await AsyncStorage.setItem('@sort_mode_1', 'category');
      const tree = await renderDark(cases.ShoppingList, mode);
      try {
        const json = tree.toJSON();
        expect(JSON.stringify(json)).toContain('edit_departments_button');
        expect(failures(json, `list by departments ${mode}`, base)).toEqual([]);
      } finally {
        await act(async () => tree.unmount());
        await AsyncStorage.removeItem('@sort_mode_1');
      }
    });
  });
});
