/* global jest, describe, test, expect */
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import { StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeProvider } from '../src/theme/ThemeContext';
import { dark, light } from '../src/theme/palettes';
import { SHEET_RADIUS, CHIP_RADIUS } from '../src/theme/sheetStyles';
import MyListsScreen from '../src/screens/MyListsScreen/MyListsScreen';
import LoginScreen from '../src/screens/LoginScreen/LoginScreen';
import UndoBar from '../src/components/UndoBar/UndoBar';
import OfflineBanner from '../src/components/OfflineBanner/OfflineBanner';
import JoinListModal from '../src/components/JoinListModal/JoinListModal';
import MembersModal from '../src/components/MembersModal/MembersModal';
import EditItemModal from '../src/components/EditItemModal/EditItemModal';
import ListActionsMenu from '../src/components/ListActionsMenu/ListActionsMenu';
import AddItemInput from '../src/components/AddItemInput/AddItemInput';
import EmojiPicker from '../src/components/EmojiPicker/EmojiPicker';
import { getSuggestions } from '../src/services/api';

jest.mock('../src/hooks/useLiveRefresh', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('../src/services/api', () => ({
  getShoppingLists: jest.fn(async () => [
    { id: 1, name: 'שלי', owner_id: 1, is_owner: true },
    { id: 2, name: 'משפחה', owner_id: 2, is_owner: false },
  ]),
  getListMembers: jest.fn(async () => []),
  getSuggestions: jest.fn(async () => ['חלב']),
  getInviteCode: jest.fn(),
  resetInviteCode: jest.fn(),
  removeListMember: jest.fn(),
  leaveList: jest.fn(),
}));

const { act } = ReactTestRenderer;
const nav = { navigate: jest.fn() };

const render = async (element, mode) => {
  await AsyncStorage.setItem('@theme_mode', mode);
  let tree;
  await act(async () => {
    tree = ReactTestRenderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });
  await act(async () => {});
  return tree;
};
const flat = n => StyleSheet.flatten(n.props.style) || {};
const up = (n, pred) => {
  let c = n.parent;
  while (c && !pred(flat(c))) c = c.parent;
  return c;
};
const byId = (tree, id) => tree.root.findAll(n => n.props.testID === id)[0];

const sheets = {
  JoinListModal: <JoinListModal visible onClose={jest.fn()} onJoined={jest.fn()} />,
  MembersModal: (
    <MembersModal visible listId={1} listName="שלי" isOwner onClose={jest.fn()} onLeft={jest.fn()} />
  ),
  EditItemModal: (
    <EditItemModal visible item={{ id: 1, name: 'חלב' }} onSave={jest.fn()} onClose={jest.fn()} />
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
  EmojiPicker: (
    <EmojiPicker
      visible
      selected="🥦"
      onSelect={jest.fn()}
      onReset={jest.fn()}
      onClose={jest.fn()}
    />
  ),
};

const themes = { light, dark };

describe.each(Object.keys(themes))('restyle in %s mode', mode => {
  const palette = themes[mode];

  Object.entries(sheets).forEach(([name, el]) => {
    test(`${name} is a bottom sheet with the sheet background and a grab handle`, async () => {
      const tree = await render(el, mode);
      const handle = byId(tree, 'sheet_handle');
      expect(handle).toBeTruthy();
      expect(flat(handle).backgroundColor).toBe(palette.border);
      const sheet = handle.parent;
      expect(flat(sheet).backgroundColor).toBe(palette.sheet);
      expect(flat(sheet).borderTopLeftRadius).toBe(SHEET_RADIUS);
      expect(flat(sheet).borderTopRightRadius).toBe(SHEET_RADIUS);
      expect(flat(sheet).borderBottomLeftRadius).toBeUndefined();
      expect(up(sheet, st => st.justifyContent === 'flex-end')).toBeTruthy();
      await act(async () => tree.unmount());
    });
  });

  test('Login has the header gradient band behind the logo and soft inputs', async () => {
    const tree = await render(<LoginScreen onLoginSuccess={jest.fn()} />, mode);
    const band = byId(tree, 'login_header_gradient');
    expect(band.props.colors).toEqual(palette.headerGradient);
    expect(flat(band).borderBottomLeftRadius).toBe(32);
    expect(byId(tree, 'login_logo')).toBeTruthy();
    await act(async () => tree.unmount());
  });

  test('My Lists cards are floating: soft shadow, no border, cart icon, badge', async () => {
    const tree = await render(<MyListsScreen navigation={nav} />, mode);
    expect(byId(tree, 'header_gradient').props.colors).toEqual(palette.headerGradient);
    const card = byId(tree, 'list_card').parent;
    const style = flat(card);
    expect(style.backgroundColor).toBe(palette.surface);
    expect(style.borderWidth).toBeUndefined();
    expect(style.shadowOpacity).toBeGreaterThan(0);
    expect(byId(tree, 'shared_badge_2')).toBeTruthy();
    expect(tree.root.findAll(n => n.props.name === 'cart-outline').length).toBeGreaterThan(0);
    await act(async () => tree.unmount());
  });

  test('UndoBar and OfflineBanner are rounded floating pills', async () => {
    const tree = await render(
      <>
        <UndoBar visible message="נמחק" onUndo={jest.fn()} />
        <OfflineBanner visible />
      </>,
      mode,
    );
    expect(flat(byId(tree, 'undo_bar')).backgroundColor).toBe(palette.snackbar);
    expect(flat(byId(tree, 'undo_bar')).borderRadius).toBe(20);
    expect(flat(byId(tree, 'offline_banner')).borderRadius).toBe(20);
    await act(async () => tree.unmount());
  });

  test('suggestion chips and edit-modal chips share the pill chip style', async () => {
    getSuggestions.mockResolvedValue(['חלב']);
    const add = await render(<AddItemInput onAdd={jest.fn()} listId={1} />, mode);
    jest.useFakeTimers();
    await act(async () => {
      byId(add, 'add_item_input').props.onChangeText('ח');
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    jest.useRealTimers();
    const suggestion = flat(byId(add, 'suggestion_chip_0'));
    expect(suggestion.borderRadius).toBe(CHIP_RADIUS);
    expect(suggestion.backgroundColor).toBe(palette.surface);
    await act(async () => add.unmount());

    const edit = await render(sheets.EditItemModal, mode);
    const unitChip = edit.root.findAll(
      n => n.props.accessibilityRole && flat(n).borderRadius === CHIP_RADIUS,
    )[0];
    expect(unitChip).toBeTruthy();
    expect(flat(unitChip).paddingHorizontal).toBe(suggestion.paddingHorizontal);
    expect(flat(unitChip).paddingVertical).toBe(suggestion.paddingVertical);
    await act(async () => edit.unmount());
  });
});

describe('M1: header texts meet AA over the translucent white', () => {
  const alpha = c => parseFloat(/,\s*([\d.]+)\)$/.exec(c)[1]);
  const lum = rgb => {
    const l = rgb.map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
  };
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  [light, dark].forEach(p => {
    ['onPrimaryMuted', 'onPrimarySoft'].forEach(key => {
      p.headerGradient.forEach(stop => {
        test(`${key} on ${stop}`, () => {
          const a = alpha(p[key]);
          const bg = hex(stop);
          const fg = bg.map(v => a * 255 + (1 - a) * v);
          const [x, y] = [lum(fg), lum(bg)].sort((m, n) => n - m);
          expect((x + 0.05) / (y + 0.05)).toBeGreaterThanOrEqual(4.5);
        });
      });
    });
  });
});
